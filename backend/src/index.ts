import { env } from './config.js';
import { MemoryStore } from './memory-store.js';
import { createHttpServer } from './http.js';
import { RoomStore } from './store.js';
import { attachWebSockets } from './ws.js';

async function start() {
  const store = new RoomStore();
  const memoryStore = new MemoryStore();
  const app = await createHttpServer(memoryStore);

  attachWebSockets(app, app.server, store, memoryStore);

  await app.listen({ port: env.PORT, host: env.HOST });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
