import { z } from 'zod';

export const botProfileSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  memoryKey: z.string().min(1),
  provider: z.enum(['ollama']),
  model: z.string().trim().min(1),
  ollamaUrl: z.string().url(),
  ollamaToken: z.string().trim().min(1).optional(),
  personality: z.string().min(1),
  responseProbability: z.number().min(0).max(1),
  minDelayMs: z.number().int().nonnegative(),
  maxDelayMs: z.number().int().nonnegative(),
  cooldownMs: z.number().int().nonnegative()
});

export const participantSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  kind: z.enum(['human', 'bot']),
  ownerUserId: z.string().min(1).optional(),
  presence: z.enum(['online', 'offline']),
  botProfile: botProfileSchema.optional()
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().datetime(),
  replyDepth: z.number().int().nonnegative(),
  replyToMessageId: z.string().min(1).optional()
});

export const roomStateSchema = z.object({
  roomId: z.string().min(1),
  ownerKey: z.string().min(1),
  ownerDisplayName: z.string().min(1),
  status: z.enum(['active', 'paused', 'closed']),
  maxAiResponses: z.number().int().min(1).max(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  participants: z.array(participantSchema),
  messages: z.array(chatMessageSchema)
});

export const publicRoomStateSchema = z.object({
  roomId: z.string().min(1),
  ownerDisplayName: z.string().min(1),
  status: z.enum(['active', 'paused', 'closed']),
  maxAiResponses: z.number().int().min(1).max(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  participants: z.array(participantSchema),
  messages: z.array(chatMessageSchema)
});

export const roomSummarySchema = z.object({
  roomId: z.string().min(1),
  ownerDisplayName: z.string().min(1),
  status: z.enum(['active', 'paused', 'closed']),
  maxAiResponses: z.number().int().min(1).max(1000),
  participantCount: z.number().int().nonnegative(),
  humanCount: z.number().int().nonnegative(),
  botCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const joinRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
  displayName: z.string().min(1),
  botName: z.string().min(1),
  aiProvider: z.enum(['ollama']),
  aiModel: z.string().trim().min(1),
  ollamaUrl: z.string().url(),
  ollamaToken: z.string().trim().min(1).optional(),
  personality: z.string().min(1),
  maxAiResponses: z.number().int().min(1).max(1000).optional(),
  theme: z.enum(['light', 'dark'])
});

export const sendMessagePayloadSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().trim().min(1)
});

export const newMemoryDraftSchema = z.object({
  fact: z.string().trim().min(1).max(500),
  kind: z.enum(['identity', 'preference', 'relationship', 'goal', 'fact']),
  importance: z.number().min(0).max(1)
});

export const botMemorySchema = z.object({
  id: z.string().min(1),
  botId: z.string().min(1),
  memoryKey: z.string().min(1),
  roomId: z.string().min(1),
  sourceMessageId: z.string().min(1),
  fact: z.string().trim().min(1).max(500),
  kind: z.enum(['identity', 'preference', 'relationship', 'goal', 'fact']),
  importance: z.number().min(0).max(1),
  createdAt: z.string().datetime()
});

export const providerResponseSchema = z.object({
  reply: z.string().trim().min(1).max(2000),
  newMemories: z.array(newMemoryDraftSchema).max(5)
});

export const botErrorEventSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['ai_unavailable', 'ai_response_failed']),
  severity: z.enum(['error', 'warning']),
  message: z.string().trim().min(1).max(200),
  retryable: z.boolean(),
  timestamp: z.string().datetime()
});

export const botRetryPayloadSchema = z.object({
  roomId: z.string().min(1)
});

export const closeRoomPayloadSchema = z.object({
  roomId: z.string().min(1)
});

export const ollamaHealthResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  message: z.string().trim().min(1).max(200)
});

export const ollamaConnectionConfigSchema = z.object({
  baseUrl: z.string().url(),
  authToken: z.string().trim().min(1).optional()
});

export const ollamaModelsResponseSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  message: z.string().trim().min(1).max(200),
  models: z.array(z.string().trim().min(1))
});

export const memoryLedgerResponseSchema = z.object({
  memoryKey: z.string().min(1),
  memories: z.array(botMemorySchema)
});

export const roomListResponseSchema = z.object({
  rooms: z.array(roomSummarySchema)
});

export const roomClosedEventSchema = z.object({
  roomId: z.string().min(1)
});

export const typingEventSchema = z.object({
  roomId: z.string().min(1),
  participantId: z.string().min(1),
  displayName: z.string().min(1),
  isTyping: z.boolean()
});
