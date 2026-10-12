# Neuma

Monorepo full-stack (Bun + Turborepo) para Neuma, con auth, base de datos, UI kit y estándares de ingeniería.

## Inicializar un proyecto

Abre Claude Code en este repo y pide inicializar el proyecto (skill `init-repo`, en `.agents/skills/init-repo/`). El flujo interactivo:

1. Nombre del proyecto (scope, repo, base de datos).
2. Apps y packages conservados: backend, portal, db, shared, design, eslint-rules y rules-cli.
3. Renombrado in-place (`@neuma/*` → `@{proyecto}/*`, imágenes docker, env).
4. Setup de base de datos (migración inicial + seed).
5. Cleanup de todo lo no seleccionado.
6. Verificación: `install → typecheck → lint → build`.

## Qué incluye

| Workspace | Stack | Puerto |
|---|---|---|
| `apps/backend` | NestJS 11 sobre Fastify, JWT auth + roles/permisos, storage provider, health, throttling, env validado con Zod | 3000 |
| `apps/portal` | Next.js 16 App Router (RSC), shadcn/ui + Dice UI, toolkit data-table (TanStack), next-safe-action, next-themes | 3010 |
| `packages/db` | Prisma ORM 8 + PostgreSQL 18, contrato dividido en `models/` y `enums/`, migraciones en `migrations/`, seeds | — |
| `packages/shared` | Result type, Money value object, logger, constantes compartidas | — |
| `packages/design` | Design tokens Tailwind 4 (`tokens.css`, light/dark, IBM Plex) | — |
| `packages/eslint-rules` | 19 reglas ESLint de arquitectura (convenciones de carpetas, no-prisma-outside-persistence, etc.) | — |
| `packages/rules-cli` | CLI Bun para el registro de reglas de negocio (`docs/business-rules/`) | — |

Funcional desde el día uno: login JWT con roles y permisos, gestión de usuarios como CRUD de ejemplo (`/usuarios`, solo ADMIN: listado paginado con búsqueda vía data-table, crear y editar), gestión de cuenta propia (perfil + cambio de password), dashboard base y theming light/dark.

## Desarrollo local

```bash
bun install
cp .env.example .env
docker compose up -d postgres
cd packages/db && bun run db:migrate:deploy && bun run db:seed && cd ../..
bun run dev
```

Usuarios seed: `admin@example.com`, `worker@example.com`, `client@example.com` (password en `packages/db/prisma/seed/users.seed.ts`).

## Comandos raíz

```bash
bun run dev          # todo en watch (turbo)
bun run build
bun run typecheck
bun run lint
bun run check        # sherif + format + lint + typecheck
bun run jscpd        # detección de duplicación
bun run rules:query  # registro de reglas de negocio
```

## Estándares

- `AGENTS.md` (raíz y por app): reglas de ingeniería para agentes y humanos.
- `.agents/skills/`: skills de stack (next-16, prisma-orm, shadcn-ui, tailwind-4, typescript, vitas-guidelines, etc.).
- `plugins/*.grit`: patrones GritQL espejo de las reglas ESLint.
- `docs/architecture/adr/`: decisiones de stack (Bun, Fastify, Bun.password, bun test, TS 6/7).
- `docs/business-rules/`: reglas de negocio versionadas en YAML + CLI.

## Deploy

- `docker-compose.yml`: postgres + migrate one-shot + backend + workers de búsqueda y retroenlaces + portal.
- `docker/db/init/10-app-role.sh`: rol Postgres de mínimo privilegio para runtime.
- No hay registro abierto. En una instalación nueva, el primer administrador se crea una vez desde el servidor; después, los administradores crean las cuentas desde «Usuarios» (ADR 016):

  ```bash
  read -rs CLAVE && printf '%s' "$CLAVE" | docker compose exec -T backend \
    bun run admin:create --email tu@empresa.cl --name "Tu Nombre"; unset CLAVE
  ```
