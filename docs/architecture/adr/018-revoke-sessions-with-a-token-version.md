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

`User.tokenVersion` empieza en 0. Cada token de renovación lleva la versión con que se emitió (`ver`) y la renovación solo procede si coincide con la de la cuenta. Cerrar sesión sube la versión con un incremento atómico, y cambiar la contraseña la sube en la misma sentencia que guarda la contraseña nueva. Después del cambio, el portal vuelve a iniciar sesión con la contraseña nueva para no dejar fuera a quien la cambió.

## Consequences

- Positivas: cerrar sesión y cambiar la contraseña cortan la renovación en todos los dispositivos; no hay tabla nueva ni escrituras en cada renovación.
- Negativas: el token de acceso que ya circula vale hasta que vence, unos minutos. (La limitación de cerrar sesión en todos los equipos se levantó el 2026-10-24, ver más abajo.)

## Governance

Las pruebas de integración de sesiones verifican el 401 del token anterior tras cerrar sesión y tras cambiar la contraseña. La regla de negocio vive en FEA-AUT. Si hace falta revocar un solo dispositivo, se reemplaza por la primera alternativa.

## Rotación del token de renovación (2026-10-24)

La primera alternativa descartada arriba pasó a ser la decisión para el cierre de sesión y la renovación. La versión por usuario se mantiene como segundo freno. El ADR sigue en este archivo porque no cambia el problema, solo completa la solución.

- **Tabla `RefreshSession`.** Cada token de renovación es una fila. El `id` de la fila es el `jti` del token. Cada inicio de sesión abre una familia (`familyId`) y cada renovación agrega una fila a esa familia. Las columnas `usedAt`, `replacedById` y `expiresAt` dicen si el token se gastó, quién lo reemplazó y cuándo vence.
- **Cada renovación gasta el token presentado y emite uno nuevo.** El gasto es una sola sentencia `UPDATE ... WHERE usedAt IS NULL AND expiresAt > ahora` dentro de la misma transacción que inserta el sucesor. Si dos peticiones llegan con el mismo token, solo una gana la fila; la otra espera su commit y ve el token ya gastado.
- **Reutilización.** Un token gastado hace más de 10 segundos que vuelve a presentarse se trata como robo. Se borra toda su familia y la respuesta es 401. Los demás dispositivos tienen otra familia y siguen con la sesión abierta.
- **Ventana de gracia de 10 segundos.** El portal agrupa las renovaciones paralelas de un mismo proceso, pero dos pestañas o dos peticiones que cruzan el cambio de cookie siguen enviando el token viejo. Dentro de la ventana, y mientras el sucesor no se haya gastado, el token viejo recibe de nuevo el mismo sucesor. El token de renovación se firma con el `iat` y el `exp` de su fila, así que firmar la misma fila dos veces da la misma cadena y no hace falta guardar el token. Pasada la ventana, o si el sucesor ya se usó, es reutilización.
- **Cerrar sesión** borra la familia del dispositivo. El token de acceso lleva la familia (`sid`) para saber cuál; uno que no la lleva se rechaza como inválido.
- **Cambiar la contraseña** sube `tokenVersion` y borra todas las filas de la cuenta, en la misma transacción.
- **Limpieza.** `RefreshSessionRetentionScheduler` borra cada seis horas las filas vencidas, con el mismo patrón que la retención de notificaciones.
- **Despliegue.** Un token de renovación sin `jti` se rechaza, así que cada persona inicia sesión una vez al desplegar. Aceptar los tokens antiguos habría dejado una ventana de siete días sin detección de robo.

Costo asumido. Cada renovación escribe dos filas y el cierre de sesión ya no corta los demás dispositivos. Que un token de renovación robado se use antes que el legítimo sigue sin detectarse hasta que el dueño se renueva, y en ese momento se corta la familia.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-19
- Modified: 2026-10-24. Rotación del token de renovación con detección de reutilización por familia y ventana de gracia. Cerrar sesión deja de cortar los demás dispositivos.
