# 014: La dirección del socket de colaboración se fija al construir el portal

**Status:** Accepted
**Date:** 2026-10-11

## Context

La edición en vivo abre un WebSocket desde el navegador directo contra el backend (Hocuspocus); no pasa por el servidor de Next. Su dirección es `NEXT_PUBLIC_COLLABORATION_WS_URL`, y Next solo pone en el bundle del navegador una variable pública escrita con su nombre completo. El portal la leía con `envSchema.parse(process.env)`, que en el navegador recibe un objeto vacío, así que siempre usaba el valor por defecto, `ws://localhost:3000`. En desarrollo coincidía por casualidad. En Docker la edición en vivo fallaba en silencio y no guardaba nada.

## Alternatives Considered

- **Pasar el socket por el servidor de Next (proxy).** PRO: una sola dirección pública. CON: el servidor standalone de Next no hace proxy de WebSockets y habría que agregar uno propio. Rechazada.
- **Entregar la dirección en tiempo de ejecución** (el servidor la pone en la página). PRO: una misma imagen sirve en cualquier entorno. CON: hay que llevarla por el árbol de componentes hasta la sesión de colaboración, y cambia más código que el problema. Queda como opción si se necesita una imagen única para varios entornos.
- **Fijarla al construir.** PRO: es el mecanismo estándar de Next y el cambio es mínimo. CON: cada entorno necesita su propia imagen del portal.

## Decision

`NEXT_PUBLIC_COLLABORATION_WS_URL` es un argumento de compilación del Dockerfile del portal. Compose lo toma de `COLLABORATION_WS_URL`. `config/env.config.ts` lee la variable por su nombre completo para que Next la ponga en el bundle.

## Consequences

- Positivas: la edición en vivo funciona en Docker y en podman.
- Negativas: cambiar la dirección pública del backend obliga a reconstruir la imagen del portal.

## Governance

Toda variable `NEXT_PUBLIC_*` nueva se agrega en `config/env.config.ts` con su nombre completo y, si cambia según el entorno, como argumento de compilación del Dockerfile.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
- Modified: 2026-10-20 — Con la edición sobre bloques (ADR 021) ya no hay socket de colaboración. La variable pasó a `NEXT_PUBLIC_LIVE_WS_URL` (en compose, `LIVE_WS_URL`) y apunta directo al canal en vivo del backend, `/api/v1/blocks/live`. Lo decidido, fijar la dirección al construir el portal, sigue igual.
