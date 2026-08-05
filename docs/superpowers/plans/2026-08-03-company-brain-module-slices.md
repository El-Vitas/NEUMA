# Company Brain Module Slice Map

> **For agentic workers:** This map is the execution authority for the remaining current scope. No agent may create a subagent, commit, or edit files outside its module scope.

## Rules

- A slice is a module/capability, not a broad phase label.
- A slice has an explicit file scope and one owner.
- Two slices may run in parallel only when their file scopes are disjoint.
- If two capabilities need the same file, the shared-file slice runs first and later slices consume its contract.
- Maximum five slices per round.
- No empty placeholder files. Every created file must contain a tested behavior or a concrete contract.
- The orchestrator reads every changed file after every agent and runs final consolidation.

## Current Modules

### Slice `pages.content`

Goal: finish the shared schema, ProseMirror parity, approved blocks, serialization, and text extraction.

Files:

- `packages/shared/src/schemas/page-content.schema.ts`
- `packages/shared/src/schemas/page-content.schema.test.ts`
- `packages/shared/src/index.ts`
- `apps/portal/modules/pages/lib/pages.editor.schema.ts`
- `apps/portal/modules/pages/lib/pages.editor.commands.ts`
- `apps/portal/modules/pages/lib/pages.editor.lib.ts`
- `apps/portal/modules/pages/lib/pages.lib.ts`
- `apps/backend/src/modules/search/utils/search.content.utils.ts`
- Matching tests only.

### Slice `files.editor`

Goal: insert FileAsset nodes into page content and render/download/delete them through existing authorized actions.

Files:

- `apps/portal/modules/pages/components/pages.editor.tsx`
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx`
- `apps/portal/modules/pages/components/pages.attachments.tsx`
- `apps/portal/modules/pages/components/pages.attachments.upload.tsx`
- `apps/portal/modules/pages/components/pages.attachment.item.tsx`
- `apps/portal/modules/pages/server/actions/pages.attachments.actions.ts`
- `apps/portal/modules/pages/server/lib/pages.attachments.server.ts`
- `apps/portal/modules/pages/lib/pages.attachments.lib.ts`
- `apps/portal/modules/pages/types/pages.attachments.types.ts`
- `apps/portal/modules/pages/schemas/pages.attachments.schemas.ts`
- Matching tests and message keys.

### Slice `collaboration.awareness`

Goal: finish presence, cursors, reconnect limits, conflict-safe status and rendering.

Files:

- `apps/backend/src/modules/collaboration/collaboration.gateway.ts`
- `apps/backend/src/modules/collaboration/types/collaboration.types.ts`
- `apps/portal/modules/pages/hooks/use.pages.collaboration.ts`
- `apps/portal/modules/pages/lib/pages.collaboration.lib.ts`
- `apps/portal/modules/pages/types/pages.collaboration.types.ts`
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx`
- Matching tests.

### Slice `search.operations`

Goal: make the existing search worker and PostgreSQL integration deterministic and runnable.

Files:

- `apps/backend/src/modules/search/infrastructure/worker/search.worker.main.ts`
- `apps/backend/src/modules/search/infrastructure/worker/search.projection.worker.ts`
- `apps/backend/src/common/infrastructure/persistence/outbox.repository.ts`
- `apps/backend/tests/bun-setup.ts`
- `apps/backend/tests/config/test-env.config.ts`
- `apps/backend/tests/integration/`
- `docs/operations/search-worker.md`
- `docs/operations/collaboration.md` only if it describes the already-delivered transport.

### Slice `verification`

Goal: run full checks, migration status, worker smoke test, collaboration smoke test, and final consolidation. This slice changes tests/docs only unless a previously discovered defect has a named owner.

## Future Modules

The following are not slices in this map and must not be dispatched from it:

- `sso`
- `guests`
- `public-sharing`
- `multi-tenant`
- `embeddings`
- `s3`
- `valkey`
- `bullmq`
- `comments`
- `notifications`
- `integrations`
- `plugins`
- `public-api`
- `offline-first`
- `analytics`
