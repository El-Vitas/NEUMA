# AGENTS.md — DB

> Database package conventions. Inherits all standards from `AGENTS.md` at the repo root.

## Stack

- Prisma 7 (PostgreSQL, driver adapter)
- TypeScript strict
- bun

## Schema Organization

Multi-file Prisma schema. Each entity and enum lives in its own file.

### Naming

Prisma schema files follow the same dot-separated convention as the rest of the monorepo (no kebab-case):

| Type | Pattern | Examples |
|---|---|---|
| Schema entry | `schema.prisma` | generator + datasource only |
| Model | `{entity}.model.prisma` | `user.model.prisma` |
| Enum | `{name}.enum.prisma` | `user-role.enum.prisma` |
| Seed | `{domain}.seed.ts` | `users.seed.ts` |

### Rules

- **One model per file.** A model file contains exactly one `model` block.
- **One enum per file.** An enum file contains exactly one `enum` block.
- **Import enums by name.** Models reference enums by their Prisma name (`UserRole`). Prisma resolves cross-file references automatically.
- **No `@@map` or `@map`** unless the DB column name must differ from the Prisma field name. Default to Prisma conventions.
- **Indexes at the bottom** of the model file, grouped after all relations.

## Client

- **`src/client.ts`** exports `PrismaClient` — a thin wrapper around the generated client with the `PrismaPg` driver adapter.
- **One instance per request/context.** Let NestJS (or the consumer) manage the lifecycle via DI.
- **Generated types** (`src/generated/`) are gitignored. Re-generate with `bun run db:generate`.

## Seeds

- **One file per domain** in `prisma/seed/`, plus `main.seed.ts` as the entry point.
- **Idempotent.** Each seed checks for existing data before inserting.
- **Deterministic.** Seed the same data every time — no random values in seed scripts.
