import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { MemoryStore } from '../src/memory-store.js';

const tempDirs: string[] = [];

async function createStore(): Promise<MemoryStore> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ai-chatroom-memory-'));
  tempDirs.push(dir);
  return new MemoryStore(dir);
}

describe('memory store', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('appends and reads memories for a bot ledger', async () => {
    const store = await createStore();

    await store.appendMemories({
      botId: 'bot-1',
      memoryKey: 'lobby-taylor-orbit',
      roomId: 'lobby',
      sourceMessageId: 'message-1',
      drafts: [
        {
          fact: 'Taylor prefers short answers.',
          kind: 'preference',
          importance: 0.9
        }
      ]
    });

    const memories = await store.getAllMemories('lobby-taylor-orbit');

    expect(memories).toHaveLength(1);
    expect(memories[0]?.fact).toBe('Taylor prefers short answers.');
  });

  it('returns only the requested recent memory subset', async () => {
    const store = await createStore();

    await store.appendMemories({
      botId: 'bot-1',
      memoryKey: 'lobby-taylor-orbit',
      roomId: 'lobby',
      sourceMessageId: 'message-1',
      drafts: [
        { fact: 'One', kind: 'fact', importance: 0.5 },
        { fact: 'Two', kind: 'fact', importance: 0.6 },
        { fact: 'Three', kind: 'fact', importance: 0.7 }
      ]
    });

    const memories = await store.getRecentMemories('lobby-taylor-orbit', 2);

    expect(memories).toHaveLength(2);
    expect(memories[0]?.fact).toBe('Two');
    expect(memories[1]?.fact).toBe('Three');
  });
});
