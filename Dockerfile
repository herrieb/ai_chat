FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json tsconfig.check.json vitest.config.ts ./
COPY frontend ./frontend
COPY backend ./backend
COPY ai-orchestrator ./ai-orchestrator
COPY shared ./shared
COPY todos ./todos
COPY README_FOR_AI.md ./README_FOR_AI.md

RUN npm ci
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=9231
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY ai-orchestrator/package.json ./ai-orchestrator/package.json
COPY shared/package.json ./shared/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci --omit=dev

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/public ./backend/public
COPY --from=build /app/ai-orchestrator/dist ./ai-orchestrator/dist
COPY --from=build /app/shared/dist ./shared/dist

EXPOSE 9231

CMD ["node", "backend/dist/index.js"]
