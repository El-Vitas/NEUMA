# Plan: todo es un bloque

Implementa el ADR 021 en la rama `refactor/bloques-planos`. Cada etapa se cierra con:
- sus pruebas escritas antes del código;
- `bun run check` en cero;
- las pruebas del backend y del portal en verde;
- un commit por etapa.

El modelo viejo sigue funcionando detrás de la bandera `NEUMA_BLOCK_MODEL` hasta la etapa 7.

## Estado

Las siete etapas están hechas en `refactor/bloques-planos` (último commit `697d760`). Lo que cambió respecto al plan:

- La bandera se quitó: la aplicación no está en producción, así que se cambió sin convivencia con el modelo viejo. Ya no existe `NEUMA_BLOCK_MODEL`, y la bandera del editor `NEXT_PUBLIC_BLOCK_EDITOR` solo sobrevive en una prueba del esquema de entorno.
- El comando de migración se quitó en `3e6fa73`, después de migrar, porque leía tablas que ya no existen.
- La búsqueda, los retroenlaces y el MCP pasaron a leer `Block` en la etapa 5. `PageLink` se reemplazó por `BlockLink`, que reconcilia la misma transacción de bloques.
- El ADR 022 retiró el outbox y los dos workers, en vez de limpiar solo lo procesado.
- El filtro de búsqueda por etiquetas (`tags`) y `POST /maintenance/pages/blocks` ya no existen.
- Las transacciones también viajan por el socket en vivo (nota del 19/10 en el ADR 021), con el mismo servicio que `POST /api/v1/transactions`.
- El orden de las páginas de primer nivel vive en el espacio (`Space.rootPageIds`).

## Etapa 1 · El modelo `Block` y su lectura

Estado: hecha (`e5ea698`). Además de `Block` existen `BlockLink` y `BlockTransaction`; la lectura es `POST /api/v1/sync`.

- Modelo Prisma `Block` con los campos del ADR. Índices por `(spaceId)`, `(parentId)`, `tsvector` generado sobre `text` y trigram sobre `text`.
- Esquema Zod por tipo de bloque en `packages/shared`, tomado del esquema actual de `PageContent`, nodo por nodo: el mismo tipo con las mismas restricciones.
- Rol efectivo: ancestro más cercano con `permissions`, dentro de lo que permite el espacio. Una función pura con pruebas de herencia, de bloques privados y de bloques ocultos a un lector.
- `POST /api/v1/sync`: devuelve los bloques pedidos, o el subárbol de una página, con el rol de cada uno, y sin los hijos que el lector no puede ver.
- Pruebas:
  - herencia de permisos;
  - lectura de un subárbol;
  - ocultar hijos;
  - una sola consulta por subárbol.

## Etapa 2 · Transacciones

Estado: hecha (`2086908` transacciones y `ecce103` tipos de bloque, transacciones aplicadas y enlaces). Los siete comandos del plan están; el backend suma comandos internos de página (papelera, bloqueo, verificación, dueño, mover a la raíz del espacio) que un cliente no puede enviar. Un deadlock se reintenta hasta tres veces.

- `POST /api/v1/transactions` con los comandos `set`, `update`, `listAfter`, `listBefore`, `listRemove`, `applyText` y `setPermission`.
- Una transacción de Postgres por transacción del cliente:
  1. bloqueo de filas;
  2. permiso por puntero;
  3. validación por tipo;
  4. `version` que sube;
  5. todo o nada.
- `applyText`: mezcla el update de Yjs con `textState` y recalcula `properties` y `text`.
- Enlaces salientes reconciliados en la misma transacción.
- Reintento seguro por id de transacción.
- `NOTIFY block_versions` al confirmar.
- Pruebas:
  - cada comando;
  - un permiso rechazado deshace toda la transacción;
  - dos `applyText` concurrentes se mezclan;
  - un reintento no aplica dos veces;
  - una página bloqueada o en la papelera no se escribe (BR-80536e4, BR-c9aaeaa).

## Etapa 3 · Canal en vivo

Estado: hecha (`e169558` canal de versiones y presencia, `ca45805` pedidos `transactions` y `sync` por el canal). El canal es `/api/v1/blocks/live`, con un token corto pedido a `POST /api/v1/blocks/live/token`. Además de versiones y presencia, atiende `transactions` y `sync` por el mismo socket.

- WebSocket en el backend: suscripción por página, envío de las operaciones aplicadas a cada suscriptor que puede leer el bloque, y presencia con vencimiento.
- Al reconectar, `sync` por versión.
- Pruebas:
  - un lector sin permiso no recibe la operación;
  - una reconexión recupera lo perdido;
  - la presencia vence.

## Etapa 4 · Editor

Estado: hecha (`ca45805` conversión entre documento y bloques, `2cd4ad7` editor, `2cd4571` correcciones de cursor y anclas). El cliente vive en `apps/portal/modules/pages/block-sync/`. Salió primero detrás de `NEXT_PUBLIC_BLOCK_EDITOR`, que se quitó con el resto de la convivencia.

- El documento ProseMirror se arma desde los bloques de la página.
- Capa de traducción:
  - estructura a operaciones `set`, `update` y `list*`;
  - texto de cada bloque a su `Y.Text`, con las marcas como atributos y los nodos en línea como embeds, que viaja como `applyText`.
- Cola de transacciones del cliente: reintenta, confirma y deshace.
- Las operaciones remotas se aplican sin mover el cursor de quien escribe.
- Pruebas:
  - cada tipo de bloque ida y vuelta;
  - deshacer y rehacer;
  - dos clientes escribiendo en el mismo bloque;
  - mover un bloque con su subárbol;
  - pegar.

## Etapa 5 · Lectores y escritores del contenido

Estado: hecha, sin commit propio. Llegó dentro de `3e6fa73` (y `b6d1c83` ajustó las referencias a páginas, con el worker de búsqueda todavía vivo). La búsqueda lee `Block` directamente (palabra, dentro de palabra, tildes, ranking, fragmentos, filtros, permisos). Los retroenlaces salen de `BlockLink` y cuentan solo menciones, después de filtrar por permisos. El MCP lee y escribe por bloque. Las versiones se cortan por racha de edición (250 ms de pausa, 2 s como máximo). La papelera es por bloque de página.

- MCP: leer y editar por bloque, ahora como operaciones.
- Exportación, colecciones y vistas, historial de versiones, papelera y purga diferida, plantillas, bloques sincronizados y subpáginas.
- Búsqueda sobre `Block` en vez de `PageBlock` y `SearchDocument`.
- Pruebas: las que ya existen para cada uno, más las de permisos por bloque en cada lectura.

## Etapa 6 · Migración

Estado: hecha (`cdc606c`). El comando de una sola vez se quitó después de correrlo; no queda en el repositorio.

- Comando de una sola vez: `Page` y `Page.content` pasan a `Block`, con el `textState` generado y los ids, versiones y papelera conservados.
- Se prueba contra una copia de la base de desarrollo y después contra una copia de la de producción.
- Respaldo completo antes de correrla.
- Antes de convertir, una revisión que lista y detiene la migración en dos casos:
  - un resumen de toggle con algo que parece una etiqueta HTML, que el texto de un bloque no admite (en la base de desarrollo hay 0);
  - un id de bloque repetido entre dos páginas, por ejemplo en una página duplicada, que se reasigna con un id nuevo y se reescriben sus enlaces y comentarios.
- Pruebas: cada nodo del esquema actual convertido y vuelto a armar sin perder nada.

## Etapa 7 · Retiro del modelo viejo

Estado: hecha (`3e6fa73` retiro del modelo viejo, `8e55ca0` ADR 022 y reglas de negocio, `697d760` una sola forma de resolver quién lee un bloque). Se fue más lejos que el plan: el ADR 022 borra el outbox y los servicios de los workers, en vez de limpiar lo procesado. Quedan `BlockLink` para los enlaces y `PageVersion`, `PageSchemaProperty` y `PageSchemaView` sobre `Block`.

- Se quitan:
  - `Page.content`;
  - `CollaborationSnapshot`, `PageBlock` y `SearchDocument`;
  - Hocuspocus y `y-prosemirror`;
  - el worker de búsqueda y el de retroenlaces;
  - la bandera.
- Se limpia el outbox de lo procesado.
- Se actualizan:
  - los diagramas de `docs/architecture/diagramas/`;
  - las reglas BR-1e9a26a y BR-585748e, reemplazadas con `rules:add`.

## Riesgos que se vigilan en cada etapa

- **Rendimiento al abrir una página grande:** se mide con una página de 2.000 bloques.
- **Fidelidad del texto:** marcas y nodos en línea dentro de `Y.Text`, ida y vuelta.
- **Filtraciones:** ningún endpoint ni mensaje del canal devuelve un bloque que el lector no puede ver.
