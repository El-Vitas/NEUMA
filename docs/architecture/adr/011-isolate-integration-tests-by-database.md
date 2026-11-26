# 011: Isolate integration tests with one database per run

**Status:** Accepted
**Date:** 2026-10-11
**Depends on:** `010-adopt-prisma-orm-8.md`

## Context

The backend integration tests start the full application against PostgreSQL. Until now each run created its own schema (`test_schema_<id>`), pointed to it with `?schema=` and `search_path`, and prepared it with `prisma db push` plus two SQL fixtures (the `tsvector` column and the partial index on `AgentAction`).

Prisma 8 writes the schema in every statement (`"public"."Page"`), so a schema other than `public` no longer isolates anything: all runs would write to the same tables. In addition, `db push` no longer exists, and the two fixtures duplicated what the baseline migration now does.

## Alternatives Considered

- **A contract `namespace` per worker.** PRO: keeps a single database. CON: the namespace is part of the contract; a contract would have to be generated per run. Rejected.
- **Clean the tables between tests in a shared database.** PRO: fast. CON: two simultaneous runs (for example, in parallel or in CI) step on each other, and a failure midway leaves dirty data. Rejected.
- **One database per run.** PRO: full isolation, and it is prepared with the same migrations as production. CON: creating and migrating the database costs a few seconds per run.

## Decision

Each `bun test` run creates a `neuma_test_<id>` database with the test admin user, migrates it with `prisma db migrate` (exactly what runs in production) and drops it when finished with `DROP DATABASE ... WITH (FORCE)`. The `search-projection.fixture.ts` and `agent-action-request.fixture.ts` fixtures are removed.

## Consequences

- Positive: the tests validate the real migrations on every run; several simultaneous runs do not interfere.
- Negative: the `TEST_DATABASE_ADMIN_URL` role needs the `CREATEDB` permission; each run adds the time to create and migrate the database.

## Governance

`tests/bun-setup.ts` is the only place that creates, migrates and drops the test database. A test that needs database structure must get it from a migration, never from an SQL fixture.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
