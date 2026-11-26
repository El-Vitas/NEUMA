# 021: Everything is a block, even the page

**Status:** Accepted
**Date:** 2026-10-19
**Supersedes:** 008 (the content primitive and its storage), 020 (one Yjs document per page in Hocuspocus)

## Context

Neuma stores each page as a ProseMirror document in `Page.content`, plus a Yjs state in `CollaborationSnapshot`. Blocks exist inside that document and are copied to `PageBlock` and `SearchDocument` for search (ADR 008, level 3). That model has four limits the product no longer accepts:

- a page and a block are two different things, and every capability (permissions, move, link, versions, trash) is solved twice;
- there are no per-block permissions, because whoever opens a page's document receives all of its content;
- every save rewrites the entire page, even if one letter changes;
- search and backlinks arrive with a lag, because a worker projects them afterwards.

On October 19, 2026 the replacement model was designed. A page is a `block` record of type `page`, just like a paragraph. A change is a transaction of operations over records. Each block's text has its own CRDT. A live channel announces versions, and permissions are inherited from the blocks that declare them.

## Alternatives Considered

- **Keep one document per page, with improvements (level 3).**
  - PRO: the editor and collaboration are not redone.
  - CON: the four limits remain. Page and block remain two things, and per-block permissions are impossible with a single document per page.
- **Blocks as rows with an operational transformation (OT) server, no CRDT.**
  - PRO: the server decides the order of everything.
  - CON: the concurrent text transformation has to be written, which Yjs already solves and has proven.
- **Blocks as rows, operations in transactions and Yjs per block for the text (chosen).**
  - PRO: a single entity; per-block permissions; small changes; search and backlinks in the same transaction.
  - CON: the editor, collaboration and every reader of `Page.content` are redone, and existing pages have to be migrated.

## Decision

### A single entity: `Block`

Everything that today is a `Page` or a node inside `Page.content` becomes a `Block` row.

| Field | What it stores |
|---|---|
| `id`, `spaceId`, `type` | identity and type: `page`, `paragraph`, `heading`, `toggle`, `collection` and the other types in the current content |
| `parentId` | the parent block; null on a root block of the space |
| `children` | ids of the children, in order |
| `properties` | the assembled text (text, marks and inline nodes) and the type's properties; in a collection row, its values |
| `format` | presentation: color, alignment, size, icon, cover |
| `text` | the block's plain text, for search |
| `textState` | the Yjs state of the text, only in blocks that have text |
| `permissions` | only in blocks that declare them; the others inherit |
| `alive`, `lifecycle`, `lockedAt` | existence, trash and lock |
| `version` | increases with every applied operation |
| `createdAt/By`, `editedAt/By` | authorship |

Kept from ADR 008:
- a `Space` remains the permissions boundary;
- a collection is a block of type `page` with a schema, and its rows are its children;
- a mention produces a directed link between blocks.

### A change is a transaction of operations

`POST /api/v1/transactions` receives `{ transactions: [{ id, operations }] }`. Each operation has the form `{ pointer: { table: "block", id }, path, command, args }`.

- Commands:
  - `set` and `update`, which replace or merge fields;
  - `listAfter`, `listBefore` and `listRemove`, which change `children` relative to an id;
  - `applyText`, which carries a Yjs update for the block's text;
  - `setPermission`, which changes permissions.
- Each client transaction is a Postgres transaction:
  1. it locks the rows it touches;
  2. it checks the permission of each pointer;
  3. it validates the result against the type's schema;
  4. it bumps `version`;
  5. and it applies all or nothing.
- **Conflicts:**
  - text is merged with Yjs;
  - the order of children is built with insertions relative to an id;
  - in the other fields the last writer wins, and an `expectedVersion` that does not match is recorded.
- **Safe retry.** The transaction `id` is unique: if a client resends it after a disconnect, the server answers the same and does not apply it twice.
- **Applying `applyText`** merges the update with `textState` and recomputes `properties` and `text` in the same transaction.

### What used to be a projection now goes in the same transaction

- **Search.** `text` is a column of the block, with a generated `tsvector` and a trigram index. Search runs directly on `Block`, and `PageBlock` and `SearchDocument` disappear. A change is found as soon as the transaction commits.
- **Backlinks.** The transaction that changes a block reconciles its outgoing links.
- **The outbox** remains for external or slow consumers, and what has been processed is cleaned up.

### Own live channel

A WebSocket in the backend replaces Hocuspocus.

- The client subscribes to the pages it has open.
- When a transaction commits, Postgres notifies with `NOTIFY`. The backend sends each subscriber who can read the block the applied operations and the new `version`.
- On reconnect, the client asks with `POST /api/v1/sync` for the blocks whose version it is behind on.
- Presence (which block each person is in) travels over the same channel, with expiry.

### Per-block permissions

- The effective role on a block is the one given by its nearest ancestor with `permissions`, within what the space allows.
- Any block, not just a page, can declare permissions.
- Whoever cannot read a block does not receive it, neither in the read nor on the channel. Its id is removed from `children` before responding, so its existence is not revealed.
- The current privacy rules for the space and for private pages are kept.

### Editor

ProseMirror remains the view of a page. Its document is built from the blocks, and each block node carries the id of its row. A new layer translates each editor transaction:
- structure changes (create, move, delete, change type or format) become `set`, `update` and `list*` operations;
- text inside a block is edited on its `Y.Text`, with marks as attributes and inline nodes as embeds, and travels as `applyText`.

### History

A page version is a snapshot of its subtree, taken when a burst of editing ends, just like `PageVersion` today.

### Migration

A one-time command converts each `Page` and its `Page.content` into `Block` rows, generates the `textState` from the text with its marks and keeps ids, versions and trash. A full backup runs first.

## Consequences

- Positive:
  - a page and a paragraph are moved, linked, versioned, deleted and protected the same way;
  - per-block permissions, which can go deeper than the page;
  - a change writes only what changed;
  - immediate search and backlinks, with no worker or separate copies;
  - the MCP and agents edit and cite blocks by id, as rows.
- Negative:
  - the editor (208 files), collaboration, the MCP, export, collections, history and search are redone;
  - the migration touches all existing content;
  - the layer between ProseMirror and the blocks is our own code that has to be tested thoroughly;
  - opening a page reads many rows instead of one; this is addressed with one query per subtree and an index on `parentId`.
- Accepted as a cost: while the change lasts, the old and new models coexist behind a flag, and the old model is retired only when the new one passes all tests.

## Governance

The change goes in by stages, in the order of `docs/superpowers/plans/2026-10-19-everything-is-a-block.md`, each with tests first. No stage deletes the old model until the migration is tested against a copy of the production database. The business rules that assume one document per page are replaced with `rules:add` and `supersedes` when their stage is implemented:
- BR-1e9a26a, "The live document is seeded by the server, only once";
- BR-585748e, "The page is saved from its live document".

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-19
- Approved by: El-Vitas, 2026-10-19
- Modified: 2026-10-19. The editor sends its transactions and its `sync` reads over the live channel, with the same service as the HTTP endpoints. Passing every keystroke through the Next server added a hop, and the WebSocket directly to the backend is already allowed (ADR 014). The MCP and the server actions keep using HTTP.
- Modified: 2026-10-24. An `expectedVersion` that does not match is no longer just recorded. In a row's cells and when moving a row (`PATCH …/properties` and `PATCH …/move`), the server compares it inside the row lock and answers 409 `PAGE_VERSION_CONFLICT` without writing anything. The portal shows the conflict in the rejected panel, with "Retry" so that the person's value wins (ADR 029).
