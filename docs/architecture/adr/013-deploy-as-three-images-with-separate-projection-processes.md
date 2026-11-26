# 013: Deploy as three images with the projections in separate processes

**Status:** Superseded
**Superseded by:** 022 (the projection services; the three images remain in force)
**Date:** 2026-10-11
**Depends on:** `007-adopt-bun-as-package-manager.md`, `010-adopt-prisma-orm-8.md`, `012-deliver-outbox-events-per-consumer.md`

## Context

The deployment (Docker Compose locally) brought up the database, the migrations, the backend and the portal. The search and backlinks workers were not brought up, so in a deployment search returned zero results and "Linked from" did not appear. In addition, the backend image weighed 2.25 GB: it dragged in the Prisma CLI with its cloud deployment tooling (alchemy, workerd and the AWS, Cloudflare and Stripe SDKs), and the glibc builds of native modules that are never loaded on Alpine (musl).

## Alternatives Considered

- **Run the workers inside the backend process.** PRO: one fewer service. CON: a slow or down projection competes with HTTP requests, they cannot be restarted or scaled separately, and the isolation the outbox provides is lost. Rejected.
- **One image per worker.** PRO: each image carries only what it needs. CON: three images that share almost all of the code and dependencies, with three builds to maintain. Rejected.
- **Three images: server, portal and migrations; the workers use the server image with a different command.** PRO: a single build for the backend and its workers; the Prisma CLI stays only where it is used. CON: the workers' image carries the HTTP server even though it does not use it.

## Decision

- `neuma-backend` serves the API and, with a different command, runs `search-worker` and `links-worker`. Compose declares them as their own services, which start after the migrations and have no HTTP check.
- `neuma-migrate` is the only image with the Prisma CLI. In `@neuma/db` the CLI is a development dependency, so the backend's production install does not include it. The migrations image removes the `prisma deploy` and `prisma dev` tooling, which signing and migrating never load.
- The Alpine images remove the `-gnu` builds of native modules.
- The backend and the workers connect with the least-privilege role (`neuma_app`); only the migrations use the owner.
- The Postgres checks use `pg_isready -h 127.0.0.1`: the temporary server of the first start only listens on a socket, and over the socket it reports "ready" too early.

## Consequences

- Positive: a new deployment has search and backlinks from the first change. The backend went from 2.25 GB to 929 MB and migrations from 1.6 GB to 915 MB.
- Negative: there are two more services to watch, and their health shows in the logs, not in an HTTP check. The list of packages that get removed depends on how Prisma packages its CLI and must be reviewed when upgrading it.

## Governance

A new projection adds its service in `docker-compose.yml`. When bumping the Prisma CLI version, an empty database is applied with the migrations image before publishing it.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
- Modified: 2026-10-19 — The production deployment adds two production images: `neuma-postgres`, with pgBackRest, and `neuma-ops`, the package of units and scripts. The three application images remain as this ADR says.
