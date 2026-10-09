# Search Projection Worker — Operations

The search projection worker (`SearchProjectionWorker`, entrypoint
`src/modules/search/infrastructure/worker/search.worker.main.ts`) drains the
outbox (`OutboxEvent` table, written transactionally by pages/databases/spaces
repositories) and projects each event into the `SearchDocument` full-text
index that the portal search and the `search_neuma` MCP tool read
from.

## 1. Start PostgreSQL

From the repo root, using the committed example env file (copy it to `.env`
first if you don't already have one — never commit real credentials):

```bash
docker compose --env-file .env.docker.example up -d postgres
docker compose --env-file .env.docker.example ps
```

The `postgres` service has a `pg_isready` healthcheck; wait until `ps` reports
`healthy` before continuing.

## 2. Run migrations

Migrations live in `packages/db/prisma/migrations` and are the source of
truth for the schema — including the raw SQL for the `pg_trgm`/`unaccent`
extensions and the generated `searchVector` column that full-text search
depends on. Apply them with the owner (`MIGRATION_DATABASE_URL`) role:

```bash
cd packages/db
bun run db:migrate:deploy
```

For local iteration against the dev schema (not test schemas) you can instead
use `bun run db:migrate` (creates a new migration if the schema drifted) or
`bun run db:push` (schema-only sync, no migration history — note that `db
push` cannot express the generated `searchVector` column, so it is only
suitable for models that don't rely on raw-SQL migration content).

## 3. Start the worker

From `apps/backend`, with `DATABASE_URL` pointing at the same database the
backend API uses (see `.env`, not committed):

```bash
bun run search:worker
```

This runs `src/modules/search/infrastructure/worker/search.worker.main.ts`
directly with Bun (see the `search:worker` script in
`apps/backend/package.json`). It boots a Nest application context (no HTTP
server), then loops: claim a batch of outbox events
(`OUTBOX_MAX_CLAIM_BATCH_SIZE` per batch), project each one, sleep
`SEARCH_WORKER_IDLE_DELAY_MS` when a batch is empty, repeat.

## 4. Verify projections are flowing

- Create or update a page/database record/space through the backend API —
  each write inserts an `OutboxEvent` row in the same transaction as the
  domain write.
- Watch the worker's stdout: every claimed batch results in either a search
  document upsert or a removal; no per-event log line is emitted on success
  (only startup, shutdown, and failures are logged — see below), so the
  practical way to verify a specific event was projected is to query the
  search endpoint (`GET /api/v1/search?query=...`, JWT-protected) or inspect
  the `SearchDocument` table directly.
- To confirm the outbox is draining, check the `OutboxEvent` table: rows with
  `status = 'PENDING'` and `nextAttemptAt` in the past should disappear
  (become `PROCESSED`) within one worker idle cycle (`SEARCH_WORKER_IDLE_DELAY_MS`,
  currently 1 second).

## 5. Reading the logs

The worker logs exclusively through Pino, to stderr (`pino.destination(2)`),
as structured JSON — never `console.log`. Expected lines:

- `"Search projection worker started"` — emitted once, right after the Nest
  application context is created successfully. If PostgreSQL is unreachable
  or a required env var (validated by `env.schema.ts`) is missing, the
  application context creation throws **before** this line is logged; the
  failure is instead logged by the top-level `.catch()` as `"Search
  projection worker terminated with an error"` with the underlying error
  (including its message/stack) attached, and the process exits with code 1.
- `"Search projection worker stopping"` — emitted once a `SIGINT`/`SIGTERM`
  is received, with the signal name. The worker finishes the batch currently
  in flight (each event is fully committed — either `PROCESSED`, retried, or
  `FAILED` — before the loop checks the stop flag again), so no outbox event
  is left in a half-processed state on shutdown.
- `"Search projection worker stopped"` — emitted once the Nest application
  context has closed (`application.close()`), right before the process
  exits cleanly.
- `"Search projection worker failed"` — emitted if the claim/project loop
  itself throws (as opposed to a single event's projection failing, which is
  handled per-event via retry/failure below). The worker then shuts down via
  the same `finally` path and the process exits with code 1.

## 6. Failure modes

| Symptom | Cause | What to check |
|---|---|---|
| Process exits immediately with `"Search projection worker terminated with an error"` and no `"started"` line | PostgreSQL unreachable, or a required env var is missing/invalid | Confirm `docker compose ... ps` shows `postgres` healthy; confirm `DATABASE_URL` and the other vars required by `env.schema.ts` are set |
| Worker runs but a specific event never leaves `PENDING` | The event's projection keeps throwing (e.g. malformed page content) | Inspect `OutboxEvent.lastError` for that row — the worker stores a redacted, truncated error message there via `markRetryable`/`markFailed` |
| An event moves to `status = 'FAILED'` | The event exceeded `SEARCH_OUTBOX_MAX_ATTEMPTS` retries | This is a poison message; it stops being retried automatically. Investigate `lastError`, fix the underlying data/code, and re-queue manually if needed |
| Worker exits cleanly but stops mid-run unexpectedly | `SIGINT`/`SIGTERM` was sent (e.g. by an orchestrator or `Ctrl+C`) | Expected — check for the `"stopping"` → `"stopped"` log pair; this is a graceful shutdown, not a crash |
