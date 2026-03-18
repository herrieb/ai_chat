import { mkdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

import { botMemorySchema, type BotMemory, type NewMemoryDraft } from 'shared';

const DEFAULT_MEMORY_LIMIT = 8;

interface AppendMemoryArgs {
  botId: string;
  memoryKey: string;
  roomId: string;
  sourceMessageId: string;
  drafts: NewMemoryDraft[];
}

export class MemoryStore {
  constructor(private readonly baseDir = path.resolve(process.cwd(), 'data/memories')) {}

  async getRecentMemories(memoryKey: string, limit = DEFAULT_MEMORY_LIMIT): Promise<BotMemory[]> {
    const memories = await this.getAllMemories(memoryKey);
    return memories.slice(-limit);
  }

  async getAllMemories(memoryKey: string): Promise<BotMemory[]> {
    const filePath = this.getFilePath(memoryKey);

    try {
      const content = await readFile(filePath, 'utf8');
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          const parsed = botMemorySchema.safeParse(JSON.parse(line));
          return parsed.success ? [parsed.data] : [];
        });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  }

  async appendMemories(args: AppendMemoryArgs): Promise<BotMemory[]> {
    if (args.drafts.length === 0) {
      return [];
    }

    await mkdir(this.baseDir, { recursive: true });

    const createdAt = new Date().toISOString();
    const memories = args.drafts.map((draft) =>
      botMemorySchema.parse({
        id: crypto.randomUUID(),
        botId: args.botId,
        memoryKey: args.memoryKey,
        roomId: args.roomId,
        sourceMessageId: args.sourceMessageId,
        fact: draft.fact,
        kind: draft.kind,
        importance: draft.importance,
        createdAt
      })
    );

    const lines = memories.map((memory) => JSON.stringify(memory)).join('\n');
    await appendFile(this.getFilePath(args.memoryKey), `${lines}\n`, 'utf8');

    return memories;
  }

  private getFilePath(memoryKey: string): string {
    return path.join(this.baseDir, `${sanitizeMemoryKey(memoryKey)}.jsonl`);
  }
}

function sanitizeMemoryKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}
