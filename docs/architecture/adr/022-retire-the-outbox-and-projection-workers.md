# 022: Retirar el outbox y los procesos de proyección

**Status:** Accepted
**Date:** 2026-10-20
**Supersedes:** 012 (entrega del outbox por consumidor), 013 (solo los servicios `search-worker` y `links-worker`; las tres imágenes se mantienen)
**Depends on:** `021-everything-is-a-block.md`

## Context

El outbox existía para que dos procesos aparte proyectaran cada cambio de página: el índice de búsqueda (`SearchDocument`, `PageBlock`) y los retroenlaces (`PageLink`). El ADR 012 lo hizo confiable entregando cada evento a cada consumidor, y el ADR 013 levantó los dos workers como servicios propios.

Con el ADR 021 esas proyecciones dejaron de existir:
- la búsqueda lee `Block.text` y sus índices directamente, y un cambio se encuentra apenas se confirma su transacción;
- los retroenlaces salen de `BlockLink`, que la misma transacción de bloques reconcilia;
- el canal en vivo avisa con `NOTIFY`, también al confirmar.

Ya nadie consume los eventos del outbox. Dejarlo escribiendo sería acumular filas que nunca se procesan, la deuda que se detectó al estudiar el modelo.

## Alternatives Considered

- **Mantener el outbox para consumidores futuros.**
  - PRO: el día que llegue un consumidor externo (correo, webhooks, analítica), la tabla ya existe.
  - CON: hoy escribe en cada cambio y no lo lee nadie, y crece sin límite. Un consumidor futuro trae sus propias necesidades de formato y entrega.
- **Retirar el outbox, los workers y sus servicios de despliegue (elegida).**
  - PRO: menos tablas, menos procesos que vigilar y ninguna escritura sin lector. La búsqueda y los retroenlaces quedan al día sin atraso.
  - CON: un consumidor externo futuro tendrá que volver a agregar una forma de entrega.

## Decision

- Se borran `OutboxEvent`, `OutboxDelivery` y el enum `OutboxConsumer`, junto con su repositorio, el arranque y la proyección de workers, y toda escritura de eventos en páginas y espacios.
- Se borran los servicios `search-worker` y `links-worker` de `docker-compose.yml`.
- Las tres imágenes del ADR 013 (`neuma-backend`, `neuma-migrate`, `neuma-portal`) se mantienen. El backend ya no tiene un segundo comando de arranque.
- Si en el futuro hace falta avisar a un sistema externo, se decide en un ADR nuevo, a partir de `BlockTransaction` (que ya guarda cada transacción aplicada) o de `NOTIFY`.

## Consequences

- Positivas:
  - dos procesos menos en cada despliegue;
  - ninguna tabla crece sin lector;
  - lo escrito se encuentra y aparece en «Vinculado desde» en la misma transacción.
- Negativas:
  - no hay una cola durable de cambios para un consumidor externo;
  - la migración que borra las tablas del outbox descarta los eventos pendientes, que ya no tienen a quién entregarse.

## Governance

Una necesidad de integración externa se resuelve con un ADR nuevo y no restaurando el outbox por inercia.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20 (no está en producción; se autorizó cambiar sin convivencia)
- El convertidor de páginas a bloques (`blocks:migrate`) existió solo para la migración única de desarrollo y se retiró junto con el modelo viejo. Una instalación que aún tenga páginas del modelo anterior las perdería al aplicar `drop_page_model`.
