# 011: Aislar las pruebas de integración con una base de datos por ejecución

**Status:** Accepted
**Date:** 2026-10-11
**Depends on:** `010-adopt-prisma-orm-8.md`

## Context

Las pruebas de integración del backend arrancan la aplicación completa contra PostgreSQL. Hasta ahora cada ejecución creaba un esquema propio (`test_schema_<id>`), lo apuntaba con `?schema=` y `search_path`, y lo preparaba con `prisma db push` más dos fixtures en SQL (la columna `tsvector` y el índice parcial de `AgentAction`).

Prisma 8 escribe el esquema en cada sentencia (`"public"."Page"`), así que un esquema distinto de `public` ya no aísla nada: todas las ejecuciones escribirían en las mismas tablas. Además `db push` dejó de existir, y las dos fixtures duplicaban lo que ahora hace la migración base.

## Alternatives Considered

- **Un `namespace` del contrato por worker.** PRO: mantiene una sola base. CON: el namespace es parte del contrato; habría que generar un contrato por ejecución. Rechazada.
- **Limpiar las tablas entre pruebas en una base compartida.** PRO: rápido. CON: dos ejecuciones simultáneas (por ejemplo, en paralelo o en CI) se pisan, y un fallo a medio camino deja datos sucios. Rechazada.
- **Una base de datos por ejecución.** PRO: aislamiento total, y se prepara con las mismas migraciones que producción. CON: crear y migrar la base cuesta unos segundos por ejecución.

## Decision

Cada ejecución de `bun test` crea una base `neuma_test_<id>` con el usuario administrador de pruebas, la migra con `prisma db migrate` (exactamente lo que corre en producción) y la borra al terminar con `DROP DATABASE ... WITH (FORCE)`. Las fixtures `search-projection.fixture.ts` y `agent-action-request.fixture.ts` se eliminan.

## Consequences

- Positivas: las pruebas validan las migraciones reales en cada ejecución; varias ejecuciones simultáneas no interfieren.
- Negativas: el rol de `TEST_DATABASE_ADMIN_URL` necesita permiso `CREATEDB`; cada ejecución suma el tiempo de crear y migrar la base.

## Governance

`tests/bun-setup.ts` es el único lugar que crea, migra y borra la base de pruebas. Una prueba que necesite estructura de base debe obtenerla de una migración, nunca de una fixture en SQL.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
