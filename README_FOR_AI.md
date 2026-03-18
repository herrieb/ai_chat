# AI Chatroom

Read this file before making changes.

## Goal

Build a real-time chatroom where humans and user-owned bots share the same room,
look identical in the participant list, and support future game scenarios.

## Stack

- Frontend: Vite + TypeScript + vanilla DOM
- Backend: Node.js + Fastify + Socket.IO
- AI orchestration: TypeScript module with provider adapters
- Shared: TypeScript types and validators
- Tests: Vitest
- Container: Docker Compose on port `9231`

## Repo Rules

- Work from `todos/`.
- Keep files focused and small.
- Prefer explicit logic over magic.
- Preserve hidden bot identity in UI.
- Do not introduce `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Validate behavior with tests or runnable checks before finishing.

## MVP Defaults

- Single default room: `lobby`
- In-memory state only
- One user-controlled bot per connected user
- Ollama-backed bot responses in runtime
- No authentication yet

## Package Layout

- `frontend/` - browser client
- `backend/` - HTTP + WebSocket server
- `ai-orchestrator/` - bot decision and response generation
- `shared/` - shared types, constants, validation
- `todos/` - tracked work items
