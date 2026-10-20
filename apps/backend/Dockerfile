# syntax=docker/dockerfile:1
# Backend image. Bun is both the package manager and the runtime: the NestJS
# server runs from TypeScript sources, no compile step. `turbo prune` reduces the
# monorepo to the backend's workspace subgraph so the image installs and ships
# only what this service needs.

FROM docker.io/oven/bun:1.4.2-alpine AS base
WORKDIR /app

# Extract the backend subgraph: pruned manifests + lockfile land in out/json,
# pruned sources in out/full. turbo is a glibc binary, so Alpine needs libc6-compat.
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN bun install -g turbo@2.11.7
COPY . .
RUN turbo prune @neuma/backend --docker

# Install production dependencies. Manifests are copied before sources so the
# dependency layer is only rebuilt when the lockfile changes, not on every code
# edit. The Prisma contract the runtime reads is committed, so nothing is generated.
FROM base AS build
COPY --from=pruner /app/out/json/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
# The TypeScript toolchains and UI libraries other workspaces declare are never
# loaded by the server, and this image is Alpine (musl), so the glibc builds of
# native modules never load either.
RUN rm -rf \
    node_modules/.bun/@napi-rs+canvas-linux-*-gnu@* \
    node_modules/.bun/@rolldown+binding-linux-*-gnu@* \
    node_modules/.bun/typescript@* \
    node_modules/.bun/@typescript+typescript6@* \
    node_modules/.bun/react@* \
    node_modules/.bun/react-dom@* \
    node_modules/.bun/chart.js@* \
    node_modules/.bun/@radix-ui+* \
    node_modules/.bun/@types+*
# Build-only files the runtime never reads: Turbo config (root + app), the
# lockfile, the contract sources and migrations (the migrate image owns them),
# the Prisma tooling config, and TypeScript project files. apps/backend's own
# tsconfig.json stays: Bun reads emitDecoratorMetadata from it at runtime.
RUN rm -rf \
    turbo.json apps/backend/turbo.json bun.lock \
    packages/eslint-rules \
    packages/db/prisma packages/db/migrations packages/db/prisma.config.ts packages/db/tsconfig.json \
    packages/shared/tsconfig.json packages/shared/tsconfig.build.json

# Runtime image: sources + production dependencies under an init process.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache tini wget
COPY --from=build /app ./
# Uploaded files live here; a named volume mounted on it inherits this owner, so the server can write.
RUN mkdir -p /app/apps/backend/uploads && chown bun:bun /app/apps/backend/uploads
# Bun resolves compiler options from the tsconfig.json in the working directory,
# and NestJS dependency injection relies on emitDecoratorMetadata being set there.
WORKDIR /app/apps/backend
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/v1/health" >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "run", "src/main.ts"]
