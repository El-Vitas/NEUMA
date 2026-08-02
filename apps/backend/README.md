# @company-brain/backend

API HTTP de Starter — NestJS 11 sobre **Fastify**, corriendo en el **runtime de Bun** (sin paso de build: Bun ejecuta el TypeScript directamente). Persistencia con Prisma 7 (`@prisma/adapter-pg`) sobre PostgreSQL. Forma parte del monorepo (Bun + Turborepo); **Bun** es el gestor de paquetes, el runtime y el test runner.

## Requisitos

- Bun 1.3+ (runtime y tests) — `curl -fsSL https://bun.sh/install | bash`
- Bun 1.3 (gestión de paquetes, runtime y test runner)
- PostgreSQL accesible en la URL de `DATABASE_URL` (por defecto `localhost:5432`)

## Setup

```bash
bun install                                     # desde la raíz del monorepo
cp apps/backend/.env.example apps/backend/.env   # y completar valores
bun run --filter @company-brain/db db:generate       # generar el cliente Prisma
bun run --filter @company-brain/db db:migrate:deploy # aplicar migraciones
```

## Scripts

```bash
bun run dev          # bun --watch src/main.ts  → http://localhost:3000
bun run start        # bun src/main.ts (producción)
bun run test         # bun test (unit + integration; requiere Postgres)
bun run check    # gate: depcruise + biome + eslint + tsc --noEmit (TS7)
```

No hay `build`: en producción se ejecuta `bun src/main.ts` directamente.

## Arquitectura

- **HTTP adapter:** Fastify (`@nestjs/platform-fastify`). Subida de archivos vía `@fastify/multipart`.
- **Auth:** JWT (Bearer). Hashing de contraseñas con `Bun.password` (algoritmo bcrypt, compatible con hashes `$2b$` existentes).
- **Datos:** Prisma 7 con driver adapter `pg` (sin query-engine binario).
- **Tests:** `bun test` con schema-per-run en Postgres. Convenciones en `apps/backend/AGENTS.md`.

Las decisiones arquitectónicas (Bun, Fastify, Bun.password, bun test, TypeScript 7) están documentadas en `docs/architecture/adr/`.
