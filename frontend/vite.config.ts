import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared/src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../backend/public'),
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
