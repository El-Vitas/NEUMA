# 026: Aviso de cambios por colección

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `025-views-as-reducer-queries.md`
**Precedes:** las etapas 7 (vistas que faltan) y 10 (rollups y fórmulas) del plan `2026-10-20-paridad-con-notion.md`, que declaran qué pueden evaluar en local.

## Context

El canal en vivo (`block_versions`, `NOTIFY` tras cada transacción) avisa por página: cada socket se suscribe a una página y recibe `{ id, version }` de los bloques de esa página que puede leer. Una vista de colección abierta no se entera de que cambió una fila, salvo que la fila sea la página abierta. Hoy una persona ve una tarjeta moverse solo si recarga, y un agente que vigila una colección no tiene otra forma que repetir `query_collection` y comparar.

`docs/architecture/references/notion-views-and-databases.md` (secciones 2.8 y 2.9) describe lo que hace Notion. Cada colección tiene un canal con `{ idDeFila: versión }`. Al mover una tarjeta, la otra pestaña recibió cuatro avisos, pidió en una sola petición los tres registros nuevos y no repitió la consulta. Antes de consultar, el cliente espera a que se envíen sus propias escrituras pendientes de esa colección. ADR 025 dejó este punto abierto en dos lugares: el cliente deduplica y «repite la consulta cuando le avisen (etapa 5)», y el modo cliente de Notion queda fuera hasta que exista este canal.

Lo que ya tenemos y se reutiliza:

- una suscripción por socket, con control de acceso por lector (`BlockLiveAccessService.loadContext`, una carga por notificación para todos los lectores) y un plan puro de entregas (`planVersionDeliveries`);
- notificaciones serializadas en una cola, así que las versiones llegan a un socket en el orden de confirmación;
- `resync` como respuesta segura cuando algo no se puede resolver o hay un bloque oculto;
- el motor de `packages/shared` (`matchesPageFilter`, `comparePageRowsBySorts`), que decide en el portal dónde cae una tarjeta recién movida;
- el contrato de consulta por reductores de ADR 025, con `view.version` y el cursor opaco.

## Alternatives Considered

### Qué se avisa

- **Avisar solo «cambió la colección».**
  - PRO: mínimo trabajo en el servidor.
  - CON: cada edición ajena repite la consulta de todas las vistas abiertas. Con 2.000 tarjetas y varias personas, cada movimiento cuesta una consulta por observador.
- **Mandar los registros completos en el aviso.**
  - PRO: una ida menos.
  - CON: el aviso lleva datos, así que hay que filtrar por propiedad y no solo por fila, y `NOTIFY` tiene tope de 8.000 bytes.
- **Mandar `{ fila: versión }` y que el cliente pida lo que no tiene (elegida).**
  - PRO: el aviso es pequeño y no lleva contenido. El cliente decide si ya tiene esa versión (sus propias escrituras) y pide solo lo que le falta, con los permisos del momento de la lectura.
  - CON: una ida más por cambio ajeno.

### Dónde vive la suscripción

- **Reutilizar la suscripción por página.**
  - PRO: nada nuevo en el protocolo.
  - CON: una página puede incrustar varias colecciones (vistas enlazadas), y la página que muestra la vista no es la colección. La suscripción por página dejaría pasar o sobraría.
- **Un socket aparte para colecciones.**
  - PRO: aislamiento.
  - CON: dobla autenticación, límites y reconexión.
- **Suscripciones por colección en el mismo socket (elegida).**
  - PRO: reutiliza autenticación, tasa de mensajes, cierre por cuenta no disponible y reconexión.
  - CON: el registro guarda un segundo tipo de suscripción.

### Qué hace el cliente al recibir el aviso

- **Repetir la consulta de la vista siempre.**
  - PRO: correcto por construcción.
  - CON: es lo que se quiere evitar. Equivale a no tener canal.
- **Recolocar siempre en local.**
  - PRO: cero consultas.
  - CON: el cliente no puede evaluar todo (búsqueda de texto, relaciones a filas que no cargó, fórmulas futuras), y una fila fuera de la ventana cargada no tiene lugar conocido.
- **Recolocar en local lo que el cliente sabe evaluar y repetir la consulta solo en los casos listados (elegida).**
  - PRO: el caso común, mover una tarjeta o cambiar un valor visible, no cuesta consulta.
  - CON: hay una lista de excepciones que mantener y probar, y la corrección depende de que el motor local y el SQL coincidan (la prueba de paridad de ADR 025 ya lo vigila).

### Cómo se entera un agente

- **Repetir `query_collection` y comparar.**
  - PRO: existe.
  - CON: el agente gasta contexto en filas que no cambiaron y no sabe qué cambió.
- **Un socket de eventos para el MCP.**
  - PRO: inmediato.
  - CON: el MCP corre como proceso aparte con transporte HTTP y las herramientas son de petición y respuesta. Un agente en bucle no mantiene un socket.
- **Una herramienta de cambios con cursor, y espera opcional (elegida).**
  - PRO: el agente pide «lo que cambió desde mi última lectura», recibe solo esas filas y un cursor nuevo. Funciona con cualquier cliente MCP.
  - CON: hay que definir el cursor y sus límites (ver abajo).

## Decision

### Protocolo en el canal en vivo

Mensajes nuevos del cliente:

| Mensaje | Efecto |
|---|---|
| `{ type: 'subscribe-collection', collectionId }` | El servidor comprueba que el lector puede leer la colección, igual que `subscribe` con una página, y responde `{ type: 'subscribed-collection', collectionId }`. |
| `{ type: 'unsubscribe-collection', collectionId }` | Quita la suscripción. |

Mensajes nuevos del servidor:

| Mensaje | Cuándo |
|---|---|
| `{ type: 'collection-changes', collectionId, rows: [{ id, version }], views: [{ id, version }], schemaVersion? }` | Una transacción confirmada tocó filas de la colección que este lector puede leer, o sus vistas, o su esquema. |
| `{ type: 'collection-resync', collectionId }` | No se puede describir el cambio (ver «Permisos y filas ocultas», notificaciones truncadas, error al resolver acceso, pérdida de la conexión de escucha, más de 500 filas en un aviso). El cliente repite la consulta de sus vistas de esa colección. |
| `{ type: 'collection-revoked', collectionId }` | El lector ya no puede leer la colección. La suscripción se descarta. |

- Una fila es un bloque `page` cuyo padre es la colección. Un cambio en el bloque de la fila (propiedades, título, ciclo de vida, permisos) cuenta como cambio de la fila. Un cambio en el cuerpo de la fila (sus bloques hijos) **no** se avisa por la colección: la tarjeta no lo muestra. La portada desde el contenido (etapa 7) pedirá este aviso y lo añadirá con su propio ADR.
- `views` lleva la versión de las vistas de la colección que la transacción tocó (el resultado de la transacción ya trae `viewVersions`). `schemaVersion` va cuando cambió el esquema de la colección (propiedades, opciones).
- Las entradas siguen el orden de confirmación. Un socket recibe un mensaje por notificación, y las notificaciones ya van en cola.
- Límite de 20 suscripciones de colección por socket. Pasado el límite, `subscribe-collection` se rechaza con el código de error ya existente para límites. Los mensajes cuentan en la tasa por socket que ya aplica.
- Una persona con la misma colección en dos pestañas tiene dos sockets y dos suscripciones. Nada se comparte entre sockets.

### Emisión: una consulta por notificación

El servicio de reparto (`BlockLiveFanoutService`) ya carga el contexto de acceso una vez por notificación, sembrado con los ids tocados y las páginas suscritas. Para colecciones:

1. la siembra añade los ids de las colecciones suscritas en el espacio de la notificación;
2. con las filas de la cadena ya cargadas se agrupan los bloques tocados por colección (una fila es un bloque `page` cuyo padre es una colección suscrita). No hay lectura por fila ni por suscriptor;
3. el plan es una función pura, como `planVersionDeliveries`: para cada suscriptor y colección, filtra las filas con `isBlockReadableInPage(fila, fila, acceso)` (la fila y toda su cadena hasta ella son legibles, el mismo corte que la lectura de la página) y arma un solo mensaje.

El costo por notificación es una carga de contexto más un recorrido en memoria de `tocados × suscriptores`. No crece con el tamaño de la colección. Las pruebas de rendimiento lo comprueban con una colección de 2.000 filas y ráfagas de cambios.

**Payload de `NOTIFY`.** Cada entrada `{ id, version }` gana dos campos opcionales, `previousParentId` y `hasAccessChange`, que solo van cuando la transacción movió el bloque a otro padre o cambió sus permisos. No añaden tamaño en el caso común. Si la notificación supera el tope se sigue enviando `truncated`, y todo suscriptor de colección recibe `collection-resync`.

### Permisos y filas ocultas

- Un lector solo recibe `{ id, version }` de las filas que puede leer. Un id ilegible no viaja nunca, ni en `rows` ni en un conteo.
- Si una fila tocada es ilegible para el lector, no se le dice nada, salvo que `hasAccessChange` o `previousParentId` indiquen que la fila pudo ser legible antes: entonces recibe `collection-resync`. Así el cliente descarta una tarjeta que acaba de ocultársele sin que el servidor nombre su id. El costo es que quien lee una colección con filas restringidas ve una consulta más cuando alguien cambia los permisos de una de ellas, y solo en ese caso. Un cambio ordinario de una fila oculta no produce ningún mensaje.
- Una fila que sale de la colección (`previousParentId`) se trata igual para quien suscribe la colección de origen: `collection-resync`.
- Una fila que entra a la colección (padre nuevo) llega como cambio normal a los suscriptores de la colección nueva, si la pueden leer.
- El permiso se recalcula con el rol actual de la cuenta antes de repartir, como hace el reparto de páginas (`applyCurrentAccounts`). Una cuenta que dejó de existir cierra el socket.

### Qué hace el cliente

El portal mantiene, por vista abierta, las filas cargadas con su versión. Al recibir `collection-changes`:

1. **Descarta lo que ya tiene.** Ignora una fila cuya versión es menor o igual a la que guarda. Esto absorbe el eco de sus propias escrituras. Una fila con una operación local pendiente se conserva como está y se reconcilia cuando la cola se vacía.
2. **Agrupa.** Reúne los avisos en una ventana de 150 ms antes de actuar, para que una ráfaga sea una sola lectura.
3. **Pide solo esas filas**, en una sola petición por colección (`rows` por ids, con las propiedades de la vista), con un tope de 200 ids por petición. Si el lote reúne más de 200 filas distintas, se repite la consulta de la vista una vez en lugar de leer por ids.
4. **Recoloca en local** cada fila con el motor de `packages/shared`: evalúa el filtro de la vista contra el registro nuevo, y la ordena con `comparePageRowsBySorts`. Una tarjeta pasa de un grupo a otro (columna del tablero, grupo de tabla), entra, sale o cambia de lugar. Los conteos de grupo se ajustan al mover, y se verifican con una sola petición de `aggregations` por ráfaga (la fase dos de ADR 025), porque sumas, promedios y medianas no se ajustan por diferencia.
5. **Pide de nuevo los datos de la vista** si `views` trae una versión mayor que la guardada, y el esquema si `schemaVersion` es mayor.

**Cuándo repite la consulta en lugar de recolocar.** Exactamente en estos casos, y en ninguno más:

| Caso | Por qué no puede evaluar |
|---|---|
| Hay una búsqueda activa (`search`) y la fila cambió | La coincidencia se calcula en el servidor sobre `Block.text` y las respuestas de texto, sin acentos ni mayúsculas, y el cliente no tiene esa normalización idéntica. |
| El filtro o el orden usan una relación, un rollup o una fórmula | Dependen de otras filas que el cliente puede no tener o no poder leer. Las fórmulas y rollups (etapa 10) declaran aquí su excepción. |
| El orden es manual y el aviso trae una versión mayor de la vista | La lista `manualOrder` no viaja al cliente entera. Se vuelve a leer el rango cargado de cada grupo afectado (`groupResults`, no más de dos grupos por movimiento), no toda la vista. |
| La fila no está cargada y su posición cae dentro del rango ya cargado | Se coloca con su valor de orden. Solo es posible con orden por propiedad. |
| La fila no está cargada y su posición cae después del último cargado | No se coloca. Se ajusta el conteo y la fila aparecerá al cargar más. No cuesta consulta. |
| `collection-resync` | El servidor lo pidió. |
| `cursor` de «cargar más» devuelve `VIEW_QUERY_CURSOR_STALE` | Es el caso de ADR 025: el orden cambió, se reinicia desde la primera página. |
| Un lote reúne más de 200 filas | Es más barato repetir la consulta que leer por ids. |

Un filtro con fechas relativas o «yo» (etapa 8) sí se evalúa en local, porque el cliente conoce la zona y quien mira. El paso del tiempo no genera avisos: «hoy» cambia a medianoche y la vista lo refleja en la siguiente consulta, no por el canal.

**Escrituras propias pendientes.** Antes de cualquier consulta de una vista (primera carga desde el cliente, «cargar más», repetición por las causas anteriores), el cliente espera a que se envíen las transacciones pendientes que tocan filas, vistas o esquema de esa colección. El resultado del servidor ya las contiene y el eco no revierte el movimiento propio. Si la espera supera 5 s se consulta de todos modos y se registra una advertencia. Una consulta en vuelo se cancela y se repite cuando llega un `collection-resync`.

**Reconexión.** Al reabrirse el socket el cliente vuelve a suscribir sus colecciones y repite la consulta de cada vista abierta, como el editor repite la lectura de la página tras una reconexión.

**Visibilidad.** Una vista oculta (pestaña en segundo plano) conserva su suscripción pero acumula los avisos y actúa al volver, en una sola lectura.

### Herramienta del MCP para agentes

Un agente no mantiene un socket, así que su camino es una herramienta de petición con cursor.

**`collection_changes`** recibe `{ collection, since?, columns?, limit?, waitSeconds? }`.

- Sin `since`, devuelve solo `cursor` (el punto actual), sin filas. Es «empieza a vigilar desde ahora».
- `query_collection` gana en su respuesta `changesCursor`, tomado en el mismo snapshot que sus filas. Así «leo y luego vigilo» no pierde ni repite cambios entre las dos llamadas.
- Con `since`, devuelve `{ cursor, rows, trashed, total, hasMore, reset }`.
  - `rows` son las filas que cambiaron y que el token puede leer, completas y con `version`, con el mismo formato y el mismo recorte de `columns` que `query_collection`. Una fila que cambió varias veces aparece una vez, con su estado actual.
  - `trashed` son los ids que pasaron a la papelera. Purgar exige papelera antes, así que todo borrado se anuncia una vez.
  - `total` es el conteo exacto de filas visibles para el token, con el mismo cómputo de ADR 025. Si no coincide con el conteo propio del agente, el agente sabe que perdió algo que no se puede nombrar (una fila que se le ocultó) y relee.
  - `hasMore` y `limit` (por defecto 50, tope 100) paginan los cambios. `cursor` solo avanza hasta lo devuelto.
  - `reset: true` cuando el cursor no es válido o no se puede garantizar continuidad (esquema cambiado de forma incompatible, cursor más viejo que la retención). El agente relee con `query_collection`.
- `waitSeconds` (0 a 25, por defecto 0) hace que la llamada espere hasta que haya un cambio o termine el plazo, y devuelva lo que haya. El servidor lo resuelve repitiendo la consulta de cambios cada segundo, que cuesta un recorrido por `parentId` de unos milisegundos. Así un agente espera sin encuestar en un bucle propio ni gastar contexto en respuestas vacías.
- **El cursor nunca pierde un cambio.** Un cursor por fecha no sirve: una transacción que empezó antes y confirma después escribe una marca anterior al cursor, y ningún margen de tiempo lo garantiza. En su lugar se usa el identificador de transacción:
  - `Block` gana `changeXid bigint NOT NULL`, que un disparador `BEFORE INSERT OR UPDATE` fija a `pg_current_xact_id()::text::bigint` en cada escritura (el contrato no modela `xid8`, y el valor de 64 bits cabe en un `bigint`). Está en la base y no en la aplicación para que ninguna vía de escritura (la tubería de transacciones, la purga, una migración de datos) pueda olvidarlo. El cambio de ciclo de vida (papelera, restaurar) es una escritura de la fila, así que también lo fija.
  - El cursor es el `xmin` de la instantánea del lector (`pg_snapshot_xmin(pg_current_snapshot())`), tomado en la misma transacción de solo lectura y con la misma instantánea que las filas que se devuelven. Todo lo que confirme después de esa instantánea tiene un `changeXid` mayor o igual al `xmin`, porque el `xmin` es la transacción más antigua que seguía abierta.
  - `collection_changes` con `since` devuelve las filas de la colección con `changeXid >= since`, ordenadas por `(changeXid, id)`. Puede repetir filas que el lector ya vio (las confirmadas antes de la instantánea, pero con un id de transacción mayor o igual al `xmin`). La repetición es inocua porque cada fila lleva su `version` y el agente deduplica por `id` y versión. Nunca omite una fila confirmada después.
  - El cursor es opaco (base64url de `{ xmin, after? }`). `after` es la posición `(changeXid, id)` de la última fila de una página parcial, y solo existe mientras `hasMore` sea verdadero. Cuando se agotan los cambios, el cursor devuelto es el `xmin` de la instantánea de esa lectura.
  - Una transacción larga que quede abierta fija el `xmin` hacia atrás, y el cursor de quien lee entonces repite más filas hasta que esa transacción termina. Es el costo de no perder nada.
  - Tras restaurar una copia de la base, los identificadores de transacción pueden retroceder. Un cursor con `xmin` mayor que el `xmin` actual responde `reset: true`.
- Las filas que el token no puede leer, incluidas las que cierra una regla del token, se excluyen en la consulta con el conjunto denegado de ADR 025, no se descartan después. Se aplica el mismo tope de 5.000 y el mismo error tipado.
- **Una migración** (conforme a `packages/db/AGENTS.md`): agrega `Block.changeXid` (`bigint`, por defecto 0: las filas existentes no cambiaron después de la migración), el disparador y el índice `Block_parentId_changeXid_idx` sobre `(parentId, changeXid)`. Se prueba primero en una base desechable y después se aplica a `company-brain` con `bun run db:migrate:deploy`.
- **Costo del índice.** `changeXid` cambia en cada escritura, así que ninguna actualización de `Block` puede ser HOT: cada edición escribe una entrada en este índice y en los demás. Con ADR 025 los índices de `Block` ya eran pocos a propósito para conservar HOT, y esta decisión lo cambia. Se acepta porque es la única forma de leer «lo que cambió» sin recorrer la colección y sin perder cambios. Las pruebas de rendimiento miden el costo de escritura de una edición de una letra antes y después, y se reabre la decisión si sube más de 20 %.
- La columna de última edición del bloque es `editedAt` (no `updatedAt`). El cursor no la usa.
- Es una lectura. Cumple las reglas de siempre: el agente tiene los permisos de su persona.
- La descripción de la herramienta explica el ciclo: leer con `query_collection`, guardar `changesCursor`, llamar a `collection_changes` con `since` y `waitSeconds`, aplicar `rows` y `trashed`, y guardar el `cursor` nuevo. Las instrucciones del MCP indican cuándo conviene vigilar y cuándo releer (`reset`).

### Errores y observabilidad

- Todo fallo de resolución de acceso o de plan de reparto deja un `ERROR` con traza y envía `collection-resync` a los suscriptores afectados. Nunca se descarta un aviso en silencio.
- Un aviso que no se puede leer cuenta como `resync` para todas las suscripciones de colección, igual que hoy para las de página.
- El cliente registra con nivel `WARN` cada repetición de consulta por causa (de la tabla anterior), para poder medir cuánto cuesta cada excepción.
- Una guarda de bucle: más de 5 consultas por segundo por vista causadas por avisos se registran como `ERROR` y se detienen 5 s.

## Consequences

- Positivas:
  - mover una tarjeta en una ventana la mueve en la de otra persona sin repetir la consulta de la vista, solo con una lectura por ids de las filas que cambiaron;
  - el costo de repartir es una carga de contexto por notificación, independiente del tamaño de la colección;
  - un lector con una fila oculta no ve aparecer la fila, ni su id, ni un conteo que la delate, salvo el `collection-resync` cuando cambian sus permisos;
  - un agente sabe qué cambió desde su última lectura sin releer la colección, y puede esperar sin bucle;
  - ADR 025 recupera su «repite la consulta cuando le avisen» sin un cambio de contrato.
- Negativas:
  - hay una tabla de excepciones (búsqueda, relaciones, orden manual, ventana) que el portal debe mantener junto con el motor local;
  - los cambios del cuerpo de una fila no llegan por este canal y la portada desde contenido necesitará ampliarlo;
  - el cursor de `collection_changes` descansa en `changeXid` y puede repetir filas (inocuo) mientras haya una transacción larga abierta, a cambio de no perder ninguna;
  - cada escritura de un bloque deja de ser HOT por el índice sobre `changeXid`, y la migración añade un disparador en `Block`;
  - un cambio de permisos de una fila genera un `collection-resync` para todos los lectores de una colección con filas restringidas, aunque no les afecte;
  - el payload de `NOTIFY` y el registro de conexiones ganan un tipo de entrada más;
  - cada socket puede mantener hasta 20 suscripciones de colección.
- Cambios de comportamiento existente:
  - la suscripción por página no cambia;
  - el cliente deja de repetir la consulta de la vista a ciegas al volver el foco, y lo hace solo por las causas de la tabla;
  - `query_collection` devuelve `changesCursor` y el MCP gana una herramienta de lectura.
- Aceptado como costo: el modo cliente de Notion (el cliente recibe todos los ids y filtra en local) sigue fuera. El servidor sigue pidiendo una página a la vez y el cliente solo recoloca lo que cargó.

## Governance

- Las pruebas del plan de reparto cubren: una fila legible llega con su versión; una ilegible no llega ni se nombra; un cambio de permisos de una fila oculta genera `collection-resync` y uno ordinario no genera nada; una fila movida a otra colección avisa a las dos; una notificación truncada genera `collection-resync`.
- Una prueba de integración con dos lectores y una fila oculta comprueba que el segundo nunca recibe su id, ni en el aviso ni en la consulta que sigue.
- Una prueba de rendimiento con un tablero de 2.000 tarjetas y ráfagas de 100 y de 500 cambios comprueba que el reparto hace una carga de contexto por notificación (sin consultas por fila ni por suscriptor), que el cliente hace una lectura por ráfaga y que el hilo principal no se bloquea más de 50 ms.
- El cliente tiene pruebas de la tabla de excepciones: cada fila de la tabla tiene un caso que repite la consulta, y los demás cambios no la repiten.
- Las pruebas de `collection_changes` cubren: cursor inicial, cambios agrupados por fila, `trashed`, `total` exacto con una fila oculta, `reset`, margen del cursor con una transacción tardía y `waitSeconds`.
- Reglas de negocio (`rules:add`, `FEA-CLC`): aviso por colección con `{fila: versión}` filtrado por lectura; la repetición de la consulta solo en los casos listados; espera de las escrituras propias antes de consultar; cambios por cursor para agentes.
- Un cambio de las excepciones del cliente o del cursor del MCP se hace con un ADR nuevo.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21. Aprobado con un cambio: el cursor de `collection_changes` usa el id de transacción (`changeXid` y el `xmin` de la instantánea) y no una marca de tiempo con margen, para no perder nunca un cambio confirmado tarde. Los cambios del cuerpo de la fila no se avisan por este canal (lo recoge la etapa 7 si la portada sale del contenido). Un cambio de permisos o de padre produce `collection-resync`. `collection_changes` es una herramienta aparte y `query_collection` devuelve `changesCursor`.
- Modified: 2026-10-21 (implementación). El portal dibuja las vistas desde el servidor de Next (componentes de servidor con caché por espacio), así que no hay un almacén de filas en el cliente donde recolocar una tarjeta. El cliente de esta etapa, ante un aviso, agrupa en 150 ms, invalida la caché del espacio con una acción del servidor y la vista se dibuja de nuevo con una consulta (la espera de las escrituras propias la da el orden en que Next ejecuta las acciones). No lee filas por id ni recoloca en local. Recolocar en local y la tabla de excepciones pasan a la etapa 11 (la caché del cliente) y piden un almacén de filas en el cliente. El canal, los permisos por lector, el cursor por `changeXid` y la herramienta del MCP están como se decidió.
- Modified: 2026-10-21 (etapa 7). El aviso no se amplía: las portadas de tarjeta salen de una propiedad de archivos de la fila, que el aviso ya cubre porque es un valor de la fila, y no del cuerpo de su página (ver la nota de ADR 025). Si más adelante se quiere la primera imagen del contenido, el aviso tendrá que cubrir los cambios del cuerpo de las filas, y eso se decide entonces.
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 5); `docs/architecture/references/notion-views-and-databases.md` (secciones 2.8, 2.9 y 8)
