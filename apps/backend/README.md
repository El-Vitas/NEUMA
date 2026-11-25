# @neuma/backend

Neuma's HTTP API: NestJS 11 on **Fastify**, on the **Bun runtime**, with no build step (Bun runs the TypeScript directly). Persistence with **Prisma ORM 8** on PostgreSQL. It is part of the monorepo (Bun + Turborepo), and **Bun** is package manager, runtime and test runner at once.

## Requirements

- Bun 1.4.2 or higher (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL 18 reachable at the `DATABASE_URL` (by default `localhost:5432`)

## Setup

```bash
bun install                                      # from the monorepo root
cp apps/backend/.env.example apps/backend/.env   # and fill in the values
bun run --filter @neuma/db db:migrate:deploy     # adopts a Prisma 7 database if needed and applies migrations
```

The already emitted Prisma contract is committed in `packages/db/src/contract`, so there is nothing to generate.

## Scripts

```bash
bun run dev            # bun --watch src/main.ts  → http://localhost:3000
bun run start          # bun src/main.ts (production)
bun run test           # bun test (unit + integration; requires Postgres)
bun run check          # depcruise + biome + eslint + tsc --noEmit (TS 7)
```

There is no `build`: in production `bun src/main.ts` is run directly. It is a single process: search and "Linked from" read the blocks, with no separate processes.

## Architecture

- **HTTP:** Fastify (`@nestjs/platform-fastify`). File uploads with `@fastify/multipart`.
- **Auth:** JWT (Bearer). Passwords with `Bun.password` (bcrypt, compatible with existing `$2b$` hashes).
- **Data:** Prisma ORM 8 (`@prisma/orm-postgres`), with the contract and migrations in `packages/db`.
- **Search and backlinks:** they come from `Block` and `BlockLink`, which the same block transaction keeps up to date (ADR 021 and 022).
- **Tests:** `bun test` against a fresh database per run, migrated with the same migrations as production. Conventions in `apps/backend/AGENTS.md`.

The architecture decisions (Bun, Fastify, `Bun.password`, `bun test`, TypeScript 7, Prisma 8, test isolation) are in `docs/architecture/adr/`.
