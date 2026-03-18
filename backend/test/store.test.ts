import { describe, expect, it } from 'vitest';

import { RoomStore } from '../src/store.js';

describe('room store', () => {
  it('creates a human and hidden bot on join', () => {
    const store = new RoomStore();
    const room = store.joinRoom('socket-1', {
      roomId: 'lobby',
      displayName: 'Taylor',
      botName: 'Orbit',
      aiProvider: 'ollama',
      aiModel: 'llama3.2',
      ollamaUrl: 'http://127.0.0.1:11434',
      personality: 'playful strategist',
      theme: 'dark'
    });

    expect(room.participants).toHaveLength(2);
    const bot = room.participants.find((participant) => participant.kind === 'bot');

    expect(bot).toBeDefined();
    expect(bot?.botProfile?.memoryKey).toBe('lobby-taylor-orbit');
    expect(bot?.botProfile?.provider).toBe('ollama');
    expect(bot?.botProfile?.ollamaUrl).toBe('http://127.0.0.1:11434');
  });

  it('adds messages to the room timeline', () => {
    const store = new RoomStore();
    store.joinRoom('socket-1', {
      roomId: 'lobby',
      displayName: 'Taylor',
      botName: 'Orbit',
      aiProvider: 'ollama',
      aiModel: 'llama3.2',
      ollamaUrl: 'http://127.0.0.1:11434',
      personality: 'playful strategist',
      theme: 'light'
    });

    const room = store.addMessage({
      id: 'm1',
      roomId: 'lobby',
      participantId: 'socket-1',
      displayName: 'Taylor',
      content: 'hello',
      createdAt: new Date().toISOString()
    });

    expect(room.messages).toHaveLength(1);
    expect(room.messages[0]?.content).toBe('hello');
  });
});
