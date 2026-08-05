# Company Brain Collaboration Implementation Plan

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Add the collaboration and multimedia foundations needed to make structured pages usable as a shared company knowledge system.

**Architecture:** The collaboration gateway is a backend boundary around Yjs/Hocuspocus. PostgreSQL remains the durable source for page metadata, authorization, and snapshots; the collaboration layer synchronizes document updates and never owns permissions. The portal file flow uploads through server actions to the existing FileAsset API and renders authorized attachments without directly fetching from client components.

**Tech Stack:** Bun, NestJS/Fastify, Yjs, Hocuspocus, ProseMirror JSON, PostgreSQL, Prisma, Next.js, Server Actions.

---

## Slice Order

### Slice 1: Collaboration backend gateway

**Files:**

- `apps/backend/src/modules/collaboration/`
- `apps/backend/src/app.module.ts`
- `packages/db/prisma/models/` only for collaboration snapshot/update metadata if needed
- `packages/db/prisma/migrations/` only for those models
- Collaboration unit/integration tests
- `apps/backend/package.json` via Bun CLI for Yjs/Hocuspocus dependencies

**Deliverable:** Authenticated collaboration connection boundary with page authorization, Yjs document loading/persistence hooks, bounded update handling, snapshot recovery, and graceful shutdown. No client integration yet.

### Slice 2: Portal file attachments

**Files:**

- `apps/portal/modules/files/`
- `apps/portal/modules/pages/components/` only new attachment components, not `pages.editor.tsx`
- `apps/portal/modules/pages/server/`
- `apps/portal/modules/pages/schemas/`
- `apps/portal/messages/en.json`
- `apps/portal/messages/es.json`
- Portal file/attachment tests

**Deliverable:** Server-first file selection/upload flow using FileAsset API, accessible attachment list, upload progress/error state, authorized download links, and no direct browser API calls.

## Collaboration Rules

- Verify JWT/principal before Hocuspocus connection.
- Verify page access and edit capability before accepting updates.
- Reject updates for trashed/inaccessible pages.
- Persist updates/snapshots with bounded payload size and error recovery.
- Keep presence/awareness ephemeral; never persist user secrets or tokens.
- Do not introduce Valkey until multiple collaboration nodes require shared coordination.
- Do not let Hocuspocus query Prisma directly outside an infrastructure adapter.

## File Rules

- Browser never sends raw filesystem paths.
- Upload uses existing generated storage keys and FileAsset authorization.
- Attachment metadata is localized at the UI boundary; file API paths remain English.
- MIME/size validation remains enforced by backend.

## Verification

- TDD connection authorization, update rejection, persistence/recovery, and size limits.
- TDD portal upload validation, success/error states, and authorized download behavior.
- Full backend and portal tests.
- Root `bun run check` with zero code warnings/errors.
- Root `bun run build`.
- Prisma generate/validate and local migration checks.
- Final consolidation before editor integration.

## Deferred

- Presence/cursors UI.
- Offline queue and reconnect conflict UI.
- Comments, mentions, notifications, and backlinks.
- S3-compatible storage.
- Valkey/BullMQ for distributed collaboration/jobs.
