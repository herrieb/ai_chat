import { describe, expect, it } from 'vitest';

import { botErrorEventSchema, botMemorySchema, botRetryPayloadSchema, chatMessageSchema, closeRoomPayloadSchema, joinRoomPayloadSchema, memoryLedgerResponseSchema, ollamaHealthResponseSchema, ollamaModelsResponseSchema, providerResponseSchema, roomClosedEventSchema, roomListResponseSchema, typingEventSchema } from '../src/schemas.js';

describe('shared schemas', () => {
  it('accepts a valid join payload', () => {
    const result = joinRoomPayloadSchema.parse({
      roomId: 'lobby',
      displayName: 'Taylor',
      botName: 'Orbit',
      aiProvider: 'ollama',
      aiModel: 'llama3.2',
      ollamaUrl: 'http://127.0.0.1:11434',
      personality: 'playful strategist',
      theme: 'dark'
    });

    expect(result.displayName).toBe('Taylor');
  });

  it('rejects empty message content', () => {
    expect(() =>
      chatMessageSchema.parse({
        id: '1',
      roomId: 'lobby',
      participantId: 'u1',
      displayName: 'Taylor',
      content: '',
      createdAt: new Date().toISOString(),
      replyDepth: 0,
      replyToMessageId: 'parent-1'
      })
    ).toThrowError();
  });

  it('accepts a provider response with memory drafts', () => {
    const result = providerResponseSchema.parse({
      reply: 'I should keep it short.',
      newMemories: [
        {
          fact: 'Taylor prefers short answers.',
          kind: 'preference',
          importance: 0.9
        }
      ]
    });

    expect(result.newMemories).toHaveLength(1);
  });

  it('accepts a stored bot memory record', () => {
    const result = botMemorySchema.parse({
      id: 'memory-1',
      botId: 'bot-1',
      memoryKey: 'lobby-taylor-orbit',
      roomId: 'lobby',
      sourceMessageId: 'message-1',
      fact: 'Taylor likes strategy games.',
      kind: 'preference',
      importance: 0.8,
      createdAt: new Date().toISOString()
    });

    expect(result.memoryKey).toBe('lobby-taylor-orbit');
  });

  it('accepts a sanitized bot error event', () => {
    const result = botErrorEventSchema.parse({
      id: 'error-1',
      category: 'ai_unavailable',
      severity: 'error',
      message: 'Your AI could not reach Ollama. Check that it is running.',
      retryable: true,
      timestamp: new Date().toISOString()
    });

    expect(result.retryable).toBe(true);
  });

  it('accepts retry and health payloads', () => {
    const retry = botRetryPayloadSchema.parse({ roomId: 'lobby' });
    const health = ollamaHealthResponseSchema.parse({
      status: 'ok',
      message: 'Ollama is reachable.'
    });
    const models = ollamaModelsResponseSchema.parse({
      status: 'ok',
      message: 'Models loaded.',
      models: ['llama3.2']
    });

    expect(retry.roomId).toBe('lobby');
    expect(health.status).toBe('ok');
    expect(models.models[0]).toBe('llama3.2');
  });

  it('accepts a memory ledger response', () => {
    const result = memoryLedgerResponseSchema.parse({
      memoryKey: 'lobby-taylor-orbit',
      memories: [
        {
          id: 'memory-1',
          botId: 'bot-1',
          memoryKey: 'lobby-taylor-orbit',
          roomId: 'lobby',
          sourceMessageId: 'message-1',
          fact: 'Taylor prefers short answers.',
          kind: 'preference',
          importance: 0.8,
          createdAt: new Date().toISOString()
        }
      ]
    });

    expect(result.memories[0]?.fact).toContain('short answers');
  });

  it('accepts room listing and close payloads', () => {
    const list = roomListResponseSchema.parse({
      rooms: [
        {
          roomId: 'lobby',
          ownerDisplayName: 'Taylor',
          status: 'active',
          maxAiResponses: 1000,
          participantCount: 2,
          humanCount: 1,
          botCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
    const close = closeRoomPayloadSchema.parse({ roomId: 'lobby' });
    const closed = roomClosedEventSchema.parse({ roomId: 'lobby' });

    expect(list.rooms[0]?.roomId).toBe('lobby');
    expect(close.roomId).toBe('lobby');
    expect(closed.roomId).toBe('lobby');
  });

  it('accepts typing events', () => {
    const result = typingEventSchema.parse({
      roomId: 'lobby',
      participantId: 'bot-1',
      displayName: 'Orbit',
      isTyping: true
    });

    expect(result.displayName).toBe('Orbit');
    expect(result.isTyping).toBe(true);
  });
});
