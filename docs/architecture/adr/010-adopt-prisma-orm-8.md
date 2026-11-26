# 010: Adopt Prisma ORM 8 with its own contract and migrations

**Status:** Accepted
**Date:** 2026-10-11

## Context

Prisma ORM 8 is not a new version of Prisma 7: it is a different tool. It changes the query API (`db.orm.public.Page.where(...).first()` instead of `prisma.page.findUnique(...)`), the schema becomes a "contract" (`// use prisma-8`), migrations are `migration.ts` files that compile to `ops.json`, and `@prisma/client`, `@prisma/adapter-pg`, `generate`, `migrate deploy` and the `P2002`/`P2025` codes go away. As of this decision, the PostgreSQL client (`@prisma/orm-postgres`) is still a release candidate (`8.0.0-rc.17`, CLI `8.0.0-rc.22`); Prisma announces the final release for October 2026 and keeps supporting Prisma 7 for 18 months after that.

We decided to migrate now instead of waiting for the final release, knowing that it forces a rewrite of the whole data layer and a data migration on existing databases.

Facts that constrain the design, all verified with a prototype and against the official documentation:

- The date columns created by Prisma 7 are `timestamp(3)` without time zone. Prisma 8 reads them as text; its date type (`DateTime`) is `timestamptz`.
- The contract cannot represent two things that search needs: generated `tsvector` columns and trigram indexes with an operator class (`gin_trgm_ops`). Introspection discards the operator class, so those indexes would never verify.
- Prisma 7 created uniqueness as unique indexes, not as constraints. `upsert({ conflictOn })` only accepts columns of a `@@unique` constraint.
- All generated SQL names the schema (`"public"."Page"`).
- An existing database is adopted with `prisma db sign`, which refuses to sign if the schema does not exactly match the contract.

## Alternatives Considered

- **Stay on Prisma 7.10 until the final release of Prisma 8.** PRO: no risk of changes between release candidates; Prisma 7 has guaranteed support. CON: the migration stays pending, and it is just as large with or without the final release. Rejected by product decision.
- **Read the Prisma 7 `schema.prisma` from Prisma 8 (`prisma7Schema(...)`).** PRO: a single schema file during the transition. CON: it fails with `Unsupported("tsvector")` fields and leaves dates as text. Rejected.
- **Type dates as `DateTime` (`Temporal.Instant`).** PRO: the type Prisma 8 proposes by default. CON: it forces replacing `Date` with `Temporal` across the domain, the DTOs and the tests. Rejected in favor of `TimestamptzJsDate`, which reads `timestamptz` as `Date` with the same millisecond precision Prisma 7 had.
- **Rewrite search with the ORM and `@@fullTextIndex`.** PRO: less raw SQL. CON: it does not support the language-weighted vector or the accent-insensitive trigram indexes; it would change the ranking. Rejected: search stays in raw SQL with `db.raw.sql`.

## Decision

We will use Prisma ORM 8 (`prisma` and `@prisma/orm-postgres`) as the only data access layer. Specifically:

1. **Hand-written contract** in `packages/db/prisma/{models,enums}`, one file per model and per enum, with the exact names of the tables, constraints and indexes that already exist. Enums are `native_enum` to keep the PostgreSQL types. Dates are `TimestamptzJsDate`, and `updatedAt` is `temporal.updatedAtJsDate()`.
2. **What the contract cannot express lives in SQL inside the baseline migration**: the `unaccent` and `pg_trgm` extensions, the `immutable_unaccent` function, the generated `tsvector` columns and their GIN indexes, and the trigram indexes. `db verify` without `--strict` tolerates those extra elements.
3. **Migrations** in `packages/db/migrations/app`:
   - `baseline` reproduces exactly the schema Prisma 7 left behind, checked by comparing `pg_dump` output;
   - `timestamps_with_time_zone` converts the dates with `USING column AT TIME ZONE 'UTC'` (Prisma 7 always stored UTC), makes the four list columns required, and normalizes JSON `null`s to SQL `NULL`;
   - `unique_constraints` promotes the unique indexes to constraints with `ADD CONSTRAINT ... USING INDEX`, without rebuilding them.
4. **Automatic adoption of Prisma 7 databases**: `packages/db/scripts/migrate-deploy.ts` signs the database at the baseline state if it finds `_prisma_migrations` and does not find the Prisma 8 marker, and then applies whatever is pending.
5. **`@neuma/db` exposes a minimal API**: `createNeumaDatabase`, `NeumaDatabase`, `NeumaTransaction`, the enums as `as const` objects with a type of the same name, `isUniqueViolation` (by `sqlState` 23505) and the JSON types. In the backend, `PrismaService` wraps the client with `models`, `modelsFor(transaction)`, `transaction`, `sql`, `tables` and `runner`.

## Consequences

- Positive: a single Prisma version, no generated client in `src/generated` (the emitted contract is committed), time-zone-aware dates in the database, and atomic `upsert` on any uniqueness.
- Negative:
  - The API is a release candidate: details can change from one rc to the next and code will need adjusting.
  - Some features Prisma 7 had are missing. `increment` is replaced by raw SQL, nested updates by separate writes in a transaction, isolation levels by `SET TRANSACTION`, and an `update` that finds no row returns `null` instead of throwing, so each case throws its own error with context.
  - Raw SQL does not accept interpolated `Date`, arrays or `null`: they are passed as `toISOString()::timestamptz`, as a JSON list (`buildSqlTextList`) or as `NULL::type` written in the statement.
  - Prisma 8 has no Studio or seed command; the seed is a script that creates its own client.
- An existing deployment requires no manual steps: the migrations image adopts it.

## Governance

- Every schema change is: edit the contract, `bun run db:generate` (`contract emit`), `bun run db:migrate --name <name>` (`migration plan`), review `migration.ts`, recompile it with `node migrations/app/<dir>/migration.ts` and commit the folder, the snapshot and the `db` reference.
- `prisma migration check` must pass; a migration that deletes or converts data is reviewed by hand before committing, because `db migrate` applies destructive operations without asking.
- When the final version of Prisma 8 ships, `prisma` and `@prisma/orm-postgres` are updated and their changelog is reviewed against the points in this ADR.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
- Sources: the official guides "Coming from Prisma ORM 7", "Migrate from Prisma ORM 7 to 8 (PostgreSQL)", "Release status", and the ORM client and raw query reference.
