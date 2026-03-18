import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function ensureWritable(dirPath: string): string | null {
  try {
    mkdirSync(dirPath, { recursive: true });
    return dirPath;
  } catch {
    return null;
  }
}

export function resolveDataSubdir(subdir: string): string {
  const configuredRoot = process.env.APP_DATA_DIR;
  const preferred = configuredRoot
    ? path.resolve(configuredRoot, subdir)
    : path.resolve(process.cwd(), 'data', subdir);

  const preferredResult = ensureWritable(preferred);
  if (preferredResult) {
    return preferredResult;
  }

  const fallback = path.resolve(os.tmpdir(), 'ai-chatroom-data', subdir);
  const fallbackResult = ensureWritable(fallback);
  if (fallbackResult) {
    return fallbackResult;
  }

  throw new Error(`Could not create writable storage directory for ${subdir}.`);
}
