# syntax=docker/dockerfile:1
# Migration image. Runs `prisma migrate deploy` once and exits — used as an
# init/one-shot step before the backend starts. `turbo prune` reduces the
# monorepo to the @company-brain/db subgraph so the image carries only the Prisma
# schema, migrations and client, nothing else.

FROM docker.io/oven/bun:1.3-alpine AS base
WORKDIR /app

# Extract the db subgraph: pruned manifests + lockfile land in out/json,
# pruned sources in out/full. turbo is a glibc binary, so Alpine needs libc6-compat.
FROM base AS pruner
RUN apk add --no-cache libc6-compat
RUN bun install -g turbo@2.9.14
COPY . .
RUN turbo prune @company-brain/db --docker

# Install production dependencies, then prune what `migrate deploy` never uses.
# The trim runs in this stage (not the runner) so the runner copies an already-
# clean tree — a rm in the final stage only adds a whiteout and keeps the bytes.
# The Prisma CLI is monolithic (it eagerly loads Studio/dev modules even for
# `migrate deploy`), so its dependency tree must stay intact. Only the Prisma
# client — which the CLI never imports — and the workspace's own generated client
# and build config are safe to drop.
FROM base AS build
COPY --from=pruner /app/out/json/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
RUN rm -rf \
    node_modules/.bun/@prisma+client@* \
    bun.lock turbo.json \
    packages/db/src packages/db/tsconfig.json packages/db/prisma/seed

FROM base AS runner
COPY --from=build /app ./
# Migrations run DDL, so they connect as the DB owner via MIGRATION_DATABASE_URL
# (falling back to DATABASE_URL). The backend runtime uses a least-privilege role.
CMD ["sh", "-c", "DATABASE_URL=\"${MIGRATION_DATABASE_URL:-$DATABASE_URL}\" bun run --filter @company-brain/db db:migrate:deploy"]
