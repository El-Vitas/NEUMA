# Neuma Current Scope

This is the only scope that is allowed to receive implementation work in the current product phase. Anything not listed here belongs in `docs/scope/future-scope.md` and must not be treated as an unfinished task.

## Product Boundary

- One company workspace per deployment.
- Internal employees only.
- Email/password authentication.
- Existing persisted roles mapped to admin/editor/viewer capabilities.
- Spaces with public-internal and restricted visibility.
- Everything is a block (ADR 021): a page is a `Block` of type `page`, and a paragraph, a heading or a collection row is a `Block` row too.
- Per-block permissions: any block may declare them, the rest inherit from the nearest ancestor that does, within what the space allows.
- Hierarchical pages with versioning and trash/restore. Versions are cut per editing stretch and trash applies to a page block with its subtree. The top-level pages of a space are ordered on the space itself.
- Pages and spaces carry a mark — an emoji, an uploaded image, or one of the icon library's symbols in a chosen colour — set from the page header or from the tree's own menu, which also renames without opening. Page covers are delivered: set from the page header (`appearance/components/pages.cover.field.tsx`, `pages.cover.menu.tsx`, `hooks/use.pages.cover.ts`), mounted by `editor/components/pages.editor.tsx`, and stored through `PATCH /spaces/:spaceId/pages/:pageId/cover`.
- Every screen works from 320px up: one sidebar that folds, and no page that scrolls sideways.
- Structured ProseMirror editor, built from the page's blocks.
- Block transactions: every change is a transaction of operations over block rows (`POST /api/v1/transactions`, or the same messages over the live socket), applied all or nothing.
- Configurable collections with Tasks/Projects templates, contributing a typed property schema and views over pages.
- Table, board, list, gallery, calendar and chart views delivered (`apps/portal/modules/pages/collections/components/pages.collection.view-registry.tsx` and the `pages.collection.{board,list,gallery,calendar,chart}*.tsx` components; backend enum `DatabaseViewType`). Timeline has no code and is not part of the current completion pass.
- Page mentions and backlinks: a persisted link graph between blocks (`BlockLink`), reconciled in the same transaction that changes the block. Backlinks list mentions only and are counted after permission filtering.
- PostgreSQL full-text search directly over `Block`: whole word, inside a word, accents, ranking, snippets, filters, permissions, and MCP search. There is no `tags` filter.
- Local filesystem file assets behind a storage abstraction.
- Live editing over the backend's own channel `/api/v1/blocks/live`: block versions and presence, with per-block text merged as Yjs updates (`applyText`). Hocuspocus is gone.
- English-first portal with Spanish catalog support.

## Module Status And Remaining Files

### `auth`

Status: delivered.

Remaining files: none for the current scope.

### `workspaces`

Status: delivered.

Remaining files: none for the current scope.

### `spaces`

Status: delivered. The space owns the order of its top-level pages (`Space.rootPageIds`).

Remaining files: none for the current scope.

### `pages`

Status: pages are `Block` rows of type `page`; editor over blocks, versioning, trash, live editing and attachment primitives delivered. `Page` and `Page.content` no longer exist.

Remaining files and changes: none recorded here. Staging and state of the block model live in `docs/superpowers/plans/2026-10-19-everything-is-a-block.md`.

### `databases`

Status: generic definitions, typed properties, records, Tasks/Projects templates, permissions, and portal views (table, board, list, gallery, calendar, chart) delivered.

**Model change delivered.** Per `docs/architecture/adr/008-adopt-single-page-primitive.md` and `docs/architecture/adr/021-everything-is-a-block.md`, this module dissolved into the block model:

- a record is a **page block**;
- a database is a **page block that carries a schema**, and its rows are that page's child pages, so membership is plain `parentId`, with no `collectionId` column and no separate collection entity;
- `Database` and `DatabaseRecord` are gone; the schema lives in `PageSchemaProperty` and `PageSchemaView`, keyed by the owning page block.

The typed property engine, the Tasks/Projects templates and the table/board grouping logic survive on top of that storage. A request for versioning, trash, permissions or live editing on records needs no new capability: rows are pages and already have them.

Remaining files: none for the currently accepted minimum. Timeline is part of the agreed data-view scope only when explicitly started as its own module slice.

### `links`

Status: delivered. Introduced by ADR-008, rebuilt on blocks by ADR-021 and ADR-022.

Owns the mention node, the `BlockLink` graph and the backlinks read. The transaction that changes a block reconciles its outgoing links, so a mention shows up in "Linked from" when the transaction commits; there is no projection worker. Reads filter by the requesting user's access to blocks before counting, so the graph never discloses the existence of unreadable pages. Backlinks list mentions only; subpage, collection and synced-block links are stored but not listed. Execution detail: `docs/superpowers/plans/2026-10-19-everything-is-a-block.md`, stage 5.

### `blocks`

Status: delivered. Introduced by ADR-021 as a current-scope module.

Owns the `Block` row, permission inheritance, the transaction pipeline and the live channel:

- `POST /api/v1/sync` reads a page's subtree, or the blocks whose versions the client holds, with the role on each. A block the reader cannot see is not returned, and its id is removed from `children`.
- `POST /api/v1/transactions` applies `{ transactions: [{ id, operations }] }` with the commands `set`, `update`, `listAfter`, `listBefore`, `listRemove`, `applyText` and `setPermission`. Each client transaction is one Postgres transaction; a retried transaction id returns the stored result (`BlockTransaction`).
- `/api/v1/blocks/live` is the WebSocket for versions and presence. A client mints a short-lived token with `POST /api/v1/blocks/live/token`, subscribes per page, and may send `transactions` and `sync` requests over the same socket. Postgres `NOTIFY block_versions` drives the fan-out, and each subscriber receives only the blocks it can read.

Block rows are written through the pipeline; the only direct write is the deferred forever-deletion of trashed pages (ADR-017). Execution detail: `docs/superpowers/plans/2026-10-19-everything-is-a-block.md`.

### `mcp`

Status: read and write surface delivered (page and collection tools, `search_neuma`, block insert/update/move/delete, comments, trash and restore).

Every tool resolves a principal and filters by space access, with no agent bypass, and every write goes through the same services the portal uses, so domain validation, permissions and versioning are identical. Tools are modelled on the domain, never on storage.

Remaining files: none for the current scope.

### `search`

Status: query over `Block` delivered: PostgreSQL full-text and trigram matching (whole word, inside a word, accents, typo fallback), ranking, snippets, filters (space, author, edited range, verified, content type), permission filtering, portal search, and MCP search. A change is searchable when its transaction commits. `SearchDocument`, `PageBlock`, the search worker and the `tags` filter are gone.

Remaining files and verification:

- `apps/backend/tests/integration/` — deterministic Prisma setup and integration timeout repair.

### `files`

Status: FileAsset model, local storage, upload/download/delete authorization, portal attachment primitives delivered.

**Placement model change.** Per `docs/architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md`, the content becomes the single source of truth for *where* a file lives, and `FileAsset.pageId` becomes the ownership/permission/collection anchor rather than a parallel placement record. The separate "Attachments" list stops being the primary surface: a file is attached where it is dropped and removed by deleting its block. The authorization path in `file.asset.repository.ts` is already correct and does not change. Execution detail: `docs/superpowers/plans/2026-08-05-neuma-single-page-primitive.md`, Phase 5.

Remaining files and changes:

- `apps/portal/modules/pages/editor/components/pages.editor.tsx` — insert file/image nodes after upload.
- `apps/portal/modules/pages/attachments/components/pages.attachments.upload.tsx` — return an editor-ready asset node.
- `apps/portal/modules/pages/attachments/components/pages.attachments.tsx` — synchronize attachment metadata with page content.
- `apps/portal/modules/pages/attachments/lib/` — node mapping and safe display metadata.
- Attachment/editor tests under `apps/portal/tests/unit/modules/pages/`.

### `collaboration`

Status: delivered by the live channel of the `blocks` module (ADR-021; Hocuspocus and the page-scoped Yjs document of ADR-020 are retired). Short-lived socket tokens, per-page subscription, presence with expiry, per-block text merge, read access checked per block, and reconnect with `sync` by version.

Remaining files and changes: none recorded here. The client lives in `apps/portal/modules/pages/block-sync/`.

## Completion Criteria

The current phase is complete only when every remaining file/change above is implemented, read and reviewed, and these commands pass:

- Backend and portal full test suites.
- `bun run check` with zero code warnings/errors.
- `bun run build`.
- Prisma generate/validate and local migration status.
- Live channel smoke test: a reader without permission on a block receives no operation for it.
- `git diff --check`.
