export type ThemeMode = 'light' | 'dark';
export type ParticipantKind = 'human' | 'bot';
export type AIProviderId = 'ollama';
export type MemoryKind = 'identity' | 'preference' | 'relationship' | 'goal' | 'fact';
export type BotErrorCategory = 'ai_unavailable' | 'ai_response_failed';
export type BotErrorSeverity = 'error' | 'warning';

export interface OllamaConnectionConfig {
  baseUrl: string;
  authToken?: string;
}

export interface BotProfile {
  id: string;
  ownerUserId: string;
  memoryKey: string;
  provider: AIProviderId;
  model: string;
  ollamaUrl: string;
  ollamaToken?: string;
  personality: string;
  responseProbability: number;
  minDelayMs: number;
  maxDelayMs: number;
  cooldownMs: number;
}

export interface Participant {
  id: string;
  displayName: string;
  kind: ParticipantKind;
  ownerUserId?: string;
  presence: 'online' | 'offline';
  botProfile?: BotProfile;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  participantId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export interface RoomState {
  roomId: string;
  participants: Participant[];
  messages: ChatMessage[];
}

export interface JoinRoomPayload {
  roomId: string;
  displayName: string;
  botName: string;
  aiProvider: AIProviderId;
  aiModel: string;
  ollamaUrl: string;
  ollamaToken?: string;
  personality: string;
  theme: ThemeMode;
}

export interface SendMessagePayload {
  roomId: string;
  content: string;
}

export interface BotDecision {
  shouldRespond: boolean;
  reason: string;
  delayMs: number;
}

export interface BotReplyPlan {
  message: ChatMessage;
  delayMs: number;
  newMemories: NewMemoryDraft[];
}

export interface NewMemoryDraft {
  fact: string;
  kind: MemoryKind;
  importance: number;
}

export interface BotMemory {
  id: string;
  botId: string;
  memoryKey: string;
  roomId: string;
  sourceMessageId: string;
  fact: string;
  kind: MemoryKind;
  importance: number;
  createdAt: string;
}

export interface ProviderResponse {
  reply: string;
  newMemories: NewMemoryDraft[];
}

export interface BotErrorEvent {
  id: string;
  category: BotErrorCategory;
  severity: BotErrorSeverity;
  message: string;
  retryable: boolean;
  timestamp: string;
}

export interface BotRetryPayload {
  roomId: string;
}

export interface OllamaHealthResponse {
  status: 'ok' | 'unavailable';
  message: string;
}

export interface OllamaModelsResponse {
  status: 'ok' | 'unavailable';
  message: string;
  models: string[];
}

export interface MemoryLedgerResponse {
  memoryKey: string;
  memories: BotMemory[];
}
