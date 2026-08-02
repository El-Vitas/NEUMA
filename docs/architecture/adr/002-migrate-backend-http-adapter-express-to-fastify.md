# 002: Migrate the backend HTTP adapter from Express to Fastify

**Status:** Accepted

## Context

The NestJS backend used `@nestjs/platform-express`. As part of moving the backend onto the Bun runtime ([001]), we reviewed the HTTP layer. Fastify is officially supported by NestJS, is meaningfully faster than Express, and runs on Bun. The migration was scoped to the HTTP adapter only — no business logic changes.

## Alternatives Considered

- **Keep Express on Bun.** PRO: zero migration work; Express runs on Bun's Node-compat layer. CON: leaves throughput on the table; Express is the lower-performance adapter.
- **Migrate to Fastify (chosen).** PRO: higher HTTP throughput; first-class NestJS support; aligns with a modern Bun stack. CON: real migration surface — reply API differs (`.setHeader`→`.header`, `.status().json()`→`.status().send()`), request/response types change (`FastifyRequest`/`FastifyReply`), file uploads move off multer to `@fastify/multipart`, static file serving moves to `@fastify/static`, and there is a known open Bun bug where Fastify's `connectionTimeout`/`keepAliveTimeout` are ignored (oven-sh/bun#17287).
- **Rewrite on raw `Bun.serve`.** PRO: theoretical max performance. CON: abandons the entire Nest HTTP adapter ecosystem (guards, interceptors, pipes, filters); not viable without a Nest-for-Bun adapter.

## Decision

We will run NestJS on **`@nestjs/platform-fastify`**. The migration touched only the adapter surface: bootstrap (`FastifyAdapter`), the global exception filter, guards/controllers that referenced Express types, static evidence serving (`@fastify/static`), and file uploads (`@fastify/multipart`, see [consequences]). All guards, interceptors, pipes, filters and DI are preserved unchanged.

## Consequences

- Positive: higher request throughput; a clean, modern HTTP layer on Bun.
- Negative: file uploads required a custom `FastifyFileInterceptor` (multer has no Fastify equivalent) that maps `@fastify/multipart` parts to the same shape the evidence service already consumed. An over-limit upload surfaces `@fastify/multipart`'s `FST_REQ_FILE_TOO_LARGE`, which we explicitly map back to a 400 (otherwise it would fall through to a generic 500).
- Negative: Fastify's timeout settings are silently ignored under Bun (open bug); if request timeouts become necessary they must be enforced at a reverse-proxy/app layer.
- Neutral: verified NOT to be regressions — CORS behavior, exception-filter content-type/charset, `@Res({ passthrough })`, and the static-file prefix all behave equivalently to the Express version.

## Governance

Covered by the backend test suite (144 tests incl. evidence upload/list/delete integration) and the gate (`depcruise`/biome/eslint/tsc). Any new controller must use Fastify request/reply types, and file endpoints must use `FastifyFileInterceptor`, not multer.

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
