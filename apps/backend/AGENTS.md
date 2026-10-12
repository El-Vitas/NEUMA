# AGENTS.md — Backend

> Backend-specific conventions. Inherits all standards from `AGENTS.md` at the repo root.

## Stack

- NestJS 11 (modules, guards, interceptors)
- Prisma ORM 8 (PostgreSQL), see `packages/db/AGENTS.md`
- TypeScript strict
- bun

## Module Structure

```
<module>/
├── <module>.module.ts          # NestJS module
├── <module>.controller.ts      # HTTP entry point
├── <module>.service.ts         # @Injectable orchestrator
├── domain/
│   ├── <entity>.domain.ts      # Domain entity — class with pure business rules (0 NestJS, 0 infra)
│   └── <entity>.error.ts       # Domain errors — business rule violations only
├── infrastructure/
│   ├── guards/                 # Module-specific guards
│   ├── decorators/             # Module-specific decorators
│   ├── interceptors/           # Module-specific interceptors
│   ├── persistence/            # Prisma repositories
│   ├── adapters/               # LLM, email, external services
│   └── errors/                 # Technical errors (not found, DB, conflict, server error)
├── dto/                        # Request/response DTOs
├── constants/                  # Named values: enums, error codes, config keys, magic numbers
├── types/                      # TypeScript types & interfaces (no runtime code)
└── utils/                      # Pure helper functions reused within the module
```

Truly cross-cutting concerns (guards, decorators, interceptors not coupled to a specific module) go in `src/common/infrastructure/`.
Module-specific guards, decorators, and interceptors stay in the module's `infrastructure/`.
Cross-cutting helpers go to `src/common/` only when used by 2+ modules.

`src/common/` follows the same module structure: `constants/`, `types/`, `domain/`, `infrastructure/`, `utils/`.

## Naming Convention

Dot-separated. No kebab-case. Files describe their role.

| Type | Pattern | Examples |
|---|---|---|
| Module root | `{entity}.{role}.ts` | `auth.module.ts`, `auth.controller.ts`, `auth.service.ts` |
| Types | `{entity}.types.ts` | `auth.types.ts`, `order.types.ts` |
| Constants | `{entity}.constants.ts` | `auth.constants.ts`, `order.constants.ts` |
| DTOs | `{entity}.{action}.dto.ts` | `auth.login.dto.ts`, `order.create.dto.ts`, `order.response.dto.ts` |
| Domain services | `{entity}.domain.ts` (in `domain/`) | `order.domain.ts`, `auth.domain.ts` |
| Domain errors | `{entity}.error.ts` (in `domain/`) | `order.error.ts`, `auth.error.ts` |
| Infrastructure errors | `{entity}.{type}.error.ts` (in `infrastructure/errors/`) | `order.database.error.ts`, `order.not-found.error.ts` |
| Guards | `{entity}.guard.ts` (in `infrastructure/guards/`) | `jwt.auth.guard.ts`, `roles.guard.ts` |
| Decorators | `{entity}.decorator.ts` (in `infrastructure/decorators/`) | `public.decorator.ts`, `user.decorator.ts` |
| Interceptors | `{entity}.interceptor.ts` (in `infrastructure/interceptors/`) | `user.interceptor.ts` |
| Utils | `{entity}.utils.ts` | `auth.utils.ts`, `order.utils.ts` |

## Services

- **Orchestration layer.** `*.service.ts` is thin. It calls domain rules, persists via repositories, maps to DTOs.
- **Business rules go in `domain/`.** Functions, no state, no NestJS, no Prisma. The service delegates to them.
- **Errors split by concern:**
  - `domain/*.error.ts` — business rule violations only (`InvalidStatusTransitionError`). Extends `DomainError`.
  - `infrastructure/errors/` — technical errors (not found, DB, external API, conflict). Do NOT extend `DomainError`.
- **Method order:** constructor, then public methods, then private methods.

## Environment Variables

- **Never use `process.env` directly.** All env vars go through `ConfigService` with Zod validation via `env.schema.ts`.
- **Every env var used must be declared in `common/config/env.schema.ts`** with proper type, default, and validation.
- **Key constants** for env var names are in `common/constants/env.constants.ts`. Import the key, pass it to `configService.get()`.
- **ConfigService is injected** into services, adapters, and module factories. Infrastructure adapters resolve config internally.
- **Env var default values** are defined in the schema, not in code. Avoid fallback logic (`??` or `||`) in service code.

## Prisma

- The contract lives in `packages/db/prisma/{models,enums}`; `@neuma/db` exposes the client and the enums.
- `PrismaService` (`src/prisma/prisma.service.ts`) is the only place that creates the client. Repositories use
  `models` (or `modelsFor(transaction)` when a caller's transaction may be passed), `transaction(work)` for writes
  that must land together, and `sql` + `tables` + `runner` (or the transaction's `query` / `execute`) for raw SQL.
- A raw row-returning statement declares every column with `.returnsRow(...)`; enum and array columns are read as
  text or JSON and narrowed in TypeScript. `Date`, arrays and `null` are never interpolated: use
  `toISOString()::timestamptz`, `buildSqlTextList` (`src/prisma/prisma.sql.lib.ts`) or a literal `NULL::type`.
- `update()` returns `null` when nothing matched; throw an error with context where a row was expected
  (`requireRow` in `src/common/utils/required-row.utils.ts`).
- Detect a unique violation with `isUniqueViolation(error)` from `@neuma/db`.
- `PrismaModule` is `@Global()` so all modules can inject `PrismaService` without re-importing.
- Use the `@neuma/db` enums as the single source of truth for domain enums (e.g. `UserRole`).

## Testing

### Stack

- **Bun test**, Bun runtime (no build step), one migrated database per run (ADR 011), Fishery + Faker

### Structure

```
tests/
├── unit/                 # mirrors src/
├── integration/          # NestJS bootstrap + DB
│   └── *.integration.spec.ts
├── bun-setup.ts           # preloaded via bunfig.toml: DB schema setup/teardown
├── factories/
├── helpers/
├── config/
│   └── test-env.config.ts
└── utils/
```

### Rules

- Unit tests mirror `src/` exactly. `tests/unit/auth/domain/order.domain.spec.ts` → `src/auth/domain/order.domain.ts`.
- Integration tests by feature (`auth.integration.spec.ts`). Full NestJS bootstrap + real DB, one migrated database per run (ADR 011).
- Domain tests are pure (no NestJS, no Prisma).
- Service tests mock the repository; repository tests need a real DB.
- No `process.env` — use `test-env.config.ts` with Zod.
