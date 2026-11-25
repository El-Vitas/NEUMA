# 012: Deliver each outbox event to each consumer separately

**Status:** Superseded
**Superseded by:** 022
**Date:** 2026-10-11
**Depends on:** `010-adopt-prisma-orm-8.md`

## Context

Page changes are announced through an outbox: in the same transaction that saves the page, an `OutboxEvent` is written, and separate processes project it. There are two projections, each in its own worker: the search index and the backlinks ("Linked from").

Both read the same table, and the processing state (`status`, `attemptCount`, `nextAttemptAt`, `lastError`) lived on the event. The first worker to take an event marked it `PROCESSED` and the other never saw it again. With both running, as in Docker and podman, each change reached only one projection: a renamed page might not be found by its new title, or a new mention might not show up in "Linked from". This was verified in development since August 2026.

## Alternatives Considered

- **A single worker that applies both projections to each event.** PRO: no schema change. CON: a failure in one projection also retries the other, they cannot be scaled or deployed separately, and a third projection becomes coupled again. Rejected.
- **A `consumer` column on the event, with one event per consumer.** PRO: a single table. CON: it duplicates the event payload per consumer and mixes the fact with its processing. Rejected.
- **A deliveries table per consumer.** PRO: the event stays immutable; each consumer has its own state, retries and failures; adding a consumer means adding a value. CON: one more table and a `JOIN` when claiming.

## Decision

We will use `OutboxDelivery`: one row per event and consumer (`OutboxConsumer`: `SEARCH`, `LINKS`), unique by `(eventId, consumer)`, holding the processing state that used to be on the event. `OutboxEvent` remains the record of the fact and loses its state columns.

- When an event is created, its deliveries are created in the same statement (`OUTBOX_CONSUMERS`), so no consumer can miss it.
- Each worker receives `OutboxRepository.forConsumer(consumer)` by injection and only claims its own deliveries, with `FOR UPDATE SKIP LOCKED` and the same lease as before.
- The `outbox_deliveries_per_consumer` migration creates one delivery per consumer for each existing event. Failed events keep their failure; all others are left pending for both consumers, because before the change a "processed" event may have reached only one. Projecting them again is safe: search compares versions and backlinks are reconciled against the page's current state.

## Consequences

- Positive: each projection receives all changes; a search outage no longer delays backlinks, or the other way around.
- Negative: when upgrading from a previous version, the workers reprocess once all events pending delivery; with a large history that takes time, although the result is idempotent.

## Governance

A new projection adds its value to `OutboxConsumer` (contract and migration), its entry in `OUTBOX_CONSUMERS` and its token with `forConsumer`. Business rule `BR-ac6957c` describes the expected behavior, and `tests/integration/outbox.integration.spec.ts` verifies it.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
