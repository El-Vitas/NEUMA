# 018: Revocar sesiones con una versión de token por usuario

**Status:** Accepted
**Date:** 2026-10-19

## Context

El token de renovación duraba siete días y no tenía estado: cerrar sesión no hacía nada en el servidor y cambiar la contraseña tampoco invalidaba los tokens anteriores. Una contraseña filtrada o un equipo perdido dejaban la sesión abierta toda la semana.

## Alternatives Considered

- **Guardar cada token de renovación y rotarlo en cada uso.** PRO: revoca un dispositivo puntual y detecta la reutilización de un token robado. CON: una tabla nueva con escrituras en cada renovación, limpieza de tokens vencidos y un caso de carrera cuando dos pestañas renuevan a la vez.
- **Versión por usuario dentro del token.** PRO: una columna entera y una comparación; el cambio de contraseña y el cierre de sesión la suben en la misma sentencia. CON: corta todos los dispositivos a la vez; no revoca uno solo.
- **Lista negra de tokens.** PRO: revoca un token puntual. CON: hay que guardar cada token revocado hasta que vence y consultarla en cada renovación.

## Decision

`User.tokenVersion` empieza en 0. Cada token de renovación lleva la versión con que se emitió (`ver`) y la renovación solo procede si coincide con la de la cuenta; un token emitido antes de este cambio cuenta como versión 0. Cerrar sesión sube la versión con un incremento atómico, y cambiar la contraseña la sube en la misma sentencia que guarda la contraseña nueva. Después del cambio, el portal vuelve a iniciar sesión con la contraseña nueva para no dejar fuera a quien la cambió.

## Consequences

- Positivas: cerrar sesión y cambiar la contraseña cortan la renovación en todos los dispositivos; no hay tabla nueva ni escrituras en cada renovación.
- Negativas: cerrar sesión en un equipo también la cierra en los demás. El token de acceso que ya circula vale hasta que vence, unos minutos.

## Governance

Las pruebas de integración de sesiones verifican el 401 del token anterior tras cerrar sesión y tras cambiar la contraseña. La regla de negocio vive en FEA-AUT. Si hace falta revocar un solo dispositivo, se reemplaza por la primera alternativa.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-19
