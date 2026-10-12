# 010: Adoptar Prisma ORM 8 con contrato y migraciones propias

**Status:** Accepted
**Date:** 2026-10-11

## Context

Prisma ORM 8 no es una versión nueva de Prisma 7: es otra herramienta. Cambia la API de consultas (`db.orm.public.Page.where(...).first()` en lugar de `prisma.page.findUnique(...)`), el esquema pasa a ser un «contrato» (`// use prisma-8`), las migraciones son archivos `migration.ts` que se compilan a `ops.json`, y desaparecen `@prisma/client`, `@prisma/adapter-pg`, `generate`, `migrate deploy` y los códigos `P2002`/`P2025`. A la fecha de esta decisión el cliente para PostgreSQL (`@prisma/orm-postgres`) sigue en versión candidata (`8.0.0-rc.17`, CLI `8.0.0-rc.22`); Prisma anuncia la versión final para octubre de 2026 y mantiene Prisma 7 durante 18 meses después.

Se decidió migrar ahora y no esperar la versión final, sabiendo que obliga a reescribir la capa de datos completa y a migrar datos en las bases existentes.

Hechos que condicionan el diseño, todos verificados con un prototipo y contra la documentación oficial:

- Las columnas de fecha que creó Prisma 7 son `timestamp(3)` sin zona horaria. Prisma 8 las lee como texto; su tipo de fecha (`DateTime`) es `timestamptz`.
- El contrato no puede representar dos cosas que la búsqueda necesita: las columnas `tsvector` generadas y los índices de trigramas con clase de operador (`gin_trgm_ops`). La introspección descarta la clase de operador, así que esos índices nunca verificarían.
- Prisma 7 creó las unicidades como índices únicos, no como restricciones. `upsert({ conflictOn })` solo acepta columnas de una restricción `@@unique`.
- Todo el SQL generado nombra el esquema (`"public"."Page"`).
- Una base existente se adopta con `prisma db sign`, que se niega a firmar si el esquema no coincide exactamente con el contrato.

## Alternatives Considered

- **Quedarse en Prisma 7.10 hasta la versión final de Prisma 8.** PRO: sin riesgo de cambios entre versiones candidatas; Prisma 7 tiene soporte asegurado. CON: la migración queda pendiente, y es igual de grande con o sin la versión final. Rechazada por decisión del producto.
- **Leer el `schema.prisma` de Prisma 7 desde Prisma 8 (`prisma7Schema(...)`).** PRO: un solo archivo de esquema durante la transición. CON: falla con los campos `Unsupported("tsvector")` y deja las fechas como texto. Rechazada.
- **Tipar las fechas como `DateTime` (`Temporal.Instant`).** PRO: el tipo que Prisma 8 propone por defecto. CON: obliga a cambiar `Date` por `Temporal` en todo el dominio, los DTOs y las pruebas. Rechazada en favor de `TimestamptzJsDate`, que lee `timestamptz` como `Date` con la misma precisión de milisegundos que tenía Prisma 7.
- **Reescribir la búsqueda con el ORM y `@@fullTextIndex`.** PRO: menos SQL directo. CON: no soporta el vector ponderado por idioma ni los índices de trigramas sin acentos; cambiaría el ranking. Rechazada: la búsqueda sigue en SQL directo con `db.raw.sql`.

## Decision

Usaremos Prisma ORM 8 (`prisma` y `@prisma/orm-postgres`) como única capa de acceso a datos. Concretamente:

1. **Contrato escrito a mano** en `packages/db/prisma/{models,enums}`, un archivo por modelo y por enum, con los nombres exactos de tablas, restricciones e índices que ya existen. Los enums son `native_enum` para conservar los tipos de PostgreSQL. Las fechas son `TimestamptzJsDate`, y `updatedAt` es `temporal.updatedAtJsDate()`.
2. **Lo que el contrato no puede expresar vive en SQL dentro de la migración base**: las extensiones `unaccent` y `pg_trgm`, la función `immutable_unaccent`, las columnas `tsvector` generadas y sus índices GIN, y los índices de trigramas. `db verify` sin `--strict` tolera esos elementos adicionales.
3. **Migraciones** en `packages/db/migrations/app`:
   - `baseline` reproduce exactamente el esquema que dejaba Prisma 7, comprobado comparando `pg_dump`;
   - `timestamps_with_time_zone` convierte las fechas con `USING columna AT TIME ZONE 'UTC'` (Prisma 7 siempre guardó UTC), vuelve obligatorias las cuatro columnas lista y normaliza los `null` de JSON a `NULL` de SQL;
   - `unique_constraints` promueve los índices únicos a restricciones con `ADD CONSTRAINT ... USING INDEX`, sin reconstruirlos.
4. **Adopción automática de bases de Prisma 7**: `packages/db/scripts/migrate-deploy.ts` firma la base en el estado de la línea base si encuentra `_prisma_migrations` y no encuentra la marca de Prisma 8, y luego aplica lo pendiente.
5. **`@neuma/db` expone una API mínima**: `createNeumaDatabase`, `NeumaDatabase`, `NeumaTransaction`, los enums como objetos `as const` con su tipo del mismo nombre, `isUniqueViolation` (por `sqlState` 23505) y los tipos de JSON. En el backend, `PrismaService` envuelve el cliente con `models`, `modelsFor(transaction)`, `transaction`, `sql`, `tables` y `runner`.

## Consequences

- Positivas: una sola versión de Prisma, sin cliente generado en `src/generated` (el contrato emitido se commitea), fechas con zona horaria en la base, y `upsert` atómico sobre cualquier unicidad.
- Negativas:
  - La API es candidata: entre una rc y la siguiente pueden cambiar detalles y habrá que ajustar código.
  - Faltan funciones que Prisma 7 tenía. El `increment` se reemplaza por SQL directo, las actualizaciones anidadas por escrituras separadas en una transacción, los niveles de aislamiento por `SET TRANSACTION`, y `update` que no encuentra fila devuelve `null` en lugar de lanzar, así que cada caso lanza su propio error con contexto.
  - El SQL directo no acepta `Date`, arreglos ni `null` interpolados: se pasan como `toISOString()::timestamptz`, como una lista JSON (`buildSqlTextList`) o como `NULL::tipo` escrito en la sentencia.
  - Prisma 8 no tiene Studio ni comando de seed; el seed es un script que crea su propio cliente.
- Un despliegue existente no requiere pasos manuales: la imagen de migraciones lo adopta.

## Governance

- Cada cambio de esquema es: editar el contrato, `bun run db:generate` (`contract emit`), `bun run db:migrate --name <nombre>` (`migration plan`), revisar `migration.ts`, recompilarlo con `node migrations/app/<dir>/migration.ts` y commitear la carpeta, el snapshot y la referencia `db`.
- `prisma migration check` debe pasar; una migración que borre o convierta datos se revisa a mano antes de commitear, porque `db migrate` aplica las operaciones destructivas sin preguntar.
- Al salir la versión final de Prisma 8, se actualizan `prisma` y `@prisma/orm-postgres` y se revisa su changelog contra los puntos de este ADR.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
- Fuentes: guías oficiales «Coming from Prisma ORM 7», «Migrate from Prisma ORM 7 to 8 (PostgreSQL)», «Release status», referencia del cliente ORM y de consultas directas.
