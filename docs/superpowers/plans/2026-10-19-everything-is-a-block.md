# Plan: everything is a block

Implements ADR 021 on the `refactor/bloques-planos` branch. Each stage closes with:
- its tests written before the code;
- `bun run check` at zero;
- the backend and portal tests green;
- one commit per stage.

The old model keeps working behind the `NEUMA_BLOCK_MODEL` flag until stage 7.

## Status

All seven stages are done on `refactor/bloques-planos` (last commit `0f4347a`). What changed with respect to the plan:

- The flag was removed: the application is not in production, so it was switched over without coexistence with the old model. `NEUMA_BLOCK_MODEL` no longer exists, and the editor flag `NEXT_PUBLIC_BLOCK_EDITOR` only survives in one test of the environment schema.
- The migration command was removed in `db98aef`, after migrating, because it read tables that no longer exist.
- Search, backlinks and the MCP moved to reading `Block` in stage 5. `PageLink` was replaced by `BlockLink`, which reconciles in the same block transaction.
- ADR 022 retired the outbox and the two workers, instead of only cleaning up what was processed.
- The search filter by tags (`tags`) and `POST /maintenance/pages/blocks` no longer exist.
- Transactions also travel over the live socket (10/19 note in ADR 021), with the same service as `POST /api/v1/transactions`.
- The order of top-level pages lives in the space (`Space.rootPageIds`).

## Stage 1 · The `Block` model and reading it

Status: done (`d724df6`). Besides `Block` there are `BlockLink` and `BlockTransaction`; reading is `POST /api/v1/sync`.

- Prisma model `Block` with the ADR's fields. Indexes on `(spaceId)`, `(parentId)`, a generated `tsvector` over `text` and a trigram over `text`.
- Zod schema per block type in `packages/shared`, taken from the current `PageContent` schema, node by node: the same type with the same constraints.
- Effective role: nearest ancestor with `permissions`, within what the space allows. A pure function with tests for inheritance, for private blocks and for blocks hidden from a reader.
- `POST /api/v1/sync`: returns the requested blocks, or a page's subtree, with each one's role, and without the children the reader cannot see.
- Tests:
  - permission inheritance;
  - reading a subtree;
  - hiding children;
  - a single query per subtree.

## Stage 2 · Transactions

Status: done (`e550b30` transactions and `3e88578` block types, applied transactions and links). The seven commands in the plan are there; the backend adds internal page commands (trash, lock, verification, owner, move to the space root) that a client cannot send. A deadlock is retried up to three times.

- `POST /api/v1/transactions` with the commands `set`, `update`, `listAfter`, `listBefore`, `listRemove`, `applyText` and `setPermission`.
- One Postgres transaction per client transaction:
  1. row locking;
  2. permission per pointer;
  3. validation per type;
  4. `version` that goes up;
  5. all or nothing.
- `applyText`: merges the Yjs update with `textState` and recalculates `properties` and `text`.
- Outgoing links reconciled in the same transaction.
- Safe retry by transaction id.
- `NOTIFY block_versions` on commit.
- Tests:
  - each command;
  - a rejected permission rolls back the whole transaction;
  - two concurrent `applyText` merge;
  - a retry does not apply twice;
  - a locked or trashed page is not written (BR-80536e4, BR-c9aaeaa).

## Stage 3 · Live channel

Status: done (`1289f0a` versions and presence channel, `2b58b82` `transactions` and `sync` requests over the channel). The channel is `/api/v1/blocks/live`, with a short token requested from `POST /api/v1/blocks/live/token`. Besides versions and presence, it handles `transactions` and `sync` over the same socket.

- WebSocket in the backend: subscription per page, sending the applied operations to each subscriber who can read the block, and presence with expiry.
- On reconnect, `sync` by version.
- Tests:
  - a reader without permission does not receive the operation;
  - a reconnection recovers what was lost;
  - presence expires.

## Stage 4 · Editor

Status: done (`2b58b82` conversion between document and blocks, `854c0a7` editor, `1fd346c` cursor and anchor fixes). The client lives in `apps/portal/modules/pages/block-sync/`. It first shipped behind `NEXT_PUBLIC_BLOCK_EDITOR`, which was removed along with the rest of the coexistence.

- The ProseMirror document is built from the page's blocks.
- Translation layer:
  - structure to `set`, `update` and `list*` operations;
  - each block's text to its `Y.Text`, with marks as attributes and inline nodes as embeds, which travels as `applyText`.
- Client transaction queue: retries, confirms and undoes.
- Remote operations are applied without moving the cursor of whoever is typing.
- Tests:
  - each block type round trip;
  - undo and redo;
  - two clients writing in the same block;
  - moving a block with its subtree;
  - pasting.

## Stage 5 · Content readers and writers

Status: done, without a commit of its own. It arrived inside `db98aef` (and `03fc74e` adjusted the page references, with the search worker still alive). Search reads `Block` directly (word, within word, accents, ranking, snippets, filters, permissions). Backlinks come from `BlockLink` and count only mentions, after filtering by permissions. The MCP reads and writes per block. Versions are cut by editing streak (250 ms pause, 2 s at most). The trash is per page block.

- MCP: read and edit per block, now as operations.
- Export, collections and views, version history, trash and deferred purge, templates, synced blocks and subpages.
- Search over `Block` instead of `PageBlock` and `SearchDocument`.
- Tests: the ones that already exist for each, plus those for per-block permissions on every read.

## Stage 6 · Migration

Status: done (`414d3fb`). The one-off command was removed after running it; it is not left in the repository.

- One-off command: `Page` and `Page.content` become `Block`, with the generated `textState` and the ids, versions and trash preserved.
- It is tested against a copy of the development database and then against a copy of the production one.
- Full backup before running it.
- Before converting, a check that lists and halts the migration in two cases:
  - a toggle summary with something that looks like an HTML tag, which a block's text does not allow (there are 0 in the development database);
  - a block id repeated between two pages, for example in a duplicated page, which is reassigned a new id and its links and comments are rewritten.
- Tests: each node of the current schema converted and rebuilt without losing anything.

## Stage 7 · Retiring the old model

Status: done (`db98aef` retirement of the old model, `c47fbf9` ADR 022 and business rules, `0f4347a` a single way to resolve who reads a block). It went further than the plan: ADR 022 deletes the outbox and the worker services, instead of cleaning up what was processed. `BlockLink` remains for links, and `PageVersion`, `PageSchemaProperty` and `PageSchemaView` on top of `Block`.

- Removed:
  - `Page.content`;
  - `CollaborationSnapshot`, `PageBlock` and `SearchDocument`;
  - Hocuspocus and `y-prosemirror`;
  - the search worker and the backlinks worker;
  - the flag.
- The outbox is cleaned of what was processed.
- Updated:
  - the architecture diagrams;
  - rules BR-1e9a26a and BR-585748e, replaced with `rules:add`.

## Risks watched at each stage

- **Performance when opening a large page:** measured with a page of 2,000 blocks.
- **Text fidelity:** marks and inline nodes inside `Y.Text`, round trip.
- **Leaks:** no endpoint or channel message returns a block the reader cannot see.
