# 015: Stay on NestJS 11 until `@nestjs/throttler` ships ESM

**Status:** Accepted
**Date:** 2026-10-11
**Related:** `002-migrate-backend-http-adapter-express-to-fastify.md`

## Context

NestJS 12 publishes its core packages as ESM with top-level `await`. `@nestjs/throttler` 6.7.1, the latest version, is still CommonJS: when loaded, it `require`s `@nestjs/core` 12, and Bun fails because a module with top-level `await` cannot be loaded with `require`. The fix exists (nestjs/throttler#2714, "publish as esm"), but as of 2026-10-11 it is still unmerged. The rate limiter protects sign-in and the expensive routes.

## Alternatives Considered

- **Upgrade to NestJS 12 and replace the throttler with our own guard.** PRO: stays up to date. CON: it is security code of our own that has to be maintained, to cover a wait that should be short. Rejected.
- **Patch the package locally.** PRO: unblocks NestJS 12 right away. CON: a patch on a dependency that is lost or breaks with every update. Rejected.
- **Stay on NestJS 11.** PRO: everything works and is still supported. CON: the neighboring versions have to be pinned to those NestJS 11 accepts.

## Decision

The NestJS core packages (`common`, `core`, `platform-fastify`, `testing`) stay at 11.2.7, and `fastify` is pinned at 5.11.3, the version of `@nestjs/platform-fastify` 11.2.7: two copies of Fastify have incompatible types. Packages that already publish a version compatible with NestJS 11 are updated (`@nestjs/config`, `jwt`, `passport` and `mapped-types` 12, `nestjs-pino` 5, `@fastify/static` 10).

## Consequences

- Positive: the backend and the rate limiter work without changes or patches.
- Negative: the backend stays one major version behind, and `fastify` cannot be upgraded on its own.

## Governance

Review when nestjs/throttler#2714 is merged and published: upgrade all `@nestjs/*` packages together and remove the `fastify` pin.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
