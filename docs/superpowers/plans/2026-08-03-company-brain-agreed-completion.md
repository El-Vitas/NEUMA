# Company Brain Agreed Scope Completion Plan

> **Superseded:** Use `docs/superpowers/plans/2026-08-03-company-brain-module-slices.md` as the execution authority. The current/future boundary is documented in `docs/scope/current-scope.md` and `docs/scope/future-scope.md`.

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Finish only the features explicitly included in the approved company-brain scope, without implementing the deferred backlog.

**Architecture:** Extend the existing shared ProseMirror contract and editor, integrate the existing FileAsset and collaboration boundaries, then harden worker/integration operation. No new product domains are introduced. Overlapping editor files are handled sequentially; independent operational tests run in a separate slice.

**Tech Stack:** Bun, React, Next.js, ProseMirror, Yjs, Hocuspocus, NestJS, Fastify, Prisma, PostgreSQL, Bun tests.

---

## Explicitly Included

- Complete approved editor blocks: tables, toggles, multimedia/file blocks, and safe embeds.
- Attachments rendered and managed inside pages.
- Collaboration presence, cursors, reconnect/error UX, and conflict-safe state handling.
- Search worker operational verification and integration database setup repair.
- Existing English-first i18n and permission conventions.

## Explicitly Excluded

- SSO.
- Guests/public sharing.
- Multi-tenant organizations.
- Billing/subscriptions.
- Embeddings/semantic search.
- S3/CDN.
- Valkey/BullMQ.
- Comments, mentions, notifications, inbox, backlinks, integrations, plugins, public API, offline-first storage, analytics.

## Slice 1: Complete Editor Blocks

**Files:**

- `packages/shared/src/schemas/page-content.schema.ts`
- `packages/shared/src/schemas/page-content.schema.test.ts`
- `packages/shared/src/index.ts`
- `apps/portal/modules/pages/lib/pages.editor.schema.ts`
- `apps/portal/modules/pages/lib/pages.editor.commands.ts`
- `apps/portal/modules/pages/lib/pages.editor.lib.ts`
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx`
- `apps/portal/modules/pages/constants/pages.editor.constants.ts`
- `apps/portal/modules/pages/types/pages.types.ts`
- `apps/portal/tests/unit/modules/pages/lib/`
- `apps/portal/tests/unit/modules/pages/schemas/`

**Deliverable:** Versioned structured content supports table, toggle, image/file, and allowlisted embed nodes with bounded JSON, ProseMirror schema parity, serialization, commands, read-only rendering, and safe validation.

## Slice 2: Attachments Inside Pages

**Files:**

- `apps/portal/modules/pages/components/pages.editor.tsx`
- `apps/portal/modules/pages/components/pages.attachments.tsx`
- `apps/portal/modules/pages/components/pages.attachments.upload.tsx`
- `apps/portal/modules/pages/components/pages.attachment.item.tsx`
- `apps/portal/modules/pages/server/actions/pages.attachments.actions.ts`
- `apps/portal/modules/pages/server/lib/pages.attachments.server.ts`
- `apps/portal/modules/pages/schemas/pages.attachments.schemas.ts`
- `apps/portal/modules/pages/types/pages.attachments.types.ts`
- `apps/portal/modules/pages/lib/pages.attachments.lib.ts`
- `apps/portal/messages/en.json`
- `apps/portal/messages/es.json`
- Attachment/editor tests under `apps/portal/tests/unit/modules/pages/`

**Deliverable:** File blocks can be inserted, displayed, downloaded, deleted by authorized users, and restored through page JSON without exposing storage paths or duplicating upload validation.

## Slice 3: Collaboration UX

**Files:**

- `apps/backend/src/modules/collaboration/`
- `apps/backend/tests/unit/modules/collaboration/`
- `apps/portal/modules/pages/hooks/use.pages.collaboration.ts`
- `apps/portal/modules/pages/lib/pages.collaboration.lib.ts`
- `apps/portal/modules/pages/types/pages.collaboration.types.ts`
- `apps/portal/modules/pages/components/pages.prose-mirror.editor.tsx`
- `apps/portal/messages/en.json`
- `apps/portal/messages/es.json`
- Collaboration tests under backend/portal page test scopes

**Deliverable:** Awareness/presence and cursor decorations, reconnect states, retry limits, conflict-safe editor updates, and accessible connection status. Permissions remain backend-authoritative.

## Slice 4: Operational Completion

**Files:**

- `apps/backend/src/modules/search/infrastructure/worker/`
- `apps/backend/src/common/infrastructure/persistence/outbox.repository.ts`
- `apps/backend/tests/unit/modules/search/`
- `apps/backend/tests/integration/`
- `apps/backend/tests/bun-setup.ts`
- `apps/backend/tests/config/test-env.config.ts`
- `apps/backend/.env.test.example`
- `docs/operations/search-worker.md`
- `docs/operations/collaboration.md`

**Deliverable:** Search worker has a documented runnable process, deterministic local test setup, migration checks, retry/health assertions, and no unexplained integration timeout.

## Slice Rules

- Slice 1 must be verified before Slice 2 because both own editor content contracts.
- Slice 3 runs after Slice 1 and may run in parallel with Slice 4 only if file scopes remain disjoint.
- Maximum five slices in one round.
- Every changed file is read after each agent returns.
- Final fresh-agent consolidation checks duplicate schemas, adapters, validators, commands, and message keys.
- No empty placeholder files are allowed.

## Verification

- Full backend and portal tests.
- Root `bun run check` with zero code warnings/errors.
- Root `bun run build`.
- Prisma generate/validate/migration status.
- Search worker smoke test against local PostgreSQL.
- Collaboration WebSocket authorization smoke test.
- `git diff --check`.
