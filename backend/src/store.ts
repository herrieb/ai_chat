import {
  BOT_RESPONSE_MAX_DELAY_MS,
  BOT_RESPONSE_MIN_DELAY_MS,
  DEFAULT_ROOM_ID,
  type ChatMessage,
  type JoinRoomPayload,
  type Participant,
  type RoomState
} from 'shared';

function createMemoryKey(payload: JoinRoomPayload): string {
  return [payload.roomId || DEFAULT_ROOM_ID, payload.displayName, payload.botName]
    .map((part) => part.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    .join('-');
}

function makeBot(ownerId: string, payload: JoinRoomPayload): Participant {
  return {
    id: crypto.randomUUID(),
    displayName: payload.botName,
    kind: 'bot',
    ownerUserId: ownerId,
    presence: 'online',
    botProfile: {
      id: crypto.randomUUID(),
      ownerUserId: ownerId,
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

function makeHuman(socketId: string, payload: JoinRoomPayload): Participant {
  return {
    id: socketId,
    displayName: payload.displayName,
    kind: 'human',
    presence: 'online'
  };
}

export class RoomStore {
  private readonly rooms = new Map<string, RoomState>();

  getRoom(roomId: string): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) {
      return existing;
    }

    const room: RoomState = {
      roomId,
      participants: [],
      messages: []
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(socketId: string, payload: JoinRoomPayload): RoomState {
    const roomId = payload.roomId || DEFAULT_ROOM_ID;
    const room = this.getRoom(roomId);
    const human = makeHuman(socketId, payload);
    const bot = makeBot(socketId, payload);
    room.participants = room.participants.filter(
      (participant) => participant.id !== socketId && participant.ownerUserId !== socketId
    );
    room.participants.push(human, bot);
    return room;
  }

  leave(socketId: string): void {
    for (const room of this.rooms.values()) {
      room.participants = room.participants.filter(
        (participant) => participant.id !== socketId && participant.ownerUserId !== socketId
      );
    }
  }

  addMessage(message: ChatMessage): RoomState {
    const room = this.getRoom(message.roomId);
    room.messages = [...room.messages, message].slice(-100);
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
}
