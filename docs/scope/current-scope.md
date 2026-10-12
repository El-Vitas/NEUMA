# Neuma Current Scope

This is the only scope that is allowed to receive implementation work in the current product phase. Anything not listed here belongs in `docs/scope/future-scope.md` and must not be treated as an unfinished task.

## Product Boundary

- One company workspace per deployment.
- Internal employees only.
- Email/password authentication.
- Existing persisted roles mapped to admin/editor/viewer capabilities.
- Spaces with public-internal and restricted visibility.
- Hierarchical pages with versioning and trash/restore.
- Pages and spaces carry a mark — an emoji, an uploaded image, or one of the icon library's symbols in a chosen colour — set from the page header or from the tree's own menu, which also renames without opening. Page covers were built and then withdrawn (18/08/2026) and are not part of this scope.
- Every screen works from 320px up: one sidebar that folds, and no page that scrolls sideways.
- Structured ProseMirror editor.
- Configurable collections with Tasks/Projects templates, contributing a typed property schema and views over pages.
- Table and board views already delivered. Calendar and timeline are not part of the current completion pass.
- Page mentions and backlinks: a persisted link graph between pages, maintained as an outbox projection.
- PostgreSQL full-text search, filters, tags, ranking, snippets, permissions, outbox projection, and MCP search.
- Local filesystem file assets behind a storage abstraction.
- Hocuspocus/Yjs collaborative editing with page-scoped authorization.
- English-first portal with Spanish catalog support.

## Module Status And Remaining Files

### `auth`

Status: delivered.

Remaining files: none for the current scope.

### `workspaces`

Status: delivered.

Remaining files: none for the current scope.

### `spaces`

Status: delivered.

Remaining files: none for the current scope.

### `pages`

Status: foundation, editor, versioning, trash, collaboration provider, and attachment primitives delivered.

Remaining files and changes:

- `packages/shared/src/schemas/page-content.schema.ts` — finalize the agreed block contract and remove check warnings.
- `apps/portal/modules/pages/lib/pages.editor.schema.ts` — keep ProseMirror parity for all approved blocks.
- `apps/portal/modules/pages/lib/pages.editor.commands.ts` — expose commands for approved blocks.
- `apps/portal/modules/pages/lib/pages.editor.lib.ts` — serialize/deserialize all approved blocks.
- `apps/portal/modules/pages/components/pages.editor.tsx` — mount attachment insertion and block controls.
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx` — render approved blocks and collaboration state.
- `apps/portal/modules/pages/components/pages.attachments.tsx` — connect attachment list to page content blocks.
- `apps/portal/modules/pages/components/pages.attachments.upload.tsx` — insert uploaded asset nodes into the current document.
- `apps/portal/modules/pages/components/pages.attachment.item.tsx` — render authorized image/file nodes.
- `apps/portal/modules/pages/hooks/use.pages.collaboration.ts` — presence/cursor/reconnect behavior.
- `apps/portal/modules/pages/lib/pages.collaboration.lib.ts` — awareness and cursor decorations.
- `apps/portal/modules/pages/types/pages.collaboration.types.ts` — session/presence contracts.
- Tests mirroring each changed page file under `apps/portal/tests/unit/modules/pages/`.

### `databases`

Status: generic definitions, typed properties, records, Tasks/Projects templates, permissions, table/board contracts, and portal views delivered.

**Model change in progress.** Per `docs/architecture/adr/008-adopt-single-page-primitive-notion-alignment.md`, this module dissolves into `Page`:

- a record becomes a **page**;
- a database becomes a **page that carries a schema**, and its rows are that page's child pages — so membership is plain `parentId`, with no `collectionId` column and no separate collection entity;
- `Database` is deleted rather than renamed; `DatabaseProperty` and `DatabaseView` survive as schema tables keyed by the owning page.

The typed property engine, the Tasks/Projects templates and the table/board grouping logic all survive; only the storage and the entity boundaries move. Do not add new capabilities to `DatabaseRecord` — a request for versioning, trash or collaboration on records is a signal to accelerate the migration, not to duplicate `Page`.

Remaining files: none for the currently accepted minimum. Calendar/timeline are part of the agreed data-view scope only when explicitly started as their own module slice.

### `links`

Status: not started. Introduced by ADR-008 as a current-scope module.

Owns the page mention node, the `PageLink` graph, its outbox projection worker, and the backlinks read. Reads must filter by the requesting user's space access before counting, so the graph never discloses the existence of unreadable pages. Execution detail: `docs/superpowers/plans/2026-08-05-neuma-notion-alignment.md`, Phase 1.

### `blocks`

Status: not started. Introduced by ADR-008 as a current-scope module.

Owns the stable block ids in the editor schema and the `PageBlock` projection derived from `Page.content`. `PageBlock` is a read model: nothing outside its worker may write to it. It exists so content is addressable and queryable at block granularity — for citations, for cross-page queries over content, and for agent-directed edits — without making blocks the write model. Execution detail: same plan, Phases 1 and 4.

### `mcp`

Status: read surface delivered (`mcp.listSpaces`, `mcp.getPage`, `search_neuma`).

Gains write tooling in Phase 4 so an agent can operate the brain, not only read it. Every tool resolves a principal and filters by space access — there is no agent bypass — and every write goes through the same services the portal uses, so domain validation, versioning and outbox emission are identical. Tools are modelled on the domain, never on storage.

### `search`

Status: PostgreSQL projection, FTS query API, portal search, snippets, filters, MCP search, outbox worker, retry, and cleanup delivered.

Remaining files and verification:

- `apps/backend/src/modules/search/infrastructure/worker/search.worker.main.ts` — operational smoke verification.
- `apps/backend/tests/integration/` — deterministic Prisma setup and integration timeout repair.
- `docs/operations/search-worker.md` — runnable local worker procedure.
- Tests for worker startup and PostgreSQL projection health.

### `files`

Status: FileAsset model, local storage, upload/download/delete authorization, portal attachment primitives delivered.

**Placement model change.** Per `docs/architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md`, the content becomes the single source of truth for *where* a file lives, and `FileAsset.pageId` becomes the ownership/permission/collection anchor rather than a parallel placement record. The separate "Attachments" list stops being the primary surface: a file is attached where it is dropped and removed by deleting its block. The authorization path in `file.asset.repository.ts` is already correct and does not change. Execution detail: `docs/superpowers/plans/2026-08-05-neuma-notion-alignment.md`, Phase 5.

Remaining files and changes:

- `apps/portal/modules/pages/components/pages.editor.tsx` — insert file/image nodes after upload.
- `apps/portal/modules/pages/components/pages.attachments.upload.tsx` — return an editor-ready asset node.
- `apps/portal/modules/pages/components/pages.attachments.tsx` — synchronize attachment metadata with page content.
- `apps/portal/modules/pages/lib/pages.attachments.lib.ts` — node mapping and safe display metadata.
- Attachment/editor tests under `apps/portal/tests/unit/modules/pages/`.

### `collaboration`

Status: Hocuspocus gateway, page-scoped short-lived tokens, Fastify WebSocket transport, Yjs provider, persistence, read-only checks, and basic reconnect/error state delivered.

Remaining files and changes:

- `apps/backend/src/modules/collaboration/collaboration.gateway.ts` — awareness authorization and bounded update behavior.
- `apps/backend/src/modules/collaboration/types/collaboration.types.ts` — presence/cursor contracts.
- `apps/portal/modules/pages/hooks/use.pages.collaboration.ts` — awareness subscription and reconnect limits.
- `apps/portal/modules/pages/lib/pages.collaboration.lib.ts` — cursor/presence decorations.
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx` — render presence/cursor state.
- Collaboration tests under backend and portal page test scopes.
- `docs/operations/collaboration.md` — local WebSocket startup and health checks.

### `mcp`

Status: authorized read tools and `search_neuma` delivered.

Remaining files: none for the current read-only MCP scope.

## Completion Criteria

The current phase is complete only when every remaining file/change above is implemented, read and reviewed, and these commands pass:

- Backend and portal full test suites.
- `bun run check` with zero code warnings/errors.
- `bun run build`.
- Prisma generate/validate and local migration status.
- Search worker smoke test.
- Collaboration WebSocket authorization smoke test.
- `git diff --check`.
