# 015: Mantener NestJS 11 hasta que `@nestjs/throttler` publique ESM

**Status:** Accepted
**Date:** 2026-10-11
**Related:** `002-migrate-backend-http-adapter-express-to-fastify.md`

## Context

NestJS 12 publica sus paquetes base como ESM con `await` de nivel superior. `@nestjs/throttler` 6.7.1, la última versión, sigue siendo CommonJS: al cargarlo, hace `require` de `@nestjs/core` 12, y Bun falla porque un módulo con `await` de nivel superior no se puede cargar con `require`. El arreglo existe (nestjs/throttler#2714, «publish as esm»), pero al 2026-10-11 sigue sin fusionar. El limitador protege el inicio de sesión y las rutas costosas.

## Alternatives Considered

- **Subir a NestJS 12 y reemplazar el throttler por un guard propio.** PRO: queda al día. CON: es código de seguridad propio que hay que mantener, para cubrir una espera que debería ser corta. Rechazada.
- **Parchear el paquete localmente.** PRO: desbloquea NestJS 12 ya. CON: un parche sobre una dependencia que se pierde o se rompe con cada actualización. Rechazada.
- **Quedarse en NestJS 11.** PRO: todo funciona y sigue con soporte. CON: hay que fijar las versiones vecinas a las que acepta NestJS 11.

## Decision

Los paquetes base de NestJS (`common`, `core`, `platform-fastify`, `testing`) quedan en 11.2.7, y `fastify` queda fijo en 5.11.3, la versión de `@nestjs/platform-fastify` 11.2.7: dos copias de Fastify tienen tipos incompatibles. Los paquetes que ya publican una versión compatible con NestJS 11 se actualizan (`@nestjs/config`, `jwt`, `passport` y `mapped-types` 12, `nestjs-pino` 5, `@fastify/static` 10).

## Consequences

- Positivas: el backend y el limitador funcionan sin cambios ni parches.
- Negativas: el backend queda una versión mayor atrás, y `fastify` no se puede subir por su cuenta.

## Governance

Revisar cuando nestjs/throttler#2714 se fusione y se publique: subir todos los `@nestjs/*` juntos y quitar la fijación de `fastify`.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
