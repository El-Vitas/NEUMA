# @neuma/backend

API HTTP de Neuma: NestJS 11 sobre **Fastify**, en el **runtime de Bun**, sin paso de build (Bun ejecuta el TypeScript directamente). Persistencia con **Prisma ORM 8** sobre PostgreSQL. Forma parte del monorepo (Bun + Turborepo), y **Bun** es a la vez gestor de paquetes, runtime y test runner.

## Requisitos

- Bun 1.4.2 o superior (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL 18 accesible en la URL de `DATABASE_URL` (por defecto `localhost:5432`)

## Setup

```bash
bun install                                      # desde la raíz del monorepo
cp apps/backend/.env.example apps/backend/.env   # y completar valores
bun run --filter @neuma/db db:migrate:deploy     # adopta una base de Prisma 7 si hace falta y aplica migraciones
```

El contrato de Prisma ya emitido viene commiteado en `packages/db/src/contract`, así que no hay que generar nada.

## Scripts

```bash
bun run dev            # bun --watch src/main.ts  → http://localhost:3000
bun run start          # bun src/main.ts (producción)
bun run test           # bun test (unit + integration; requiere Postgres)
bun run check          # depcruise + biome + eslint + tsc --noEmit (TS 7)
```

No hay `build`: en producción se ejecuta `bun src/main.ts` directamente. Es un solo proceso: la búsqueda y «Vinculado desde» leen los bloques, sin procesos aparte.

## Arquitectura

- **HTTP:** Fastify (`@nestjs/platform-fastify`). Subida de archivos con `@fastify/multipart`.
- **Auth:** JWT (Bearer). Contraseñas con `Bun.password` (bcrypt, compatible con hashes `$2b$` existentes).
- **Datos:** Prisma ORM 8 (`@prisma/orm-postgres`), con el contrato y las migraciones en `packages/db`.
- **Búsqueda y retroenlaces:** salen de `Block` y `BlockLink`, que la misma transacción de bloques mantiene al día (ADR 021 y 022).
- **Tests:** `bun test` contra una base de datos nueva por ejecución, migrada con las mismas migraciones de producción. Convenciones en `apps/backend/AGENTS.md`.

Las decisiones de arquitectura (Bun, Fastify, `Bun.password`, `bun test`, TypeScript 7, Prisma 8, aislamiento de pruebas) están en `docs/architecture/adr/`.
