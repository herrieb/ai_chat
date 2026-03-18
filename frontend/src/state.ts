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
  typingParticipants: Set<string>;
}

export function createInitialState(): AppState {
  return {
    joined: false,
    roomId: 'lobby',
    displayName: '',
    participants: [],
    messages: [],
    ownedBot: null,
    isOwner: false,
    typingParticipants: new Set()
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

export interface TypingUpdate {
  participantId: string;
  displayName: string;
  isTyping: boolean;
}

export function updateTypingState(state: AppState, update: TypingUpdate): AppState {
  const newTypingParticipants = new Set(state.typingParticipants);
  if (update.isTyping) {
    newTypingParticipants.add(update.participantId);
  } else {
    newTypingParticipants.delete(update.participantId);
  }
  return {
    ...state,
    typingParticipants: newTypingParticipants
  };
}
