import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';

import { env } from './config.js';
import { MemoryStore } from './memory-store.js';
import { memoryLedgerResponseSchema, ollamaConnectionConfigSchema, ollamaHealthResponseSchema, ollamaModelsResponseSchema, roomListResponseSchema } from 'shared';
import { OllamaProvider } from 'ai-orchestrator';
import { RoomStore } from './store.js';

export async function createHttpServer(memoryStore: MemoryStore, roomStore: RoomStore) {
  const app = fastify();
  const ollama = new OllamaProvider(env.OLLAMA_URL, env.OLLAMA_TOKEN);
  await app.register(cors, { origin: true });
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/'
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/health/ollama', async (_, reply) => {
    const health = await ollama.ping();
    return reply.code(health.status === 'ok' ? 200 : 503).send(ollamaHealthResponseSchema.parse(health));
  });

  app.post('/api/ollama/check', async (request, reply) => {
    const body = ollamaConnectionConfigSchema.parse(request.body);
    const health = await ollama.ping(body);
    return reply.code(health.status === 'ok' ? 200 : 503).send(ollamaHealthResponseSchema.parse(health));
  });

  app.post('/api/ollama/models', async (request, reply) => {
    const body = ollamaConnectionConfigSchema.parse(request.body);
    const result = await ollama.listModels(body);
    return reply.code(result.status === 'ok' ? 200 : 503).send(ollamaModelsResponseSchema.parse(result));
  });

  app.get('/api/memory/:memoryKey', async (request, reply) => {
    const params = request.params as { memoryKey?: string };
    const memoryKey = params.memoryKey?.trim();

    if (!memoryKey) {
      return reply.code(400).send({ message: 'memoryKey is required' });
    }

    const memories = await memoryStore.getAllMemories(memoryKey);
    return memoryLedgerResponseSchema.parse({ memoryKey, memories });
  });

  app.get('/api/rooms', async () => {
    return roomListResponseSchema.parse({ rooms: roomStore.listRooms() });
  });

  return app;
}
