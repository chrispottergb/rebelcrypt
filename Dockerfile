FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# Install all workspace deps (yarn installs the turbo binary correctly) and
# build the whole monorepo. Using yarn keeps this consistent with the repo.
FROM base AS builder
COPY . .
RUN yarn install --network-timeout 1000000
RUN npx turbo run build --filter=@music-ai/api

# Production API runtime. Copies the full built workspace so every
# @music-ai/* symlink in node_modules resolves to its package dist
# (the API imports security, observability, governance, genre-registry,
# language-registry and rights at runtime).
FROM base AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "packages/api/dist/main.js"]
