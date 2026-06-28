FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

FROM base AS deps
COPY package.json package-lock.json* turbo.json ./
COPY packages/core/types/package.json ./packages/core/types/package.json
COPY packages/core/logger/package.json ./packages/core/logger/package.json
COPY packages/core/config/package.json ./packages/core/config/package.json
COPY packages/core/queue/package.json ./packages/core/queue/package.json
COPY packages/core/engine/package.json ./packages/core/engine/package.json
COPY packages/core/storage/package.json ./packages/core/storage/package.json
COPY packages/core/security/package.json ./packages/core/security/package.json
COPY packages/music/genre-registry/package.json ./packages/music/genre-registry/package.json
COPY packages/music/language-registry/package.json ./packages/music/language-registry/package.json
COPY packages/music/rights/package.json ./packages/music/rights/package.json
COPY packages/music/catalog/package.json ./packages/music/catalog/package.json
COPY packages/music/generator/package.json ./packages/music/generator/package.json
COPY packages/music/recommendation/package.json ./packages/music/recommendation/package.json
COPY packages/music/mood/package.json ./packages/music/mood/package.json
COPY packages/music/metadata/package.json ./packages/music/metadata/package.json
COPY packages/music/artist/package.json ./packages/music/artist/package.json
COPY packages/ai/llm-client/package.json ./packages/ai/llm-client/package.json
COPY packages/ai/evaluation/package.json ./packages/ai/evaluation/package.json
COPY packages/ai/embedding/package.json ./packages/ai/embedding/package.json
COPY packages/ai/guardrails/package.json ./packages/ai/guardrails/package.json
COPY packages/ai/prompts/package.json ./packages/ai/prompts/package.json
COPY packages/analytics/etl/package.json ./packages/analytics/etl/package.json
COPY packages/analytics/forecasting/package.json ./packages/analytics/forecasting/package.json
COPY packages/analytics/experimentation/package.json ./packages/analytics/experimentation/package.json
COPY packages/analytics/kpi/package.json ./packages/analytics/kpi/package.json
COPY packages/analytics/segmentation/package.json ./packages/analytics/segmentation/package.json
COPY packages/enterprise/observability/package.json ./packages/enterprise/observability/package.json
COPY packages/enterprise/governance/package.json ./packages/enterprise/governance/package.json
COPY packages/enterprise/connectors/package.json ./packages/enterprise/connectors/package.json
COPY packages/enterprise/notifications/package.json ./packages/enterprise/notifications/package.json
COPY packages/enterprise/gtm/package.json ./packages/enterprise/gtm/package.json
COPY packages/api/package.json ./packages/api/package.json
RUN npm install --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo run build

FROM base AS api
WORKDIR /app
ENV NODE_ENV=production
# Copy the full built workspace so every @music-ai/* symlink in node_modules
# resolves to its package dist (the API imports security, observability,
# governance, genre-registry, language-registry and rights at runtime).
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "packages/api/dist/main.js"]
