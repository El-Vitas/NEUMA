# Plan: todo es un bloque

Implementa el ADR 021 en la rama `refactor/bloques-planos`. Cada etapa se cierra con:
- sus pruebas escritas antes del código;
- `bun run check` en cero;
- las pruebas del backend y del portal en verde;
- un commit por etapa.

El modelo viejo sigue funcionando detrás de la bandera `NEUMA_BLOCK_MODEL` hasta la etapa 7.

## Etapa 1 · El modelo `Block` y su lectura

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

- WebSocket en el backend: suscripción por página, envío de las operaciones aplicadas a cada suscriptor que puede leer el bloque, y presencia con vencimiento.
- Al reconectar, `sync` por versión.
- Pruebas:
  - un lector sin permiso no recibe la operación;
  - una reconexión recupera lo perdido;
  - la presencia vence.

## Etapa 4 · Editor

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

- MCP: leer y editar por bloque, ahora como operaciones.
- Exportación, colecciones y vistas, historial de versiones, papelera y purga diferida, plantillas, bloques sincronizados y subpáginas.
- Búsqueda sobre `Block` en vez de `PageBlock` y `SearchDocument`.
- Pruebas: las que ya existen para cada uno, más las de permisos por bloque en cada lectura.

## Etapa 6 · Migración

- Comando de una sola vez: `Page` y `Page.content` pasan a `Block`, con el `textState` generado y los ids, versiones y papelera conservados.
- Se prueba contra una copia de la base de desarrollo y después contra una copia de la de producción.
- Respaldo completo antes de correrla.
- Pruebas: cada nodo del esquema actual convertido y vuelto a armar sin perder nada.

## Etapa 7 · Retiro del modelo viejo

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
