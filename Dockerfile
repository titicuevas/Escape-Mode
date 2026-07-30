# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN pnpm prisma:generate \
  && pnpm --filter @grc/shared build \
  && pnpm --filter @grc/client build \
  && pnpm --filter @grc/server build

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate \
  && groupadd --system --gid 1001 grc \
  && useradd --system --uid 1001 --gid grc grc
WORKDIR /app

COPY --from=build --chown=grc:grc /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build --chown=grc:grc /app/node_modules ./node_modules
COPY --from=build --chown=grc:grc /app/prisma ./prisma
COPY --from=build --chown=grc:grc /app/shared ./shared
COPY --from=build --chown=grc:grc /app/server/package.json ./server/package.json
COPY --from=build --chown=grc:grc /app/server/dist ./server/dist
COPY --from=build --chown=grc:grc /app/server/node_modules ./server/node_modules
COPY --from=build --chown=grc:grc /app/client/package.json ./client/package.json
COPY --from=build --chown=grc:grc /app/client/dist ./client/dist
COPY --from=build --chown=grc:grc /app/client/node_modules ./client/node_modules
COPY --from=build --chown=grc:grc /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

USER grc
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["/bin/sh", "./scripts/docker-entrypoint.sh"]
