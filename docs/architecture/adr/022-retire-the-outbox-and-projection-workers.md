# 022: Retire the outbox and the projection processes

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** 012 (outbox delivery per consumer), 013 (only the `search-worker` and `links-worker` services; the three images remain)
**Depends on:** `021-everything-is-a-block.md`

## Context

The outbox existed so that two separate processes would project each page change: the search index (`SearchDocument`, `PageBlock`) and the backlinks (`PageLink`). ADR 012 made it reliable by delivering each event to each consumer, and ADR 013 brought the two workers up as their own services.

With ADR 021 those projections no longer exist:
- search reads `Block.text` and its indexes directly, and a change is found as soon as its transaction commits;
- backlinks come from `BlockLink`, which the same block transaction reconciles;
- the live channel notifies with `NOTIFY`, also on commit.

Nobody consumes the outbox events anymore. Leaving it writing would mean accumulating rows that are never processed, the debt detected when studying the model.

## Alternatives Considered

- **Keep the outbox for future consumers.**
  - PRO: the day an external consumer arrives (email, webhooks, analytics), the table already exists.
  - CON: today it writes on every change and nobody reads it, and it grows without bound. A future consumer brings its own format and delivery needs.
- **Retire the outbox, the workers and their deployment services (chosen).**
  - PRO: fewer tables, fewer processes to watch and no writes without a reader. Search and backlinks stay up to date with no lag.
  - CON: a future external consumer will have to add a delivery mechanism again.

## Decision

- `OutboxEvent`, `OutboxDelivery` and the `OutboxConsumer` enum are deleted, together with their repository, the worker startup and projection, and every event write in pages and spaces.
- The `search-worker` and `links-worker` services are deleted from `docker-compose.yml`.
- The three images from ADR 013 (`neuma-backend`, `neuma-migrate`, `neuma-portal`) remain. The backend no longer has a second startup command.
- If in the future an external system needs to be notified, it is decided in a new ADR, starting from `BlockTransaction` (which already stores every applied transaction) or from `NOTIFY`.

## Consequences

- Positive:
  - two fewer processes in every deployment;
  - no table grows without a reader;
  - what is written is found and appears in "Linked from" in the same transaction.
- Negative:
  - there is no durable queue of changes for an external consumer;
  - the migration that drops the outbox tables discards the pending events, which no longer have anyone to be delivered to.

## Governance

An external integration need is resolved with a new ADR and not by restoring the outbox out of inertia.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20 (it is not in production; changing without coexistence was authorized)
- The page-to-block converter (`blocks:migrate`) existed only for the one-time development migration and was retired together with the old model. An installation that still has pages from the previous model would lose them when applying `drop_page_model`.
