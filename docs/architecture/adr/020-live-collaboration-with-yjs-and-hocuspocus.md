# 020: Colaboración en vivo con Yjs y Hocuspocus dentro del backend

**Status:** Superseded
**Superseded by:** 021
**Date:** 2026-10-19

## Context

Varias personas editan la misma página a la vez, y ninguna puede perder lo que escribió. Una página es un documento ProseMirror guardado en `Page.content` (ADR 008), con permisos por página y un rol CLIENT que solo lee. Todo tiene que correr en la infraestructura gratuita, sin servicios pagados.

La colaboración se implementó el 3 de agosto de 2026 (commit `0637519`) sin un ADR. Este documento la registra después, con lo que muestra el código y el diseño de Neuma (`docs/superpowers/specs/2026-08-01-neuma-design.md`, sección Collaboration).

## Alternatives Considered

- **Guardar a pedido por REST, sin tiempo real.**
  - PRO: lo más simple; no hay conexión abierta.
  - CON: con dos personas en la misma página, la que guarda al final pisa a la otra, y nadie ve el cambio ajeno hasta recargar.
- **`prosemirror-collab`, la colaboración por pasos de ProseMirror.**
  - PRO: viene del mismo editor que ya usamos.
  - CON: el servidor tiene que ser la autoridad que ordena y guarda cada paso. La presencia, la reconexión y la persistencia se escriben a mano.
- **Un servicio administrado de colaboración.**
  - PRO: nada que operar.
  - CON: se paga por uso, el contenido de cada página pasa por un tercero, y rompe la regla de correr todo en la infraestructura gratuita.
- **Yjs con Hocuspocus dentro del backend (elegida).**
  - PRO: Yjs es un CRDT y mezcla ediciones simultáneas sin conflictos. `y-prosemirror` lo conecta con el editor. Hocuspocus da el WebSocket y los ganchos para autenticar, cargar y guardar, y corre en el mismo proceso NestJS. Todas tienen licencia MIT.
  - CON: el contenido queda en dos formas que hay que mantener iguales, el estado Yjs y el JSON de la página. Con un solo nodo no hay coordinación entre servidores.

## Decision

La colaboración usa Yjs en el navegador y Hocuspocus en el backend, por el WebSocket `/api/v1/collaboration` (`collaboration.transport.ts`).

- **Entrada.** El navegador pide un token a `POST /api/v1/collaboration/token`. El backend lo emite solo si la persona puede ver la página, y nunca en modo escritura para un CLIENT (`collaboration.token.service.ts`).
- **Permisos en cada paso.** Hocuspocus revisa el token y el permiso al conectar, al cargar, en cada mensaje y antes de guardar (`collaboration.gateway.ts`). Sin permiso de escritura, la conexión queda de solo lectura.
- **Dos cosas se guardan.** El snapshot Yjs va a `CollaborationSnapshot`, para retomar la edición donde quedó. El documento ProseMirror va a `Page.content` con su `PageVersion` y un evento del outbox, en una transacción. El guardado espera 250 ms después del último cambio y nunca más de 2 segundos.
- **La colaboración no es la fuente de verdad del dominio.** Sincroniza el contenido; identidad, permisos, versiones y papelera son del dominio de páginas.
- **Apagado.** Antes de cerrar la base, el backend cierra las conexiones y espera los guardados pendientes.
- **El WebSocket va directo al backend,** no por el portal (ADR 014).

## Consequences

- Positivas:
  - dos o más personas editan a la vez y ninguna pisa a otra;
  - un permiso revocado se nota en el siguiente mensaje, no al reconectar;
  - la búsqueda y los retroenlaces se actualizan por el outbox, igual que con cualquier otra escritura.
- Negativas:
  - si la escritura de `Page.content` falla después de guardar el snapshot, la página queda atrás de su documento en vivo hasta el siguiente guardado; el error va al log;
  - un solo nodo de colaboración, porque los documentos abiertos viven en la memoria de ese proceso.
- Aceptado como costo: para tener más de un nodo hace falta coordinación entre servidores; el diseño la deja para cuando se necesite (Valkey).

## Governance

Los ganchos de `collaboration.gateway.ts` son el único lugar donde la colaboración lee o escribe. Este ADR se revisa si Neuma necesita más de un nodo de colaboración, o si Hocuspocus cambia de versión mayor.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-19, registrado después de implementar
- Approved by: TBD
- Implementado: 2026-08-03 (`0637519`)
- Diagrama: `docs/architecture/diagramas/2-edicion-en-vivo.html`
