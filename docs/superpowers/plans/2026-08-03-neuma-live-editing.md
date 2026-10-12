# Neuma Live Editing Implementation Plan

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Connect the existing Yjs/Hocuspocus gateway to Fastify WebSockets and enable collaborative ProseMirror editing in the portal.

**Architecture:** Fastify owns the WebSocket upgrade route and delegates accepted connections to the existing collaboration gateway. The portal uses Hocuspocus Provider and Yjs bindings inside a client-only editor boundary. Page authorization remains backend-owned; the editor only reflects read-only state supplied by the page policy.

**Tech Stack:** `@fastify/websocket`, Hocuspocus, Yjs, `@hocuspocus/provider`, `y-prosemirror`, ProseMirror, Next.js client components.

---

## Slices

### Slice 1: WebSocket transport

- Add `@fastify/websocket` through Bun CLI.
- Register `/api/v1/collaboration` WebSocket route.
- Attach synchronous socket handlers before async Hocuspocus setup.
- Delegate socket/request to `CollaborationGateway.handleConnection`.
- Preserve auth token/document-name validation and graceful shutdown.

### Slice 2: Collaborative editor provider

- Add Hocuspocus provider/Yjs/ProseMirror bindings through Bun CLI.
- Add a client-only collaboration hook/provider under the pages module.
- Use document name `page:<pageId>` and the configured collaboration URL.
- Keep local editor read-only when backend policy says viewer/trashed.
- Destroy provider/binding on page change/unmount.
- Preserve page save/version fallback when collaboration is disabled or disconnected.
- Add connection/loading/reconnecting/error states with English-first i18n.

## Verification

- TDD WebSocket auth/upgrade/close behavior.
- TDD provider lifecycle, read-only mode, reconnect and cleanup.
- Full backend/portal tests, root check, build, Prisma validation, and no PII logs.
- Final consolidation for duplicate providers/hooks and editor state synchronization.
