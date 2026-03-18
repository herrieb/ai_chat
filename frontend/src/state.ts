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
  isOwner: boolean;
}

export function createInitialState(): AppState {
  return {
    joined: false,
    roomId: 'lobby',
    displayName: '',
    participants: [],
    messages: [],
    ownedBot: null,
    isOwner: false
  };
}

export function updateStateFromRoomState(state: AppState, room: RoomState, ownerDisplayName: string): AppState {
  return {
    ...state,
    roomId: room.roomId,
    participants: room.participants,
    messages: room.messages,
    isOwner: room.ownerDisplayName === ownerDisplayName
  };
}
