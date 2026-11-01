# 021: Todo es un bloque, incluso la página

**Status:** Accepted
**Date:** 2026-10-19
**Supersedes:** 008 (la primitiva de contenido y el almacenamiento), 020 (un documento Yjs por página en Hocuspocus)

## Context

Neuma guarda cada página como un documento ProseMirror en `Page.content`, más un estado Yjs en `CollaborationSnapshot`. Los bloques existen dentro de ese documento y se copian a `PageBlock` y `SearchDocument` para buscar (ADR 008, nivel 3). Ese modelo tiene cuatro límites que el producto ya no acepta:

- una página y un bloque son dos cosas distintas, y cada capacidad (permisos, mover, enlazar, versiones, papelera) se resuelve dos veces;
- no hay permisos por bloque, porque quien abre el documento de una página recibe todo su contenido;
- cada guardado reescribe la página entera, aunque cambie una letra;
- la búsqueda y los retroenlaces llegan con atraso, porque un worker los proyecta después.

El 19 de octubre de 2026 se estudió cómo lo resuelve Notion. Una página es un registro `block` de tipo `page`, igual que un párrafo. Un cambio es una transacción de operaciones sobre registros. El texto de cada bloque tiene su propio CRDT. Un canal en vivo avisa versiones, y los permisos se heredan de los bloques que los declaran.

## Alternatives Considered

- **Mantener un documento por página, con mejoras (nivel 3, como AFFiNE y AppFlowy).**
  - PRO: no se rehace el editor ni la colaboración.
  - CON: los cuatro límites siguen. Página y bloque siguen siendo dos cosas, y los permisos por bloque son imposibles con un solo documento por página.
- **Bloques como filas con un servidor de transformación operacional (OT), sin CRDT.**
  - PRO: el servidor decide el orden de todo.
  - CON: hay que escribir la transformación de texto concurrente, que Yjs ya resuelve y probó.
- **Bloques como filas, operaciones en transacciones y Yjs por bloque para el texto (elegida).**
  - PRO: el modelo de Notion; una sola entidad; permisos por bloque; cambios pequeños; búsqueda y retroenlaces en la misma transacción.
  - CON: se rehace el editor, la colaboración y todo lector de `Page.content`, y hay que migrar las páginas existentes.

## Decision

### Una sola entidad: `Block`

Todo lo que hoy es `Page` o un nodo dentro de `Page.content` pasa a ser una fila de `Block`.

| Campo | Qué guarda |
|---|---|
| `id`, `spaceId`, `type` | identidad y tipo: `page`, `paragraph`, `heading`, `toggle`, `collection` y los demás tipos del contenido actual |
| `parentId` | el bloque padre; nulo en un bloque raíz del espacio |
| `children` | ids de los hijos, en orden |
| `properties` | el texto armado (texto, marcas y nodos en línea) y las propiedades del tipo; en una fila de colección, sus valores |
| `format` | presentación: color, alineación, tamaño, ícono, portada |
| `text` | el texto plano del bloque, para buscar |
| `textState` | el estado Yjs del texto, solo en bloques que tienen texto |
| `permissions` | solo en bloques que los declaran; los demás heredan |
| `alive`, `lifecycle`, `lockedAt` | existencia, papelera y bloqueo |
| `version` | sube con cada operación aplicada |
| `createdAt/By`, `editedAt/By` | autoría |

Se mantienen de ADR 008:
- un `Space` sigue siendo el límite de permisos;
- una colección es un bloque de tipo `page` con esquema, y sus filas son sus hijos;
- una mención produce un enlace dirigido entre bloques.

### Un cambio es una transacción de operaciones

`POST /api/v1/transactions` recibe `{ transactions: [{ id, operations }] }`. Cada operación tiene la forma `{ pointer: { table: "block", id }, path, command, args }`.

- Comandos:
  - `set` y `update`, que reemplazan o mezclan campos;
  - `listAfter`, `listBefore` y `listRemove`, que cambian `children` relativo a un id;
  - `applyText`, que lleva un update de Yjs para el texto del bloque;
  - `setPermission`, que cambia permisos.
- Cada transacción del cliente es una transacción de Postgres:
  1. bloquea las filas que toca;
  2. revisa el permiso de cada puntero;
  3. valida el resultado con el esquema del tipo;
  4. sube `version`;
  5. y aplica todo o nada.
- **Conflictos:**
  - el texto se mezcla con Yjs;
  - el orden de los hijos se arma con inserciones relativas a un id;
  - en los demás campos gana el último en escribir, y una `expectedVersion` que no coincide queda registrada.
- **Reintento seguro.** El `id` de la transacción es único: si un cliente la reenvía después de un corte, el servidor responde lo mismo y no la aplica dos veces.
- **Aplicar `applyText`** combina el update con `textState` y recalcula `properties` y `text` en la misma transacción.

### Lo que antes era una proyección, ahora va en la misma transacción

- **Búsqueda.** `text` es una columna del bloque, con un `tsvector` generado y un índice trigram. Se busca sobre `Block` directamente, y desaparecen `PageBlock` y `SearchDocument`. Un cambio se encuentra apenas se confirma la transacción.
- **Retroenlaces.** La transacción que cambia un bloque reconcilia sus enlaces salientes.
- **El outbox** queda para consumidores externos o lentos, y se limpia lo procesado.

### Canal en vivo propio

Un WebSocket en el backend reemplaza a Hocuspocus.

- El cliente se suscribe a las páginas que tiene abiertas.
- Al confirmar una transacción, Postgres avisa con `NOTIFY`. El backend envía a cada suscriptor que puede leer el bloque las operaciones aplicadas y la nueva `version`.
- Al reconectar, el cliente pide con `POST /api/v1/sync` los bloques cuya versión tiene atrasada.
- La presencia (en qué bloque está cada persona) viaja por el mismo canal, con vencimiento.

### Permisos por bloque

- El rol efectivo sobre un bloque es el que da su ancestro más cercano con `permissions`, dentro de lo que el espacio permite.
- Cualquier bloque, no solo una página, puede declarar permisos.
- Quien no puede leer un bloque no lo recibe ni en la lectura ni en el canal. Su id se quita de `children` antes de responder, así no se revela que existe.
- Las reglas actuales de privacidad del espacio y de páginas privadas se mantienen.

### Editor

ProseMirror sigue siendo la vista de una página. Su documento se arma desde los bloques, y cada nodo de bloque lleva el id de su fila. Una capa nueva traduce cada transacción del editor:
- los cambios de estructura (crear, mover, borrar, cambiar tipo o formato) pasan a operaciones `set`, `update` y `list*`;
- el texto dentro de un bloque se edita sobre su `Y.Text`, con las marcas como atributos y los nodos en línea como embeds, y viaja como `applyText`.

### Historial

Una versión de página es una foto de su subárbol, tomada al cerrar una racha de edición, igual que hoy con `PageVersion`.

### Migración

Un comando de una sola vez convierte cada `Page` y su `Page.content` en filas de `Block`, genera el `textState` desde el texto con sus marcas y conserva ids, versiones y papelera. Antes corre un respaldo completo.

## Consequences

- Positivas:
  - una página y un párrafo se mueven, enlazan, versionan, borran y protegen igual;
  - permisos por bloque, incluso más finos que los de Notion, que los guarda solo en páginas;
  - un cambio escribe solo lo que cambió;
  - búsqueda y retroenlaces inmediatos, sin worker ni copias aparte;
  - el MCP y los agentes editan y citan bloques por id, como filas.
- Negativas:
  - se rehacen el editor (208 archivos), la colaboración, el MCP, la exportación, las colecciones, el historial y la búsqueda;
  - la migración toca todo el contenido existente;
  - la capa entre ProseMirror y los bloques es código propio que hay que probar a fondo;
  - abrir una página lee muchas filas en vez de una; se resuelve con una consulta por subárbol y un índice por `parentId`.
- Aceptado como costo: mientras dure el cambio, el modelo viejo y el nuevo conviven detrás de una bandera, y el modelo viejo se retira solo cuando el nuevo pasa todas las pruebas.

## Governance

El cambio entra por etapas, en el orden de `docs/superpowers/plans/2026-10-19-todo-es-un-bloque.md`, cada una con pruebas primero. Ninguna etapa borra el modelo viejo hasta que la migración se pruebe contra una copia de la base de producción. Las reglas de negocio que suponen un documento por página se reemplazan con `rules:add` y `supersedes` al implementar su etapa:
- BR-1e9a26a, «El documento en vivo lo siembra el servidor, una sola vez»;
- BR-585748e, «La página se guarda desde su documento en vivo».

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-19
- Approved by: El-Vitas, 2026-10-19
- Modified: 2026-10-19. El editor manda sus transacciones y sus lecturas `sync` por el canal en vivo, con el mismo servicio que los endpoints HTTP. Pasar cada tecla por el servidor de Next sumaba un salto, y el WebSocket directo al backend ya está permitido (ADR 014). El MCP y las acciones del servidor siguen usando HTTP.
- Modified: 2026-10-24. Una `expectedVersion` que no coincide ya no solo queda registrada. En las celdas de una fila y al mover una fila (`PATCH …/properties` y `PATCH …/move`), el servidor la compara dentro del bloqueo de la fila y responde 409 `PAGE_VERSION_CONFLICT` sin escribir nada. El portal muestra el conflicto en el panel de rechazados, con «Reintentar» para que gane el valor de la persona (ADR 029).
