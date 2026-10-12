# 013: Desplegar con tres imágenes y las proyecciones en procesos aparte

**Status:** Accepted
**Date:** 2026-10-11
**Depends on:** `007-adopt-bun-as-package-manager.md`, `010-adopt-prisma-orm-8.md`, `012-deliver-outbox-events-per-consumer.md`

## Context

El despliegue (Docker Compose en local) levantaba la base, las migraciones, el backend y el portal. Los workers de búsqueda y de retroenlaces no se levantaban, así que en un despliegue la búsqueda devolvía cero resultados y «Vinculado desde» no aparecía. Además, la imagen del backend pesaba 2,25 GB: arrastraba la CLI de Prisma con sus herramientas de despliegue en la nube (alchemy, workerd y SDK de AWS, Cloudflare y Stripe), y las compilaciones glibc de módulos nativos que en Alpine (musl) nunca se cargan.

## Alternatives Considered

- **Correr los workers dentro del proceso del backend.** PRO: un servicio menos. CON: una proyección lenta o caída compite con las peticiones HTTP, no se pueden reiniciar ni escalar por separado, y se pierde el aislamiento que da el outbox. Rechazada.
- **Una imagen por worker.** PRO: cada imagen lleva solo lo suyo. CON: tres imágenes que comparten casi todo el código y las dependencias, con tres compilaciones que mantener. Rechazada.
- **Tres imágenes: servidor, portal y migraciones; los workers usan la imagen del servidor con otro comando.** PRO: una sola compilación para el backend y sus workers; la CLI de Prisma queda solo donde se usa. CON: la imagen de los workers trae el servidor HTTP aunque no lo use.

## Decision

- `neuma-backend` sirve la API y, con otro comando, corre `search-worker` y `links-worker`. Compose y los quadlets los declaran como servicios propios, que arrancan después de las migraciones y no tienen chequeo HTTP.
- `neuma-migrate` es la única imagen con la CLI de Prisma. En `@neuma/db` la CLI es una dependencia de desarrollo, así que la instalación de producción del backend no la incluye. La imagen de migraciones quita las herramientas de `prisma deploy` y `prisma dev`, que firmar y migrar nunca cargan.
- Las imágenes Alpine quitan las compilaciones `-gnu` de los módulos nativos.
- El backend y los workers se conectan con el rol de mínimos privilegios (`neuma_app`); solo las migraciones usan el dueño.
- Los chequeos de Postgres usan `pg_isready -h 127.0.0.1`: el servidor temporal del primer arranque solo escucha por socket, y por socket da «listo» antes de tiempo.

## Consequences

- Positivas: un despliegue nuevo tiene búsqueda y retroenlaces desde el primer cambio. El backend bajó de 2,25 GB a 929 MB y migraciones de 1,6 GB a 915 MB.
- Negativas: hay dos servicios más que vigilar, y su salud se ve en los logs, no en un chequeo HTTP. La lista de paquetes que se quitan depende de cómo empaqueta Prisma su CLI y hay que revisarla al actualizarla.

## Governance

Una proyección nueva agrega su servicio en `docker-compose.yml` y su `.container` en `deploy/podman/`. Al subir de versión la CLI de Prisma, se aplica una base vacía con la imagen de migraciones antes de publicarla.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
