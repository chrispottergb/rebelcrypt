# Build context is the repo root (see docker-compose.yml).
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS builder
COPY . .
RUN yarn install --network-timeout 1000000
RUN npx turbo run build --filter=@music-ai/workflow-studio

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3001
CMD ["yarn", "workspace", "@music-ai/workflow-studio", "start"]
