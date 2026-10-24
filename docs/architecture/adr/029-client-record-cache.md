# 029: Caché local de registros y modo cliente

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `025-views-as-reducer-queries.md`, `026-collection-change-notices.md`
**Precedes:** nada del plan `2026-10-20-paridad-con-notion.md`. Cierra la desviación que ADR 026 dejó anotada en su implementación (recolocar en local).

## Context

Hoy el navegador no guarda nada entre visitas. Una página o una vista se pide al servidor cada vez que se abre, y una colección se dibuja en el servidor de Next (componentes de servidor con caché por espacio). Cuando otra persona mueve una tarjeta, el aviso de ADR 026 llega, el portal invalida la caché del espacio con una acción del servidor y la vista se consulta y se dibuja entera. ADR 026 lo anotó como desviación. No hay un almacén de filas en el cliente donde recolocar una tarjeta, así que el filtro, el orden y la tabla de excepciones de ese ADR quedaron sin dueño.

Lo que escribe una persona tampoco sobrevive a un cierre. La cola de transacciones del editor (`createTransactionQueue`) vive en memoria. Si la red cae, reintenta con el mismo id de transacción, que el servidor responde desde lo que guardó, pero si se cierra la pestaña antes de que vuelva la red, lo escrito se pierde sin aviso.

`docs/architecture/references/notion-views-and-databases.md` (sección 3) describe lo que hace Notion. Una caché de registros por tabla, id y versión, persistida en SQLite sobre WebAssembly con OPFS. Consultas reactivas que se vuelven a ejecutar al cambiar las tablas que leen. Transacciones optimistas que se guardan en una cola persistente antes de enviarse. Ante un fallo, el cliente vuelve a pedir los registros tocados en vez de deshacer con operaciones inversas. Un modo cliente para conjuntos chicos, donde el navegador filtra y ordena con el mismo motor que el servidor.

Lo que ya existe y se reutiliza.

- `createBlockStore` guarda por bloque el contenido, la versión, el rol y un documento Yjs. Ya compara versiones, entierra y revive bloques y sabe qué le falta (`findBehind`).
- El canal en vivo ya tiene `sync` por versiones, con `revoked` en la respuesta, y `transactions` con ids idempotentes. Los avisos de colección (`collection-changes`, `collection-resync`, `collection-revoked`) existen desde ADR 026.
- `POST spaces/:spaceId/pages/:pageId/changes` devuelve filas cambiadas, ids a papelera, `total`, `isReset` y un cursor opaco por `changeXid`. Hoy lo usa el MCP.
- El motor de `packages/shared` (`matchesPageFilter`, `comparePageRowsBySorts`, `computePageCalculation`) es el oráculo de la semántica y ya tiene prueba de paridad contra el SQL.
- Regla del portal. Un componente de cliente nunca llama al backend con `fetch`. Las lecturas y escrituras en lote pasan por acciones del servidor. El canal en vivo es la excepción, porque se abre con un token de un solo uso que entrega una acción.

### Medición

Hecha para este ADR en Chrome (Playwright, perfil limpio, localhost), con filas de 386 bytes de JSON (estado, número, selección múltiple, persona, texto). SQLite WASM es `@sqlite.org/sqlite-wasm` 3.50.4 con el VFS `opfs-sahpool` en un worker, que no exige las cabeceras COOP y COEP. IndexedDB es el nativo, con una tabla `row` por `id`. «En memoria» es el motor de `packages/shared` sobre el arreglo ya cargado, empaquetado con `bun build`.

| Medida | 10.000 filas | 50.000 filas |
|---|---|---|
| IndexedDB, escribir todo en una transacción | 226 ms | 1.404 ms |
| IndexedDB, abrir la base | 35 ms | 122 ms |
| IndexedDB, leer todo (`getAll`) en arranque en frío | 43 ms | 217 ms |
| IndexedDB, 50 lecturas por id | 2 ms | 3 ms |
| SQLite WASM, cargar el WASM e iniciar el VFS en arranque en frío | 38 ms | 39 ms |
| SQLite WASM, insertar todo en una transacción | 150 ms | 840 ms |
| SQLite WASM, leer todo y convertir de JSON | 54 ms | 261 ms (60.000 filas) |
| SQLite WASM, filtro por estado y número, orden, 50 filas | 15 a 20 ms | 94 a 97 ms (60.000 filas) |
| SQLite WASM, conteo por grupo | 19 a 22 ms | 126 a 135 ms (60.000 filas) |
| En memoria, el mismo filtro y orden, 50 filas | 3,5 ms | 9 a 13 ms |
| En memoria, filtro `O` con lista contiene | 3,6 ms | 7 a 9 ms |
| En memoria, conteo por grupo | 0,3 a 1,2 ms | 1,6 a 2,7 ms |
| Espacio usado (IndexedDB / SQLite con su índice) | 5,2 MB / 11 MB | 23 MB / 39 MB |

Lo que dicen las cifras. El arranque en frío es parecido (IndexedDB abre y lee 10.000 filas en unos 80 ms; SQLite tarda unos 40 ms en estar listo y 54 ms en entregar las filas). Lo que decide es la consulta. Con el motor compartido sobre memoria, filtrar y ordenar 10.000 filas cuesta 3,5 ms y 50.000 cuestan 13 ms. SQLite las resuelve con `json_extract` en 15 a 20 ms y 95 ms, porque la celda es JSON y no hay columna que indexar. Para ser más rápido tendría que tener una columna por propiedad, que es el modelo de valores tipados que ADR 025 descartó. El cálculo local no es el límite del modo cliente. El límite es traer las filas, que a unos 390 bytes son 3,9 MB por cada 10.000.

Las cifras son de una máquina de desarrollo y se repiten en las pruebas de rendimiento de la implementación. El banco de pruebas es descartable y no entra al repositorio.

## Alternatives Considered

### Dónde se guarda y se consulta

- **SQLite WASM con OPFS (como Notion).**
  - PRO: consultas SQL y reactividad por tablas. Fila por fila y con índices, escala a millones.
  - CON: una dependencia nueva con 1,3 MB de WASM y JavaScript, un worker y un VFS. La semántica de filtros y orden estaría en una tercera implementación (`json_extract`), o habría que cargar todo al motor de TypeScript, con lo que SQLite solo sería almacenamiento. Más lenta que memoria para las consultas que nos importan (15 a 20 ms contra 3,5 ms con 10.000 filas) y más grande en disco (11 MB contra 5,2 MB). Notion la usa porque su motor de consulta es SQL. El nuestro es el de `packages/shared`.
- **IndexedDB como persistencia y un almacén en memoria como motor de consulta (elegida).**
  - PRO: sin dependencias. El motor de consulta es el que el servidor ya prueba. Arranque medido en 80 ms con 10.000 filas. La semántica sigue en un solo lugar.
  - CON: las consultas viven en la memoria de la pestaña, así que el tamaño que se carga está acotado (ver «Tamaño y expulsión»). Sin índices, un filtro recorre todas las filas cargadas (3,5 ms con 10.000 filas, 13 ms con 50.000). Hay que escribir una envoltura pequeña de IndexedDB.
- **Solo memoria, sin persistencia.**
  - PRO: lo más simple.
  - CON: no pinta al abrir, no guarda lo escrito sin conexión y no sirve a las dos necesidades de la etapa.

### Qué se guarda

- **Páginas completas serializadas.**
  - PRO: una clave por página.
  - CON: una edición ajena obliga a reescribir la página, y dos páginas que comparten un bloque lo duplican.
- **Registros por `id` y versión, más resultados de consultas como listas de ids (elegida).**
  - PRO: una fila de una colección se guarda una vez aunque aparezca en tres vistas. Se actualiza con `{ id, version }`, que es lo que ADR 026 ya manda. Coincide con el almacén de bloques que el editor ya tiene.
  - CON: un resultado guardado es una lista de ids que hay que resolver contra los registros, y un registro que falta obliga a revalidar.

### Modo cliente

- **Siempre consulta en el servidor (hoy).**
  - PRO: nada nuevo.
  - CON: cada cambio de filtro, orden o agrupación, y cada «cargar más», es una ida y vuelta. Con filas ya en el cliente no tendría por qué serlo.
- **Todas las colecciones en modo cliente.**
  - PRO: un solo camino.
  - CON: una colección de 100.000 filas no cabe en la pestaña ni se trae en un tiempo razonable. Las relaciones, los rollups y la búsqueda necesitan datos o normalización que el cliente no tiene.
- **Modo cliente bajo un umbral medido, con el servidor por encima (elegida).**
  - PRO: lo chico se siente local (filtrar y reordenar sin red) y lo grande sigue acotado por el servidor. El cliente usa el mismo motor que el servidor, probado por paridad.
  - CON: hay dos caminos que mantener y probar. Un umbral que habrá que ajustar con datos reales.

### Qué hace una cola que falla

- **Deshacer con operaciones inversas.**
  - PRO: no vuelve a pedir nada.
  - CON: la inversa de una operación relativa a un vecino que otra persona ya movió es incorrecta, y una transacción rechazada por permisos no tiene un estado anterior que restaurar.
- **Vuelve a pedir los registros tocados y muestra lo no aplicado (elegida, es lo que hace Notion).**
  - PRO: el estado local pasa a ser el del servidor sin adivinar. Lo escrito que no se aplicó se conserva a la vista y no se pierde.
  - CON: una ida más por fallo, y una interfaz para los cambios rechazados.

## Decision

### Almacén en memoria y persistencia en IndexedDB

El portal tiene un almacén de registros por usuario, en memoria, con persistencia en IndexedDB. Es el mismo que ya usa el editor para los bloques, ampliado en vez de un segundo almacén. `createBlockStore` conserva su contrato y gana suscripciones por id (`subscribe(id, listener)` y una versión por registro) para que React lea con `useSyncExternalStore`. Una tarjeta que cambia repinta solo esa tarjeta.

Una base de IndexedDB por usuario y espacio de trabajo, `neuma-cache:<workspaceId>:<userId>`, con estos almacenes.

| Almacén | Clave | Contenido |
|---|---|---|
| `records` | `id` | `{ id, version, spaceId, parentId, alive, body, readAt }`. El cuerpo es lo que ya entrega `sync` (propiedades, formato, hijos, rol). El texto vivo sigue en Yjs en memoria. |
| `results` | `viewId` + hash de la consulta | `{ ids, groups, nextCursors, total, viewVersion, schemaVersion, changesCursor, savedAt }`. Es la lista de ids que la consulta devolvió, sin los registros. |
| `meta` | clave fija | `{ cacheVersion, userId, lastValidatedAt }`. |
| `transactions`, `rejected` | autoincremental | La cola persistente (ver abajo). |

- El hash de la consulta cubre `viewId`, la versión de la vista, la versión del esquema, `quickFilter`, `search`, `sorts` y la zona. Si cambia cualquiera de esos al revalidar, la entrada se descarta. Los registros se quedan, porque siguen valiendo por su versión.
- `cacheVersion` sube cuando cambia la forma de lo guardado. La caché es descartable. Una versión nueva borra `records` y `results` y conserva `transactions` y `rejected`, que son el trabajo de la persona y se migran, no se descartan.
- Si IndexedDB no está disponible (ventana privada, bloqueo de datos del sitio), el almacén funciona solo en memoria y la interfaz lo dice cuando hay cambios pendientes («se perderán si cierras la pestaña»). Nunca se queda mudo.
- Sin dependencias. La envoltura de IndexedDB es un módulo pequeño de `apps/portal/modules/pages/local-cache/`, con sus tipos, constantes y funciones puras como el resto del portal.

### Tamaño y expulsión

- Tope por usuario: el menor entre 50 MB y el 10 % de la cuota que informa `navigator.storage.estimate()`. Con 390 bytes por fila, 50 MB son unas 100.000 filas. Sobre el 90 % de la cuota del navegador no se persiste nada nuevo.
- Expulsión por uso. La unidad es la colección o la página. Cada una guarda `lastAccessAt`, y al pasar el tope se expulsan las menos recientes hasta bajar al 80 %. Los registros que alguna entrada de `results` aún cita se expulsan junto con ella.
- Un `QuotaExceededError` expulsa el 20 % menos reciente y reintenta una vez. Si vuelve a fallar, el almacén sigue en memoria y deja un `ERROR` con traza.
- Una entrada sin validar en 30 días se descarta al abrir. Es el límite de cuánto tiempo puede mostrarse algo que la persona ya no podría leer si estuviera conectada (ver «Revocación»).
- Lo que no se persiste: archivos adjuntos (el navegador ya los cachea por HTTP), resultados de búsqueda por texto y colecciones por encima del tope de las filas que se cargan en memoria (ver «Modo cliente»).

### Aislamiento por usuario y cierre de sesión

- Un perfil de navegador guarda la caché de **un solo usuario**. Al iniciar sesión, el portal borra toda base `neuma-cache:*` que no sea del usuario que entra. Una persona que usa un navegador compartido nunca ve datos de otra: aunque la sesión anterior terminara por vencimiento y no por salir, el inicio de la siguiente la borra antes de pintar nada.
- Cerrar sesión borra la base del usuario antes de redirigir. Si hay transacciones pendientes sin enviar, el portal las muestra y pide confirmar («Tienes N cambios sin enviar; si sales se pierden»). Confirmar las descarta, y no hay otra vía en la que se pierda texto sin que la persona lo haya decidido.
- Una sesión revocada por versión de token (ADR 018) cierra la sesión del navegador, y ese cierre borra la caché igual.
- La caché no se cifra en disco. Las claves tendrían que vivir en el mismo JavaScript que la lee, y el cifrado no protegería de quien puede ejecutar código en la página ni de quien tiene el disco con el perfil abierto. La protección es el perfil del navegador, que ya contiene las cookies de sesión. Queda como riesgo aceptado.

### Pintar desde caché y revalidar

Al abrir una página o una vista.

1. Se lee `results` y los `records` que cita y se pinta de inmediato, con una marca de «actualizando» discreta.
2. Se revalida. Para una colección, `changes` con el `changesCursor` guardado. Para una página, `sync` con `{ id, version }` de los bloques que se tienen.
3. Se aplica lo que llega (filas nuevas o cambiadas, `trashedIds`) y se recoloca en local (ver abajo). Se guarda el cursor nuevo.
4. Se repite la consulta completa, y se reemplaza la entrada, solo si `isReset` es verdadero, si cambió la versión de la vista o del esquema, si `total` no coincide con el conteo local de filas visibles (señal de una fila que se ocultó), o si la entrada no existía.
5. Se suscribe el canal de la colección. Cada reconexión repite los pasos 2 a 4, en lugar de repetir siempre la consulta como hace ADR 026.

El portal arma la primera visita en el servidor como hoy y siembra el almacén con lo que el servidor leyó. Las visitas siguientes pintan desde la caché mientras la ruta del servidor aún no responde. Para eso el cuerpo de la vista (tabla, tablero, galería, lista, calendario, línea de tiempo, gráfico) pasa a ser un componente de cliente que lee del almacén, y la ruta de colección usa como `loading` ese mismo componente en modo caché. Barra, pestañas y configuración siguen siendo componentes de servidor.

Los agentes no usan esta caché, porque no tienen navegador. Siguen con `query_collection` y `collection_changes` de ADR 025 y 026, que ya son su camino de «dame solo lo que cambió». La caché es del portal, pero no cambia nada de lo que ve un agente.

### Modo cliente

Una colección se abre en modo cliente cuando se cumplen las tres condiciones.

1. Tiene como máximo **10.000 filas visibles para quien la abre** y su carga no pasa de 6 MB. El conteo sale de la agregación `COUNT_ALL` de ADR 025 y se guarda con la entrada.
2. El filtro y el orden de la vista, del filtro rápido y de las columnas pedidas no usan relaciones a filas no cargadas, rollups ni fórmulas (etapa 10 declara qué usa cada una).
3. No hay una búsqueda de texto activa. La normalización de acentos y mayúsculas de `Block.text` está en el servidor, y la tabla de ADR 026 ya manda repetir la consulta en ese caso.

En modo cliente el servidor entrega **todas las filas** de la colección con sus valores, en páginas de 1.000 por el reductor `results` (hoy el tope por página es 100, y 1.000 es el tope por respuesta que ADR 025 ya fija; el cambio es permitir esa página cuando la petición pide todas las propiedades). Todas las filas pasan por el mismo conjunto denegado y el mismo control de permisos que cualquier consulta, así que el cliente nunca recibe una fila que no puede leer. Con las filas cargadas, el navegador hace con el motor compartido todo lo que hoy hace el servidor para esa vista.

- Filtrar (`matchesPageFilter`), ordenar (`comparePageRowsBySorts`, con `manualOrder` incluido: viaja entera porque la colección es chica y su tope es 20.000 ids), agrupar, contar y calcular pies de tabla (`computePageCalculation`).
- Cambiar filtro, orden, agrupación o «cargar más» no hace peticiones. Cambia solo el cálculo local.
- Los filtros con fechas relativas y «yo» se evalúan con la zona y el usuario del cliente, como ya prevé ADR 026.

Por encima del umbral, o cuando la condición 2 o 3 deja de cumplirse (la persona escribe en el buscador, agrega un filtro por relación), la vista pasa al camino del servidor sin parpadeo. Las filas ya cargadas se conservan como caché de registros y la lista de ids se vuelve a pedir con el reductor. Con más de 10.000 filas, ninguna fila se guarda para el modo cliente. Solo se guardan las que cada `results` entregó.

**Medición.** La compute no pone el límite (10.000 filas filtran y ordenan en 3,5 ms, 50.000 en 13 ms). Lo pone el costo de traer todas las filas. El valor inicial de 10.000 es el tamaño de la tabla que el plan manda medir. Se confirma en la implementación con el endpoint real (tiempo hasta pintar y peso de la respuesta) y se corrige aquí con una nota si el p95 de la primera carga pasa de 1,5 s.

### Recolocación local en los avisos de colección

Con la caché y el almacén por id, el cliente hace lo que ADR 026 describió y no implementó.

1. `collection-changes` entrega `{ id, version }`. El cliente descarta las que ya tiene y agrupa en 150 ms.
2. Pide esos registros por id en una petición (tope de 200 ids, como ya decidió ADR 026) y los escribe en el almacén. Solo los componentes que muestran esas filas se repintan.
3. Recoloca cada fila con el motor compartido, con la tabla de excepciones de ADR 026 sin cambios (búsqueda, relaciones, rollups y fórmulas, orden manual con versión de vista mayor, `collection-resync`, cursor viejo, lote de más de 200). En modo cliente la fila siempre está cargada y las dos filas de «la fila no está cargada» no aplican.
4. Los conteos de grupo se ajustan al mover y se verifican con una sola petición de `aggregations` por ráfaga. En modo cliente se recalculan en local.

La acción `refreshPageCollectionAction` y la invalidación de la caché del servidor dejan de ser la respuesta a un aviso. Siguen existiendo para la primera carga y para los casos de la tabla de excepciones.

### Cola de transacciones persistente

Cada transacción se guarda en `transactions` de IndexedDB **antes** de enviarse, y se borra al recibir la respuesta del servidor. Su `id` es el que ya genera el cliente, y es el que se manda en cada reintento. El servidor ya responde un id repetido desde lo que guardó, de modo que un reenvío tras cerrar y abrir la pestaña es seguro.

- **Estados.** `pending`, `sending`, `rejected`. Las operaciones de texto llevan la actualización de Yjs ya calculada contra la última versión confirmada, y se pueden reenviar sin el documento en memoria. Se guarda también, por cada propiedad de texto tocada, el texto plano resultante (`preview`) para poder mostrarlo.
- **Una sola pestaña envía.** Un cerrojo de Web Locks (`neuma-queue:<usuario>`) elige la pestaña que vacía la cola, y las demás escriben en IndexedDB y avisan por `BroadcastChannel`. Si la pestaña dueña se cierra, otra toma el cerrojo y sigue por el orden de la clave autoincremental.
- **Reintentos.** Los tiempos de espera de hoy se conservan (`computeCollaborationReconnectDelayMs`, la espera propia del límite de tasa). Sin conexión no se pierde nada. Al abrir el navegador de nuevo, la cola arranca sola cuando hay sesión y red.
- **Estado visible.** El indicador del editor y de las vistas gana «Sin conexión, N cambios pendientes» y «N cambios sin aplicar». Un cambio que está en la cola se ve aplicado en pantalla (optimista), y una marca discreta lo distingue de lo confirmado.
- **Rechazo.** Si el servidor rechaza una transacción (permisos, validación, entidad ya borrada), el cliente (1) la pasa a `rejected` sin borrarla, (2) vuelve a pedir los registros que tocó, por `sync`, y deja el almacén igual al servidor, (3) retiene las transacciones siguientes, porque se escribieron sobre lo que esa asumía, y le presenta a la persona cada cambio no aplicado con su texto y las opciones «copiar» y «descartar». Reintentar el resto es una decisión de la persona, no automática. Nunca se descarta texto sin que lo decida ella. Es lo que hace Notion, sin operaciones inversas.
- **Escrituras de las vistas.** Hoy un cambio de celda, un movimiento de tarjeta y una fila nueva van por acciones del servidor y no por el canal de transacciones. En esta etapa pasan por la cola los que el vocabulario del canal permite a un cliente: cambiar una celda (`set`), reordenar (`listAfter`, `listBefore`) y crear una fila. Los que ADR 025 reserva al backend (`changeValueList` para selección múltiple y persona, `move-row` con valores de varios valores) siguen en línea y, sin conexión, la interfaz los deshace y lo dice. Ampliar el vocabulario del cliente exige un ADR propio.
- **Sin IndexedDB.** La cola vive en memoria como hoy y el aviso lo dice.

### Seguridad y revocación

- **La caché obedece al servidor, no al revés.** `collection-revoked`, `revoked` en una respuesta de `sync` y un 403 o 404 al leer una página purgan de inmediato esos registros del almacén y de IndexedDB, y las entradas de `results` que los citan.
- **`collection-resync` y fila oculta.** Al recibir `collection-resync`, el cliente manda sus ids y versiones guardados de esa colección (por tandas de 1.000) en un `sync`. Las filas que el lector ya no puede leer vuelven en `revoked` y se purgan. Es el mismo camino que ya usa la revocación de una página, sin una vía nueva. En modo cliente, además, la lista completa de filas que llega reemplaza la anterior y las que faltan se borran.
- **Pérdida de acceso a un espacio.** Al iniciar sesión y al reconectar, el portal compara los espacios que puede ver con los que tiene en la caché y purga los que ya no.
- **Sin conexión.** Un permiso quitado mientras no hay red no se puede conocer. La caché muestra lo último que se vio, marcada «sin conexión», hasta 30 días. Pasado ese plazo, o al primer contacto con el servidor, se revalida o se purga. Es una limitación, y no se oculta.
- **Conteos.** `total` de `changes` sigue siendo el conteo de filas legibles. Si no coincide con lo local, se vuelve a consultar.
- **Lo escrito pendiente que ya no se puede aplicar** (la persona perdió el permiso) pasa a `rejected` y no se reenvía.

### Errores y observabilidad

- Todo fallo de IndexedDB, de escritura de caché o de lectura es un `Result` con código o un `ERROR` con traza. Nunca una caché vacía en silencio.
- Cada repetición completa de una consulta se registra en `WARN` con su causa (la tabla de ADR 026 más `cache-miss`, `reset`, `total-mismatch`, `cache-version`), para medir cuánto cuesta cada excepción y cuánto se ahorra.
- La guarda de bucle de ADR 026 (más de 5 consultas por segundo por vista) se mantiene.
- El portal registra el origen de cada pintura (`cache`, `server`) y el tiempo hasta cada una.

## Consequences

- Positivas:
  - abrir una página o una vista ya visitada pinta sin esperar al servidor, y la revalidación manda solo lo que cambió;
  - mover una tarjeta en una ventana la recoloca en la de otra persona sin consulta ni redibujo, y se repinta solo esa tarjeta;
  - en colecciones de hasta 10.000 filas, filtrar, ordenar, agrupar y contar es instantáneo y sin red, con el mismo motor que el servidor;
  - lo escrito sin conexión sobrevive a cerrar la pestaña y se reenvía solo, con ids idempotentes;
  - un rechazo no pierde texto ni deja el cliente en un estado inventado;
  - ninguna dependencia nueva.
- Negativas:
  - el cuerpo de las vistas deja de dibujarse en el servidor y pasa a un componente de cliente, lo que toca la tabla, el tablero, la galería, la lista, el calendario, la línea de tiempo y el gráfico;
  - hay dos caminos de lectura de filas (cliente y servidor), con una prueba de equivalencia que los vigila;
  - el navegador guarda datos del usuario sin cifrar hasta que cierra sesión, con un riesgo aceptado;
  - un permiso quitado sin conexión sigue visible hasta que vuelve la red o pasan 30 días;
  - una colección de hasta 10.000 filas se descarga completa la primera vez, unos 4 MB;
  - una cola persistente y un cerrojo entre pestañas son piezas nuevas que probar;
  - los cambios de selección múltiple y persona de las vistas siguen sin funcionar sin conexión.
- Cambios de comportamiento existente:
  - el cliente deja de redibujar la vista desde el servidor en cada aviso de colección;
  - cerrar sesión con cambios pendientes pide confirmación;
  - iniciar sesión como otro usuario borra la caché del anterior;
  - el reductor `results` admite páginas de hasta 1.000 ids cuando se pide todo.

## Governance

- Pruebas de unidad, escritas primero, del almacén y su persistencia con un IndexedDB falso en memoria. Fusión por versión, expulsión, `QuotaExceededError`, descarte por cambio de consulta y por `cacheVersion` (conservando `transactions`), y purga por `revoked`.
- Prueba de equivalencia. Para colecciones generadas, el resultado en modo cliente coincide id por id con el reductor `results` del servidor para cada tipo y operador de ADR 024, en cuatro zonas horarias, con filtros relativos y «yo». Un operador nuevo no entra sin ese caso.
- Prueba de la tabla de excepciones. Cada fila repite la consulta y los demás cambios no la repiten.
- Pruebas de la cola. Persiste antes de enviar, reenvía con el mismo id tras reabrir, un solo dueño por cerrojo, el rechazo vuelve a pedir los registros tocados y guarda el texto, y sin IndexedDB avisa.
- Pruebas de seguridad. Un usuario B que entra no puede leer nada de A, cerrar sesión borra todo (con confirmación si hay pendientes), `collection-revoked` y `collection-resync` purgan la fila oculta sin que el cliente envíe nada que no tuviera, y el conteo no revela filas.
- Mediciones en el navegador, repetidas en las pruebas de rendimiento. Abrir un tablero de 2.000 tarjetas desde caché (tiempo hasta pintar con y sin red), y una tabla de 10.000 filas en modo cliente (primera carga, y filtrar, ordenar y agrupar sin peticiones). Fallan si el filtro y orden locales pasan de 50 ms o si el hilo principal se bloquea más de 50 ms por tarea larga.
- Verificación con dos personas en el navegador. Edición sin conexión y reconexión, revocación que purga la caché, y una tarjeta que se recoloca sin redibujo.
- Reglas de negocio (`rules:add`): la caché es por usuario y se borra al salir, pintar desde caché y revalidar por versiones, el umbral del modo cliente, lo escrito pendiente nunca se descarta sin decisión de la persona, y lo no legible se purga.
- Un cambio del umbral de 10.000 filas, del vocabulario de escrituras que el cliente puede encolar o de dónde se guarda se toma con una nota en este ADR o con uno nuevo.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21 (aprobación). Se aprueba almacén en memoria con IndexedDB y el motor compartido, sin dependencias. El umbral de 10.000 filas visibles se confirma contra el endpoint real, y esta nota se corrige si el p95 de la primera carga pasa de 1,5 s. Se aprueba permitir páginas de 1.000 ids en `results` cuando se piden todas las propiedades, con un cambio mínimo en el backend. **La primera carga sin caché sigue dibujándose en el servidor**, sin página en blanco ni cascada de peticiones del cliente. Esa lectura del servidor siembra el almacén y desde ahí el almacén dirige la vista. El alcance de la cola, la confirmación al cerrar sesión, el tope de 50 MB y el plazo de 30 días quedan como están. **Fórmulas y rollups se calculan al leer** (etapa 10, sin caché en el servidor). El modo cliente queda apagado si una fórmula o un rollup está en el filtro, el orden o la agrupación, y los valores calculados que se muestran **nunca se confían de la caché**. Se tratan como vencidos y se revalidan siempre al abrir.
- Modified: 2026-10-21 (implementación, primera entrega). Hecho y verificado en el navegador con dos personas: la cola persistente del editor (guarda en IndexedDB antes de enviar, reenvía con el mismo id al abrir de nuevo, aparta lo rechazado), la colocación local de tarjetas del tablero con el motor compartido y la tabla de excepciones de ADR 026 (la vista se pide al servidor solo por esos casos, cada uno con su motivo en un `WARN`), el borrado de la copia al cerrar sesión (con aviso de los cambios sin enviar) y el borrado de la copia de otra persona al abrir la propia. Desviaciones. (1) La base es una por persona (`neuma-cache:<usuario>`), sin espacio de trabajo en el nombre, porque el backend resuelve un solo espacio de trabajo por persona. (2) No se usa el cerrojo entre pestañas: un reenvío duplicado es inocuo porque el servidor responde un id repetido desde lo que guardó, así que dos pestañas que reenvían lo mismo no aplican nada dos veces. (3) La cola guarda `previews` vacío: aún no se muestra el texto de lo rechazado. (4) El cursor de `changes` sale del mismo snapshot que las filas (`PageQueryResult.changesCursor`), sin cambio en el backend. Pendiente: pintar desde la caché antes de que responda el servidor (el almacén de registros y de resultados existe y está probado, pero ninguna vista lo lee todavía), el modo cliente (solo existe la decisión `decideClientMode`, sin camino de datos ni el cambio del tope de `results` a 1.000), pasar las escrituras de las vistas por la cola, el panel de cambios rechazados y la colocación local en las demás vistas (tabla, lista, galería, calendario, línea de tiempo), que hoy se dibujan en el servidor.
- Modified: 2026-10-21 (segunda entrega). Se llena `previews` y se muestra el panel de cambios rechazados en el editor, con las palabras de cada cambio, el motivo, «Copiar texto» y «Descartar» (verificado en el navegador: una edición hecha sin conexión sobre una página que luego se envió a la papelera aparece en el panel con el párrafo completo, se copia al portapapeles y se descarta). El texto sale del editor en el momento de hacer la transacción y no de la actualización de Yjs, porque esa solo trae lo escrito desde la última confirmación, encadenado a caracteres que no lleva. **Cerrojo entre pestañas: se omite, y queda documentado.** Reenviar es inocuo (el servidor responde un id repetido desde lo que guardó) y dos pestañas nunca muestran estados contradictorios de lo pendiente: el estado de guardado que cada una enseña es el de su propia conexión, y lo que una restaura de disco lo envía en el mismo orden en que se hizo, así que a lo sumo ambas dicen «guardando» a la vez y luego «guardado». Sigue pendiente, y se aplaza con el resto del modo cliente: pasar las escrituras de las vistas por la cola. Hoy una celda, una tarjeta o una fila nueva se envían por acciones del servidor, sin conexión fallan con un aviso y deshacen la pantalla, así que no se pierde texto en silencio, pero tampoco se guarda. Pasarlas exige un vocabulario de operaciones para el cliente (ADR 025 reserva `changeValueList` y los parches por celda al backend), una sesión de transacciones en la vista de colección y el estado optimista local que solo existe cuando el cuerpo de las vistas lee del almacén.
- Modified: 2026-10-21 (tercera entrega: cuerpo de las vistas desde el almacén). Hecho. (1) Tabla, lista, galería, tablero, calendario y línea de tiempo son componentes de cliente que leen un almacén de filas; la primera carga la dibuja el servidor y siembra el almacén, y desde ahí los avisos de `changes` colocan cada fila con el motor compartido y la tabla de excepciones de ADR 026 (el orden manual relee solo las columnas afectadas; el conteo de filas sin fecha se relee con una acción). **El gráfico sigue dibujándose en el servidor**: solo pinta conteos y se refresca con el redibujado completo. (2) Pintado desde la caché: `loading.tsx` de la página dibuja la última vista guardada para esa consulta, marcada como «actualizando», y la pone al día con `changes`; ante un reinicio, un cursor desconocido o un lugar que depende del orden del servidor, la copia se deja y manda la respuesta del servidor. Los valores calculados nunca se guardan. No aparece en una recarga completa, porque Next solo muestra `loading.tsx` en navegaciones del cliente. (3) Modo cliente con `decideClientMode`: se leen todas las filas una vez (páginas de 1.000 ids con `results`, tope subido de 100 a 1.000 solo para esa reducción) y el navegador filtra, ordena, agrupa y cuenta con el motor compartido; la prueba de integración `page-query.local-parity` compara 10 vistas, 4 zonas horarias y 130 filas contra el servidor. Se rechaza una agrupación por persona, fecha o número, una búsqueda, y fórmulas, rollups o relaciones en el filtro o el orden. El filtro rápido sigue viajando por la URL, así que cambiarlo aún navega. (4) Escrituras de vistas por la cola persistente: celda de valor único, mover tarjeta o fila sin listas y fila nueva se muestran al instante, se guardan en IndexedDB antes de enviarse y se reenvían con el mismo id; el backend acepta `id` al crear y responde la página ya creada si se repite (el cambio mínimo de backend, con pruebas). Las celdas de lista (varias opciones, personas, relaciones, archivos) y los movimientos con listas necesitan conexión y lo dicen. **Desviación:** un rechazo no retiene las escrituras siguientes de la cola, a diferencia del texto del editor, porque cada celda o lugar es independiente; el rechazo va al panel y la vista relee las filas. Otra desviación: las filas nuevas hechas sin conexión aparecen en el almacén solo en modo cliente. Medición en el navegador (compilación de producción, cuenta administradora, 12.000 páginas en el espacio): abrir un tablero de 2.000 tarjetas por navegación desde la caché dibuja a los 280 a 340 ms del clic (primera tarjeta a los 520 a 720 ms) y la respuesta del servidor llega a los 3,7 s; el motor local tarda 1 ms en filtrar, 8 a 13 ms en ordenar y 8 ms en agrupar y contar 10.000 filas (mediana y p95 de 15 corridas, Bun). **La primera carga de la tabla de 10.000 filas tarda de 7,6 a 9,3 s (p95 mayor de 1,5 s)** y es la lectura del servidor, no el modo cliente: pesan el árbol de páginas del espacio (1,8 s), las colecciones (2,1 s) y el conteo de la consulta (1,6 s), todos sin relación con esta etapa; las 10 páginas de filas del modo cliente llegan después del primer dibujo, de unos 70 a 95 ms cada una. Esto queda anotado como deuda para la etapa de rendimiento del servidor. Verificado con dos personas: una tarjeta movida por la otra se recoloca sin recargar en tablero y tabla a los 334 ms; una fila enviada a la papelera desaparece de ambos y de IndexedDB; una edición sin conexión queda como «1 cambio esperando para enviarse», se envía al volver la conexión sin recargar y el servidor la confirma. La pérdida de acceso por permisos (en vez de papelera) solo está cubierta por pruebas unitarias.
- Modified: 2026-10-21 (cuarta entrega: correcciones tras la revisión). (1) **Calendario y línea de tiempo se revalidan como el resto**: la copia pintada pide `changes` desde su cursor y coloca las filas con `placeChangedWindowRows` (el mismo motor del vivo); si cambió algo, relee el conteo de filas sin fecha con una acción, y si el cursor se reinició, la ventana quedó truncada o hay búsqueda, deja la copia y manda la respuesta del servidor. (2) **La versión de cada registro guardado es la del bloque en el servidor** (`Block.version`, que crece con cada cambio): `PageRowSummary` y `PageQueryRow` la llevan ahora como `version`, y la caché ya no inventa sellos de cliente; las filas optimistas aún sin confirmar llevan 0. Por eso `sync` con `{ id, version }` y la mezcla por versión del almacén dicen la verdad. (3) **Fila cerrada a una persona.** Una prueba real con dos personas mostró un hueco: al quitar el permiso de una fila, el servidor ya no la dibujaba, pero su registro seguía en IndexedDB (el aviso de `changes` nunca nombra una fila que el lector no puede abrir). Ahora, cuando una lectura nueva deja de citar filas que la copia guardaba para la misma pregunta, el navegador manda esas filas con sus versiones a `sync` (de 500 en 500) y borra las que vuelven en `revoked`; las que solo salieron del filtro se conservan, y si el servidor no responde no se borra nada. Verificado con una segunda persona en su propio contexto: la fila cerrada desaparece de la vista y de IndexedDB, las demás siguen guardadas, y al cerrar la colección entera la vista dice que la dirección no existe y se borran todas sus filas de la caché. (4) **Primera carga de la tabla de 10.000 filas, causas.** La lectura de colecciones tardaba 1,8 s por llamada (3 llamadas por carga) porque listaba con su documento completo todas las páginas del espacio solo para quedarse con las colecciones; ahora pide únicamente las colecciones del espacio y tarda 19 ms. La consulta de filas, el conteo y el cursor tardan 24 a 39 ms por separado: los 1,5 s que se veían eran espera detrás de las lecturas pesadas en el mismo proceso. Sigue sin resolverse, y es un cambio de diseño y no una corrección: el árbol de páginas devuelve las 12.000 páginas del espacio con su contenido (10 MB, 1,0 s de CPU del servidor, dos veces por carga) y la ruta de la página entrega esa lista entera al componente de cliente (documento de 40 MB); con un espacio pequeño la misma tabla pinta en 1,3 a 1,4 s. Se necesita un modelo de páginas perezoso (raíces, camino abierto e hijos al expandir, y el contenido de otras páginas bajo demanda, porque los bloques sincronizados leen el de otras páginas). Queda como deuda explícita.
- Modified: 2026-10-21 (quinta nota). La deuda de la cuarta nota, el modelo de páginas perezoso, se resuelve en `030-page-tree-on-demand.md`: la ruta de la página deja de entregar la lista del espacio y el documento baja de 18 MB a 0,37 MB en la medición de ese ADR.
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 11); `docs/architecture/references/notion-views-and-databases.md` (sección 3)
- La medición se hizo con un banco descartable en el directorio temporal de la sesión y se repite en la implementación.
