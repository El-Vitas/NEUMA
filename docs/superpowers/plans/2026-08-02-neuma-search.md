# Neuma Search Implementation Plan

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Deliver private, bilingual PostgreSQL full-text search for pages and database records, with ranking, tags, filters, permissions, incremental projections, and MCP access.

**Architecture:** Search reads a denormalized `SearchDocument` projection. PostgreSQL owns full-text parsing, GIN indexing, ranking, trigram matching, and snippets. Domain mutations emit durable `OutboxEvent` records; a worker projects them idempotently. Portal and MCP call one search use case and never query Prisma directly.

**Tech Stack:** PostgreSQL, Prisma 7, `tsvector`, `websearch_to_tsquery`, `ts_rank_cd`, `pg_trgm`, `unaccent`, NestJS/Fastify, Bun, MCP SDK.

---

## Slice Order

### Slice 1: Search storage foundation

**Files:**

- `packages/db/prisma/models/search-document.model.prisma`
- `packages/db/prisma/enums/`
- `packages/db/prisma/migrations/`
- Search-specific backend types only if they do not overlap the query slice
- Tests for schema/index expectations

**Deliverable:** Search documents support pages and database records through `sourceType/sourceId`, with generated `tsvector`, GIN/trigram indexes, `unaccent`, bilingual language metadata, indexing state, and stable version markers.

### Slice 2: Full-text query API

**Files:**

- `apps/backend/src/modules/search/`
- `apps/backend/tests/unit/modules/search/`
- Search integration tests where PostgreSQL FTS is required

**Deliverable:** Authenticated search use case and `GET /search` endpoint with query text, title/body ranking, tags, space/content-type/status/date filters, permission predicates, snippets, cursor pagination, and stable ordering.

### Slice 3: Outbox projection worker

**Files:**

- `apps/backend/src/common/infrastructure/persistence/outbox.repository.ts`
- `apps/backend/src/modules/search/infrastructure/worker/`
- `apps/backend/src/modules/search/search.module.ts`
- Page/database event integration files only where needed for projection payloads
- Worker tests

**Deliverable:** Claim/retry/complete outbox events with bounded backoff, project current page/database content into SearchDocument, ignore stale version events, and expose operational failure state.

### Slice 4: MCP search tool

**Files:**

- `apps/backend/src/modules/mcp/`
- `apps/backend/src/app.module.ts` only for injecting SearchService into the existing MCP dependency boundary
- MCP tests

**Deliverable:** Add `search_neuma` to the read-only MCP server using the same authorized SearchService, bounded schemas, structured results, snippets, and safe errors.

## SearchDocument Contract

- `sourceType`: `PAGE` or `DATABASE_RECORD`.
- `sourceId`: stable source identifier.
- `spaceId`: authorization/filter boundary.
- `title`: weighted highest.
- `extractedText`: structured body/properties text.
- `language`: `en`, `es`, or null fallback.
- `tags`: normalized JSON tags.
- `properties`: normalized filter metadata.
- `contentType`: `PAGE`, `TASK`, `PROJECT`, or future type.
- `versionMarker`: source version used for idempotency.
- `indexingState`: pending/processing/indexed/failed.
- `searchVector`: generated PostgreSQL `tsvector` using `simple` fallback and language-aware configuration where supported.

## Query Rules

- Use parameterized raw SQL only where Prisma cannot express PostgreSQL FTS; select explicit columns.
- Use `websearch_to_tsquery` for user text.
- Weight title/headings above body.
- Use `ts_rank_cd` for relevance then updated time and id for stable ties.
- Use `pg_trgm` for partial/typo fallback only when FTS returns no useful matches.
- Normalize accents with `unaccent`.
- Apply space membership/visibility predicates before result projection.
- Tags and properties are exact filters, not string interpolation.
- Return snippets/highlights from the indexed projection.
- Cursor pagination must use a stable tuple, not offset-only pagination.

## Verification

- Write RED tests for FTS matching, bilingual text, ranking, tags, snippets, permissions, stale events, retries, and MCP schemas.
- Run focused tests before implementation and confirm expected failures.
- Run full backend and portal tests after API/MCP changes.
- Run PostgreSQL migration and integration tests against local Docker PostgreSQL.
- Run root `bun run check` with zero code warnings/errors.
- Run root `bun run build`.
- Read every changed file after each slice.
- Run a fresh consolidation pass for duplicate search adapters, filters, permission predicates, and text extraction.

## Deferred

- Embeddings and semantic search.
- External search engines.
- Search analytics and freshness scoring.
- Public search API keys.
