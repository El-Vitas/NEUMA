# 016: Cerrar el registro y crear el primer administrador desde el servidor

**Status:** Accepted
**Date:** 2026-10-11

## Context

`POST /api/v1/users` era público: venía de la plantilla inicial, con dos reglas que lo describían (BR-012, «al registrarse, el usuario se crea como CLIENT», y BR-013, «el registro inicia sesión»). Un CLIENT puede leer los espacios `PUBLIC_INTERNAL`. Comprobado el 2026-10-11 en desarrollo: una cuenta creada sin sesión listó los espacios internos y encontró sus páginas en la búsqueda. Además, el diálogo de administración «Nuevo usuario» del portal usaba ese mismo pedido público, sin rol y sin token.

En una instalación nueva tampoco había forma de llegar a ser administrador sin editar la base a mano.

## Alternatives Considered

- **Registro abierto y la primera cuenta queda como administrador.** PRO: no hace falta ningún paso extra. CON: hay una carrera al desplegar (quien llegue primero se queda con el sistema) y el conocimiento interno sigue abierto a cualquiera. Rechazada.
- **Crear el primer administrador al arrancar, desde variables de entorno.** PRO: es automático. CON: la contraseña queda en el entorno del contenedor y en la configuración del despliegue, y hay que acordarse de quitarla. Rechazada.
- **Registro por invitación.** PRO: es lo más completo para sumar gente. CON: requiere enlaces de un solo uso, su vencimiento y una pantalla nueva. Queda para cuando haga falta.
- **Cerrar el registro y crear el primer administrador con un comando en el servidor.** PRO: solo quien opera el servidor puede hacerlo, la puerta se cierra sola cuando ya existe un administrador y la contraseña no queda guardada en ninguna parte. CON: es un paso manual en cada instalación nueva.

## Decision

- `POST /api/v1/users` exige sesión y el permiso de crear usuarios, que solo tiene ADMIN. El rol se indica siempre y la respuesta es la cuenta creada, sin sesión.
- `bun run admin:create --email <correo> --name <nombre>`, con la contraseña por la entrada estándar, crea un ADMIN solo si no existe ninguno. Usa la misma validación y el mismo servicio que la API. Si la entrada es una terminal, se niega en vez de mostrar lo que se escribe.
- El portal elimina la vista de registro, que ya no tenía ruta. El diálogo «Nuevo usuario» envía el pedido con la sesión del administrador y deja elegir el rol con botones de opción, empezando por CLIENT.
- BR-012 y BR-013 quedan reemplazadas por BR-6925d74 y BR-5198703.

## Consequences

- Positivas: nadie entra sin que un administrador lo decida; una instalación nueva tiene un camino documentado para su primer administrador.
- Negativas: quien opera la instalación tiene que ejecutar un comando la primera vez. Si se pierde el acceso de todos los administradores, la recuperación sigue siendo editar la base.

## Governance

Un endpoint que crea identidades o da acceso no se marca como público. Las pruebas de integración de usuarios verifican el 401 sin sesión, el 403 sin el permiso y que el comando se niega cuando ya existe un administrador.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-11
