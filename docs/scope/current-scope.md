# Company Brain Current Scope

This is the only scope that is allowed to receive implementation work in the current product phase. Anything not listed here belongs in `docs/scope/future-scope.md` and must not be treated as an unfinished task.

## Product Boundary

- One company workspace per deployment.
- Internal employees only.
- Email/password authentication.
- Existing persisted roles mapped to admin/editor/viewer capabilities.
- Spaces with public-internal and restricted visibility.
- Hierarchical pages with versioning and trash/restore.
- Structured ProseMirror editor.
- Configurable databases with Tasks/Projects templates.
- Table and board views already delivered. Calendar and timeline are not part of the current completion pass.
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

Remaining files: none for the currently accepted minimum. Calendar/timeline are part of the agreed data-view scope only when explicitly started as their own module slice.

### `search`

Status: PostgreSQL projection, FTS query API, portal search, snippets, filters, MCP search, outbox worker, retry, and cleanup delivered.

Remaining files and verification:

- `apps/backend/src/modules/search/infrastructure/worker/search.worker.main.ts` — operational smoke verification.
- `apps/backend/tests/integration/` — deterministic Prisma setup and integration timeout repair.
- `docs/operations/search-worker.md` — runnable local worker procedure.
- Tests for worker startup and PostgreSQL projection health.

### `files`

Status: FileAsset model, local storage, upload/download/delete authorization, portal attachment primitives delivered.

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

Status: authorized read tools and `search_company_brain` delivered.

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
