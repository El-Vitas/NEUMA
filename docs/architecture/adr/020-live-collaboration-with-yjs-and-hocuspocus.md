# 020: Live collaboration with Yjs and Hocuspocus inside the backend

**Status:** Superseded
**Superseded by:** 021
**Date:** 2026-10-19

## Context

Several people edit the same page at once, and none of them can lose what they wrote. A page is a ProseMirror document stored in `Page.content` (ADR 008), with per-page permissions and a CLIENT role that can only read. Everything has to run on the free infrastructure, with no paid services.

Collaboration was implemented on August 3, 2026 (commit `54991a0`) without an ADR. This document records it after the fact, based on what the code shows and on the Neuma design (`docs/superpowers/specs/2026-08-01-neuma-design.md`, Collaboration section).

## Alternatives Considered

- **Save on demand over REST, no real time.**
  - PRO: the simplest; there is no open connection.
  - CON: with two people on the same page, whoever saves last overwrites the other, and nobody sees the other's change until they reload.
- **`prosemirror-collab`, ProseMirror's step-based collaboration.**
  - PRO: it comes from the same editor we already use.
  - CON: the server has to be the authority that orders and stores each step. Presence, reconnection and persistence are written by hand.
- **A managed collaboration service.**
  - PRO: nothing to operate.
  - CON: it is paid by usage, the content of every page goes through a third party, and it breaks the rule of running everything on the free infrastructure.
- **Yjs with Hocuspocus inside the backend (chosen).**
  - PRO: Yjs is a CRDT and merges simultaneous edits without conflicts. `y-prosemirror` connects it to the editor. Hocuspocus provides the WebSocket and the hooks to authenticate, load and save, and runs in the same NestJS process. All of them are MIT-licensed.
  - CON: the content exists in two forms that have to be kept equal, the Yjs state and the page JSON. With a single node there is no coordination between servers.

## Decision

Collaboration uses Yjs in the browser and Hocuspocus in the backend, over the `/api/v1/collaboration` WebSocket (`collaboration.transport.ts`).

- **Entry.** The browser requests a token from `POST /api/v1/collaboration/token`. The backend issues it only if the person can view the page, and never in write mode for a CLIENT (`collaboration.token.service.ts`).
- **Permissions at every step.** Hocuspocus checks the token and the permission on connect, on load, on every message and before saving (`collaboration.gateway.ts`). Without write permission, the connection stays read-only.
- **Two things are saved.** The Yjs snapshot goes to `CollaborationSnapshot`, to resume editing where it left off. The ProseMirror document goes to `Page.content` with its `PageVersion` and an outbox event, in one transaction. Saving waits 250 ms after the last change and never more than 2 seconds.
- **Collaboration is not the source of truth of the domain.** It synchronizes the content; identity, permissions, versions and trash belong to the pages domain.
- **Shutdown.** Before closing the database, the backend closes the connections and waits for pending saves.
- **The WebSocket goes directly to the backend,** not through the portal (ADR 014).

## Consequences

- Positive:
  - two or more people edit at once and none overwrites another;
  - a revoked permission takes effect at the next message, not on reconnect;
  - search and backlinks are updated through the outbox, like with any other write.
- Negative:
  - if the write of `Page.content` fails after saving the snapshot, the page lags behind its live document until the next save; the error goes to the log;
  - a single collaboration node, because open documents live in that process's memory.
- Accepted as a cost: having more than one node requires coordination between servers; the design leaves it for when it is needed (Valkey).

## Governance

The hooks in `collaboration.gateway.ts` are the only place where collaboration reads or writes. This ADR is reviewed if Neuma needs more than one collaboration node, or if Hocuspocus changes major version.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-19, recorded after implementation
- Approved by: TBD
- Implemented: 2026-08-03
