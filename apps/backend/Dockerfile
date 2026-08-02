# syntax=docker/dockerfile:1
# Backend image. Bun is both the package manager and the runtime: the NestJS
# server runs from TypeScript sources, no compile step. `turbo prune` reduces the
# monorepo to the backend's workspace subgraph so the image installs and ships
# only what this service needs.

FROM docker.io/oven/bun:1.3-alpine AS base
WORKDIR /app

# Extract the backend subgraph: pruned manifests + lockfile land in out/json,
# pruned sources in out/full. turbo is a glibc binary, so Alpine needs libc6-compat.
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN bun install -g turbo@2.9.14
COPY . .
RUN turbo prune @company-brain/backend --docker

# Install production dependencies, then generate the Prisma client. Manifests are
# copied before sources so the dependency layer is only rebuilt when the lockfile
# changes, not on every code edit.
FROM base AS build
COPY --from=pruner /app/out/json/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
# Prisma requires a connection string to load its config; client generation is
# offline and never opens the connection.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN bun run --filter @company-brain/db db:generate
# The runtime only uses @prisma/client + the pg driver adapter. Everything the
# Prisma CLI and config loader pulled in for `generate` is dead weight now:
# the CLI itself, the native engines, the config loader and its `effect`/
# `typescript` toolchain, and the Studio bundle.
RUN rm -rf \
    node_modules/.bun/prisma@* \
    node_modules/.bun/@prisma+engines@* \
    node_modules/.bun/@prisma+engines-version@* \
    node_modules/.bun/@prisma+fetch-engine@* \
    node_modules/.bun/@prisma+get-platform@* \
    node_modules/.bun/@prisma+query-plan-executor@* \
    node_modules/.bun/@prisma+streams-local@* \
    node_modules/.bun/@prisma+config@* \
    node_modules/.bun/@prisma+studio-core@* \
    node_modules/.bun/@prisma+dev@* \
    node_modules/.bun/@electric-sql+* \
    node_modules/.bun/effect@* \
    node_modules/.bun/typescript@* \
    node_modules/.bun/@typescript+typescript6@* \
    node_modules/.bun/react@* \
    node_modules/.bun/react-dom@* \
    node_modules/.bun/chart.js@* \
    node_modules/.bun/@radix-ui+* \
    node_modules/.bun/@types+*
# Build-only files the runtime never reads: Turbo config (root + app), the
# lockfile, the Prisma schema/seeds (the client is generated into src/generated;
# the migrate image owns schema and migrations), the Prisma tooling config, and
# TypeScript project files. apps/backend's own tsconfig.json stays: Bun reads
# emitDecoratorMetadata from it at runtime. (Dev-only sources and env examples are
# excluded upstream by .dockerignore; the empty eslint-rules manifest is dropped.)
RUN rm -rf \
    turbo.json apps/backend/turbo.json bun.lock \
    packages/eslint-rules \
    packages/db/prisma packages/db/prisma.config.ts packages/db/tsconfig.json \
    packages/shared/tsconfig.json packages/shared/tsconfig.build.json

# Runtime image: sources + production dependencies under an init process.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache tini wget
COPY --from=build /app ./
# Bun resolves compiler options from the tsconfig.json in the working directory,
# and NestJS dependency injection relies on emitDecoratorMetadata being set there.
WORKDIR /app/apps/backend
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/v1/health" >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "run", "src/main.ts"]
