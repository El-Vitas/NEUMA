# 012: Entregar cada evento del outbox a cada consumidor por separado

**Status:** Accepted
**Date:** 2026-10-11
**Depends on:** `010-adopt-prisma-orm-8.md`

## Context

Los cambios de página se anuncian con un outbox: en la misma transacción que guarda la página se escribe un `OutboxEvent`, y procesos aparte lo proyectan. Hay dos proyecciones, cada una en su worker: el índice de búsqueda y los retroenlaces («Vinculado desde»).

Las dos leían la misma tabla y el estado del procesamiento (`status`, `attemptCount`, `nextAttemptAt`, `lastError`) vivía en el evento. El primer worker que tomaba un evento lo marcaba `PROCESSED` y el otro no lo volvía a ver. Con los dos corriendo, como en Docker y en podman, cada cambio llegaba a una sola proyección: una página renombrada podía no encontrarse por su título nuevo, o una mención nueva no aparecer en «Vinculado desde». Estaba verificado en desarrollo desde agosto de 2026.

## Alternatives Considered

- **Un solo worker que aplique las dos proyecciones a cada evento.** PRO: no cambia el esquema. CON: un fallo en una proyección reintenta también la otra, no se pueden escalar ni desplegar por separado, y una tercera proyección vuelve a acoplarse. Rechazada.
- **Una columna `consumer` en el evento, con un evento por consumidor.** PRO: una sola tabla. CON: duplica la carga del evento por consumidor y mezcla el hecho con su procesamiento. Rechazada.
- **Una tabla de entregas por consumidor.** PRO: el evento queda inmutable; cada consumidor tiene su propio estado, reintentos y fallos; agregar un consumidor es agregar un valor. CON: una tabla más y un `JOIN` al reclamar.

## Decision

Usaremos `OutboxDelivery`: una fila por evento y consumidor (`OutboxConsumer`: `SEARCH`, `LINKS`), única por `(eventId, consumer)`, con el estado de procesamiento que antes estaba en el evento. `OutboxEvent` queda como el registro del hecho y pierde sus columnas de estado.

- Al crear un evento se crean sus entregas en la misma sentencia (`OUTBOX_CONSUMERS`), así que ningún consumidor puede perderlo.
- Cada worker recibe por inyección `OutboxRepository.forConsumer(consumidor)` y solo reclama sus entregas, con `FOR UPDATE SKIP LOCKED` y el mismo lease que antes.
- La migración `outbox_deliveries_per_consumer` crea una entrega por consumidor para cada evento existente. Los eventos fallidos conservan su fallo; todos los demás quedan pendientes para ambos consumidores, porque antes del cambio un evento «procesado» pudo llegar a uno solo. Volver a proyectarlos es seguro: la búsqueda compara versiones y los retroenlaces se reconcilian con el estado actual de la página.

## Consequences

- Positivas: cada proyección recibe todos los cambios; una caída de la búsqueda ya no atrasa los retroenlaces ni al revés.
- Negativas: al actualizar desde una versión anterior, los workers reprocesan una vez todos los eventos pendientes de entrega; con un historial grande eso toma tiempo, aunque el resultado es idempotente.

## Governance

Una proyección nueva agrega su valor a `OutboxConsumer` (contrato y migración), su entrada en `OUTBOX_CONSUMERS` y su token con `forConsumer`. La regla de negocio `BR-ac6957c` describe el comportamiento esperado, y `tests/integration/outbox.integration.spec.ts` lo verifica.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
