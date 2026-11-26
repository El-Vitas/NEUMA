# 014: The collaboration socket address is fixed when the portal is built

**Status:** Accepted
**Date:** 2026-10-11

## Context

Live editing opens a WebSocket from the browser directly to the backend (Hocuspocus); it does not go through the Next server. Its address is `NEXT_PUBLIC_COLLABORATION_WS_URL`, and Next only puts a public variable in the browser bundle when it is written with its full name. The portal read it with `envSchema.parse(process.env)`, which in the browser receives an empty object, so it always used the default value, `ws://localhost:3000`. In development it matched by chance. In Docker, live editing failed silently and saved nothing.

## Alternatives Considered

- **Pass the socket through the Next server (proxy).** PRO: a single public address. CON: the standalone Next server does not proxy WebSockets and one of our own would have to be added. Rejected.
- **Deliver the address at runtime** (the server puts it in the page). PRO: the same image serves any environment. CON: it has to be carried down the component tree to the collaboration session, and it changes more code than the problem warrants. Kept as an option if a single image is needed for several environments.
- **Fix it at build time.** PRO: it is the standard Next mechanism and the change is minimal. CON: each environment needs its own portal image.

## Decision

`NEXT_PUBLIC_COLLABORATION_WS_URL` is a build argument of the portal Dockerfile. Compose takes it from `COLLABORATION_WS_URL`. `config/env.config.ts` reads the variable by its full name so that Next puts it in the bundle.

## Consequences

- Positive: live editing works in Docker and in podman.
- Negative: changing the backend's public address forces rebuilding the portal image.

## Governance

Every new `NEXT_PUBLIC_*` variable is added in `config/env.config.ts` with its full name and, if it changes per environment, as a build argument of the Dockerfile.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
- Modified: 2026-10-20 — With block-based editing (ADR 021) there is no collaboration socket anymore. The variable became `NEXT_PUBLIC_LIVE_WS_URL` (in compose, `LIVE_WS_URL`) and points directly to the backend's live channel, `/api/v1/blocks/live`. What was decided, fixing the address when the portal is built, remains the same.
