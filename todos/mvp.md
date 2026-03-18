# MVP Todo

## Status key

- `pending`
- `in_progress`
- `done`
- `blocked`

## Items

| Item | Status | Notes |
| --- | --- | --- |
| Bootstrap repo instructions and todo flow | `done` | Readme and tracked todo file created |
| Add workspace tooling and scripts | `done` | Root package, TypeScript, Vitest workspace created |
| Add shared contracts and validation | `done` | Core types and validators added |
| Add AI orchestrator module | `done` | Decision logic and provider boundary added |
| Add backend server and WebSockets | `done` | Fastify, Socket.IO, in-memory room state added |
| Add frontend chat client | `done` | Responsive Material-inspired UI added |
| Add tests and Docker setup | `done` | Tests, build, runtime, and Docker health checks passed |

## Room Lifecycle Extension

### Defaults

- Single owner per room
- Keep room message history
- Keep bot memory after room close

### Items

| Item | Status | Notes |
| --- | --- | --- |
| Add shared room lifecycle contracts | `pending` | Room metadata, summaries, close payloads, list responses |
| Add file-backed room persistence | `pending` | Persist room state under `data/rooms/` |
| Keep bots in rooms after owner disconnect | `pending` | Mark humans offline instead of deleting bots |
| Add room listing and close-room backend APIs/events | `pending` | HTTP + Socket.IO room management |
| Add frontend room browser and room close flow | `pending` | List rooms, rejoin, close room UI |
| Verify room lifecycle end to end | `pending` | Tests, build, runtime checks |
