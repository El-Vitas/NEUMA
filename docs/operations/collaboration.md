# Collaboration Transport — Operations

This covers only the already-delivered Hocuspocus/WebSocket transport: how
to start it locally and how to confirm it's up. It does not document
presence (who's viewing/editing) — that is owned by a separate, in-progress
change.

## What exists

- The backend registers a WebSocket route at `GET /api/v1/collaboration`
  (`registerCollaborationTransport` in
  `src/modules/collaboration/collaboration.transport.ts`), backed by
  `@fastify/websocket`. It is wired up once, in `src/main.ts`, on the same
  Fastify instance and the same port as the REST API — there is no separate
  collaboration process or port.
- Each inbound WebSocket connection is handed to
  `CollaborationGateway.handleConnection` (`src/modules/collaboration/collaboration.service.ts`),
  which bridges the Fastify socket into the `@hocuspocus/server` transport.
- Clients authenticate for collaboration separately from the REST JWT: a
  short-lived collaboration token is minted via `POST
  /api/v1/collaboration/token` (`CollaborationController`, guarded by the
  regular `JwtAuthGuard`), then presented when opening the WebSocket
  connection.

## Starting it locally

There is no separate startup command — the collaboration transport comes up
automatically with the backend process:

```bash
docker compose --env-file .env.docker.example up -d postgres
cd apps/backend
bun run dev
```

(or `bun run start` for a non-watch run). Once the backend has logged that
it's listening, the WebSocket route is live at
`ws://localhost:<BACKEND_PORT>/api/v1/collaboration`.

## Health checks

- **Process-level**: the backend's own health endpoint, `GET /api/v1/health`
  (public, no auth), returns `{ "status": "ok" }` once Nest has finished
  bootstrapping — this is also the endpoint the `backend` service's Docker
  healthcheck polls (`docker-compose.yml`, `wget` against
  `http://127.0.0.1:3000/api/v1/health`). If this is unhealthy, the
  WebSocket route is unhealthy too, since they share the same process and
  listener.
- **Transport-level**: minting a collaboration token
  (`POST /api/v1/collaboration/token` with a valid access token) succeeding
  confirms the collaboration module and its dependencies are wired up. A
  successful WebSocket upgrade against `/api/v1/collaboration` (any HTTP
  client that can do a WS handshake, e.g. `wscat` or a browser) confirms the
  transport itself accepts connections.
- **Logs**: the backend logs exclusively through Pino (`nestjs-pino`, wired
  in `src/main.ts`); there is no separate log stream for collaboration —
  connection-level events surface in the same structured JSON log as the
  rest of the backend.
