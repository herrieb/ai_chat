import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type { Server as HttpServer } from 'node:http';
import {
  botErrorEventSchema,
  botRetryPayloadSchema,
  joinRoomPayloadSchema,
  sendMessagePayloadSchema,
  type BotErrorCategory,
  type BotErrorEvent,
  type Participant,
  type RoomState,
  type ChatMessage
} from 'shared';
import { Orchestrator } from 'ai-orchestrator';

import { MemoryStore } from './memory-store.js';
import { RoomStore } from './store.js';

function makeHumanMessage(socketId: string, displayName: string, roomId: string, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    roomId,
    participantId: socketId,
    displayName,
    content,
    createdAt: new Date().toISOString()
  };
}

function classifyBotError(error: unknown): BotErrorCategory {
  if (error instanceof Error && error.message.includes('OLLAMA_URL')) {
    return 'ai_unavailable';
  }

  return 'ai_response_failed';
}

function createBotErrorEvent(error: unknown): BotErrorEvent {
  const category = classifyBotError(error);

  const message =
    category === 'ai_unavailable'
      ? 'Your AI could not reach Ollama. Check that Ollama is running and reachable.'
      : 'Your AI could not generate a reply right now. Please try again.';

  return botErrorEventSchema.parse({
    id: crypto.randomUUID(),
    category,
    severity: 'error',
    message,
    retryable: true,
    timestamp: new Date().toISOString()
  });
}

interface FailedBotAttempt {
  bot: Participant;
  roomId: string;
  message: ChatMessage;
}

function toPublicParticipant(participant: Participant): Participant {
  return {
    id: participant.id,
    displayName: participant.displayName,
    kind: participant.kind,
    presence: participant.presence
  };
}

function toPublicRoomState(room: RoomState): RoomState {
  return {
    roomId: room.roomId,
    participants: room.participants.map(toPublicParticipant),
    messages: room.messages
  };
}

export function attachWebSockets(
  app: FastifyInstance,
  server: HttpServer,
  store: RoomStore,
  memoryStore: MemoryStore
): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: { origin: true }
  });
  const orchestrator = Orchestrator.createDefault();

  io.on('connection', (socket) => {
    let lastFailedAttempt: FailedBotAttempt | null = null;

    async function runBotReply(args: FailedBotAttempt): Promise<void> {
      const memories = await memoryStore.getRecentMemories(args.bot.botProfile?.memoryKey ?? args.bot.id);

      const replyPlan = await orchestrator.createReplyPlan({
        bot: args.bot,
        incomingMessage: args.message,
        roomId: args.roomId,
        memories
      }).catch((error: unknown) => {
        app.log.error({ error }, 'Bot reply generation failed.');
        lastFailedAttempt = args;
        socket.emit('bot:error', createBotErrorEvent(error));
        return null;
      });

      if (!replyPlan) {
        return;
      }

      lastFailedAttempt = null;

      if (args.bot.botProfile) {
        await memoryStore.appendMemories({
          botId: args.bot.id,
          memoryKey: args.bot.botProfile.memoryKey,
          roomId: args.roomId,
          sourceMessageId: args.message.id,
          drafts: replyPlan.newMemories
        });
      }

      setTimeout(() => {
        const nextRoom = store.addMessage(replyPlan.message);
        io.to(args.roomId).emit('room:state', toPublicRoomState(nextRoom));
      }, replyPlan.delayMs);
    }

    socket.on('room:join', (input) => {
      const payload = joinRoomPayloadSchema.parse(input);
      const room = store.joinRoom(socket.id, payload);
      socket.join(room.roomId);
      io.to(room.roomId).emit('room:state', toPublicRoomState(room));
    });

    socket.on('message:send', async (input) => {
      const payload = sendMessagePayloadSchema.parse(input);
      const author = store.getParticipant(payload.roomId, socket.id);
      if (!author) {
        return;
      }

      const message = makeHumanMessage(socket.id, author.displayName, payload.roomId, payload.content);
      const room = store.addMessage(message);
      io.to(payload.roomId).emit('room:state', toPublicRoomState(room));

      const bot = store.getOwnedBot(payload.roomId, socket.id);
      if (!bot) {
        return;
      }

      await runBotReply({ bot, roomId: payload.roomId, message });
    });

    socket.on('bot:retry', async (input) => {
      const payload = botRetryPayloadSchema.parse(input);
      if (!lastFailedAttempt || lastFailedAttempt.roomId !== payload.roomId) {
        return;
      }

      await runBotReply(lastFailedAttempt);
    });

    socket.on('disconnecting', () => {
      const joinedRooms = [...socket.rooms].filter((roomId) => roomId !== socket.id);
      store.leave(socket.id);

      for (const roomId of joinedRooms) {
        io.to(roomId).emit('room:state', toPublicRoomState(store.getRoom(roomId)));
      }
    });
  });

  app.get('/', async (_, reply) => {
    return reply.sendFile('index.html');
  });

  return io;
}
