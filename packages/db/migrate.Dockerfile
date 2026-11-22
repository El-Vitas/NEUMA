# syntax=docker/dockerfile:1
# Migration image. Applies the Prisma migrations once and exits — used as an
# init/one-shot step before the backend starts. A database Prisma 7 created is
# adopted first (see scripts/migrate-deploy.ts). `turbo prune` reduces the
# monorepo to the @neuma/db subgraph so the image carries only the contract,
# the migrations and the Prisma CLI.

FROM docker.io/oven/bun:1.4.5-alpine AS base
WORKDIR /app

# Extract the db subgraph: pruned manifests + lockfile land in out/json,
# pruned sources in out/full. turbo is a glibc binary, so Alpine needs libc6-compat.
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN bun install -g turbo@2.11.7
COPY . .
RUN turbo prune @neuma/db --docker

# Install @neuma/db with its development dependencies, because the Prisma CLI is
# one (the server images must not carry it), then drop what applying migrations
# never reads. The trim runs in this stage (not the runner) so the runner copies an
# already-clean tree — a rm in the final stage only adds a whiteout and keeps the
# bytes. The emitted contract under src/contract stays: the CLI checks the
# database against it.
FROM base AS build
COPY --from=pruner /app/out/json/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --filter @neuma/db
COPY --from=pruner /app/out/full/ ./
# The CLI also ships Prisma Compute's deploy tooling and a local dev database; it only
# loads them for `prisma deploy` and `prisma dev`, never to sign or migrate.
RUN rm -rf \
    node_modules/.bun/alchemy@* \
    node_modules/.bun/@distilled.cloud+* \
    node_modules/.bun/@cloudflare+workerd* \
    node_modules/.bun/@electric-sql+pglite@* \
    bun.lock turbo.json \
    packages/db/src/client.ts packages/db/src/errors.ts packages/db/src/index.ts \
    packages/db/src/constants packages/db/src/types \
    packages/db/tsconfig.json packages/db/prisma/seed

FROM base AS runner
ENV DO_NOT_TRACK=1
COPY --from=build /app ./
WORKDIR /app/packages/db
# Applying migrations only reads these files and talks to Postgres, so it needs no root.
USER bun
# Migrations run DDL, so they connect as the DB owner via MIGRATION_DATABASE_URL
# (falling back to DATABASE_URL). The backend runtime uses a least-privilege role.
CMD ["bun", "scripts/migrate-deploy.ts"]
