import type { Participant, ChatMessage, RoomState } from './types.js';

export type { RoomState };

export interface OwnedBotInfo {
  botName: string;
  memoryKey: string;
}

export interface AppState {
  joined: boolean;
  roomId: string;
  displayName: string;
  participants: Participant[];
  messages: ChatMessage[];
  ownedBot: OwnedBotInfo | null;
}

export function createInitialState(): AppState {
  return {
    joined: false,
    roomId: 'lobby',
    displayName: '',
    participants: [],
    messages: [],
    ownedBot: null
  };
}

export function updateStateFromRoomState(state: AppState, room: RoomState): AppState {
  return {
    ...state,
    roomId: room.roomId,
    participants: room.participants,
    messages: room.messages
  };
}
