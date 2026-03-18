import {
  BOT_RESPONSE_MAX_DELAY_MS,
  BOT_RESPONSE_MIN_DELAY_MS,
  DEFAULT_MAX_AI_RESPONSES,
  DEFAULT_ROOM_ID,
  type ChatMessage,
  type JoinRoomPayload,
  type Participant,
  roomStateSchema,
  type RoomSummary,
  type RoomState
} from 'shared';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { resolveDataSubdir } from './storage-path.js';

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function createMemoryKey(payload: JoinRoomPayload): string {
  return [payload.roomId || DEFAULT_ROOM_ID, payload.displayName, payload.botName]
    .map(slugify)
    .join('-');
}

function createOwnerKey(roomId: string, displayName: string): string {
  return [roomId, displayName].map(slugify).join('-');
}

function normalizeRoomState(room: RoomState): RoomState {
  return {
    ...room,
    maxAiResponses: room.maxAiResponses ?? DEFAULT_MAX_AI_RESPONSES
  };
}

function makeBot(ownerKey: string, payload: JoinRoomPayload): Participant {
  return {
    id: crypto.randomUUID(),
    displayName: payload.botName,
    kind: 'bot',
    ownerUserId: ownerKey,
    presence: 'online',
    botProfile: {
      id: crypto.randomUUID(),
      ownerUserId: ownerKey,
      memoryKey: createMemoryKey(payload),
      provider: payload.aiProvider,
      model: payload.aiModel,
      ollamaUrl: payload.ollamaUrl,
      ollamaToken: payload.ollamaToken,
      personality: payload.personality,
      responseProbability: 1,
      minDelayMs: BOT_RESPONSE_MIN_DELAY_MS,
      maxDelayMs: BOT_RESPONSE_MAX_DELAY_MS,
      cooldownMs: 0
    }
  };
}

function makeHuman(socketId: string, ownerKey: string, payload: JoinRoomPayload): Participant {
  return {
    id: socketId,
    displayName: payload.displayName,
    kind: 'human',
    ownerUserId: ownerKey,
    presence: 'online'
  };
}

export class RoomStore {
  private readonly rooms = new Map<string, RoomState>();

  constructor(private readonly baseDir = resolveDataSubdir('rooms')) {
    mkdirSync(this.baseDir, { recursive: true });
    this.loadRooms();
  }

  getRoom(roomId: string): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) {
      const normalized = normalizeRoomState(existing);
      this.rooms.set(roomId, normalized);
      return normalized;
    }

    const now = new Date().toISOString();
    const room: RoomState = {
      roomId,
      ownerKey: '',
      ownerDisplayName: '',
      status: 'active',
      maxAiResponses: DEFAULT_MAX_AI_RESPONSES,
      createdAt: now,
      updatedAt: now,
      participants: [],
      messages: []
    };
    const normalized = normalizeRoomState(room);
    this.rooms.set(roomId, normalized);
    return normalized;
  }

  joinRoom(socketId: string, payload: JoinRoomPayload): RoomState {
    const roomId = payload.roomId || DEFAULT_ROOM_ID;
    const room = this.getRoom(roomId);
    if (room.status === 'closed') {
      throw new Error('Room is closed.');
    }

    const ownerKey = createOwnerKey(roomId, payload.displayName);
    const human = makeHuman(socketId, ownerKey, payload);
    const existingBot = room.participants.find(
      (participant) => participant.kind === 'bot' && participant.ownerUserId === ownerKey
    );

    room.participants = room.participants.filter(
      (participant) => participant.id !== socketId && !(participant.kind === 'human' && participant.ownerUserId === ownerKey)
    );

    if (!existingBot) {
      room.participants.push(makeBot(ownerKey, payload));
    }

    room.participants.push(human);
    if (!room.ownerKey) {
      room.ownerKey = ownerKey;
      room.ownerDisplayName = payload.displayName;
      room.maxAiResponses = payload.maxAiResponses ?? DEFAULT_MAX_AI_RESPONSES;
    }
    room.status = 'active';
    room.updatedAt = new Date().toISOString();
    this.saveRoom(room);
    return room;
  }

  leave(socketId: string): void {
    for (const room of this.rooms.values()) {
      const nextParticipants = room.participants.filter(
        (participant) => !(participant.kind === 'human' && participant.id === socketId)
      );

      if (nextParticipants.length !== room.participants.length) {
        room.participants = nextParticipants;
        room.status = room.participants.some((participant) => participant.kind === 'human') ? 'active' : 'paused';
        room.updatedAt = new Date().toISOString();
        this.saveRoom(room);
      }
    }
  }

  addMessage(message: ChatMessage): RoomState {
    const room = this.getRoom(message.roomId);
    room.messages = [...room.messages, message].slice(-100);
    room.updatedAt = new Date().toISOString();
    this.saveRoom(room);
    return room;
  }

  getParticipant(roomId: string, participantId: string): Participant | undefined {
    return this.getRoom(roomId).participants.find((participant) => participant.id === participantId);
  }

  getOwnedBot(roomId: string, ownerUserId: string): Participant | undefined {
    return this.getRoom(roomId).participants.find(
      (participant) => participant.kind === 'bot' && participant.ownerUserId === ownerUserId
    );
  }

  getReplyBot(roomId: string, author: Participant): Participant | undefined {
    const bots = this.getRoom(roomId).participants.filter(
      (participant): participant is Participant => participant.kind === 'bot'
    );

    if (author.kind === 'human' && author.ownerUserId) {
      return bots.find((bot) => bot.ownerUserId === author.ownerUserId) ?? bots.find((bot) => bot.id !== author.id);
    }

    return (
      bots.find((bot) => bot.id !== author.id && bot.ownerUserId !== author.ownerUserId) ??
      bots.find((bot) => bot.id !== author.id)
    );
  }

  hasAiReplyToMessage(roomId: string, messageId: string): boolean {
    return this.getRoom(roomId).messages.some((message) => message.replyToMessageId === messageId);
  }

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => room.status !== 'closed')
      .map((room) => ({
        roomId: room.roomId,
        ownerDisplayName: room.ownerDisplayName,
        status: room.status,
        maxAiResponses: room.maxAiResponses,
        participantCount: room.participants.length,
        humanCount: room.participants.filter((participant) => participant.kind === 'human').length,
        botCount: room.participants.filter((participant) => participant.kind === 'bot').length,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  closeRoom(roomId: string, ownerKey: string): RoomState | null {
    const room = this.rooms.get(roomId);
    if (!room || room.ownerKey !== ownerKey) {
      return null;
    }

    room.status = 'closed';
    room.updatedAt = new Date().toISOString();
    room.participants = [];
    this.rooms.delete(roomId);
    this.deleteRoomFile(roomId);
    return room;
  }

  private loadRooms(): void {
    for (const entry of readdirSync(this.baseDir)) {
      if (!entry.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.baseDir, entry);
      const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<RoomState>;
      const normalized = normalizeRoomState(raw as RoomState);
      const parsed = roomStateSchema.safeParse(normalized);
      if (parsed.success) {
        this.rooms.set(parsed.data.roomId, parsed.data);
      }
    }
  }

  private saveRoom(room: RoomState): void {
    writeFileSync(this.getRoomFilePath(room.roomId), JSON.stringify(normalizeRoomState(room), null, 2), 'utf8');
  }

  private deleteRoomFile(roomId: string): void {
    rmSync(this.getRoomFilePath(roomId), { force: true });
  }

  private getRoomFilePath(roomId: string): string {
    return path.join(this.baseDir, `${slugify(roomId)}.json`);
  }
}
