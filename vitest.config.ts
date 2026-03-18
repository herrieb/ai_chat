import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      shared: path.resolve(__dirname, 'shared/src/index.ts'),
      'ai-orchestrator': path.resolve(__dirname, 'ai-orchestrator/src/index.ts')
    }
  },
  test: {
    include: ['shared/test/**/*.test.ts', 'ai-orchestrator/test/**/*.test.ts', 'backend/test/**/*.test.ts'],
    environment: 'node'
  }
});
