import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { RoomStore } from '../src/store.js';

const tempDirs: string[] = [];

async function createStore(): Promise<RoomStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ai-chatroom-room-store-'));
  tempDirs.push(dir);
  return new RoomStore(dir);
}

describe('room store', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('creates a human and hidden bot on join', async () => {
    const store = await createStore();
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
    expect(room.ownerDisplayName).toBe('Taylor');
    const bot = room.participants.find((participant) => participant.kind === 'bot');

    expect(bot).toBeDefined();
    expect(bot?.botProfile?.memoryKey).toBe('lobby-taylor-orbit');
    expect(bot?.botProfile?.provider).toBe('ollama');
    expect(bot?.botProfile?.ollamaUrl).toBe('http://127.0.0.1:11434');
  });

  it('adds messages to the room timeline', async () => {
    const store = await createStore();
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

  it('keeps bots in the room after the owner disconnects', async () => {
    const store = await createStore();
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

    store.leave('socket-1');

    const room = store.getRoom('lobby');
    expect(room.status).toBe('paused');
    expect(room.participants).toHaveLength(1);
    expect(room.participants[0]?.kind).toBe('bot');
  });

  it('lists rooms and closes them for the owner', async () => {
    const store = await createStore();
    store.joinRoom('socket-1', {
      roomId: 'strategy-room',
      displayName: 'Taylor',
      botName: 'Orbit',
      aiProvider: 'ollama',
      aiModel: 'llama3.2',
      ollamaUrl: 'http://127.0.0.1:11434',
      personality: 'playful strategist',
      theme: 'light'
    });

    const rooms = store.listRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.roomId).toBe('strategy-room');

    const closed = store.closeRoom('strategy-room', 'strategy-room-taylor');
    expect(closed?.status).toBe('closed');
    expect(store.listRooms()).toHaveLength(0);
  });
});
