# 025: Las vistas son consultas por reductores

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`
**Precedes:** las etapas 5 (aviso de cambios por colección), 7 (vistas que faltan) y 8 (fechas relativas y «yo») del plan `2026-10-20-paridad-con-notion.md`, que se apoyan en el contrato que fija este ADR.

## Context

Hoy una vista es una fila `PageSchemaView` con su configuración en JSON. Para mostrarla, el servidor lee todas las filas de la colección con `readPagesUnder`, comprueba el acceso de cada una en memoria, las corta en 500 (`COLLECTION_ROW_LIMIT`) y filtra, ordena y agrupa en TypeScript. Una consulta del agente recorre hasta 5.000 antes de filtrar. Esto tiene cinco límites que el producto ya no acepta:

- una colección de 10.000 filas se ve cortada en 500, y el corte no se puede continuar. No hay cursor ni «cargar más»;
- cada lectura cuesta en proporción a toda la colección, aunque la pantalla muestre veinte filas;
- los conteos y las sumas salen de las filas cargadas, así que con el corte son falsos;
- el orden manual de las tarjetas es el orden de `children` de la colección. Lo comparten todas las vistas y el árbol lateral, y mover una tarjeta de columna son dos escrituras separadas (el valor y el orden);
- la configuración de una vista se guarda completa. BR-22dc232 lo parcha leyendo y fundiendo antes de escribir, pero dos personas que editan la misma vista a la vez todavía pueden pisarse entre la lectura y la escritura.

Las etapas siguientes añaden vistas, filtros relativos y avisos en vivo. Cada una necesita una consulta que el servidor sepa paginar, contar y resolver para quien mira. `docs/architecture/references/notion-views-and-databases.md` (secciones 0, 2, 4 y 5) describe cómo lo resuelve Notion: la consulta es el id de la vista más reductores con nombre, el orden manual es una lista plana de ids con operaciones relativas, y las escrituras de la vista son finas. Esa referencia señala también lo que no hay que copiar: guardar el formato entero de una vez y agrupar por nombre de opción.

Medición previa, hecha para este ADR en una base desechable de Postgres 18.4 con 65.000 bloques (una colección de 10.000 filas, once de 5.000, 1 % de las filas con permisos propios) y caché caliente:

| Consulta sobre la colección de 10.000 filas | Índices | Tiempo |
|---|---|---|
| Primera página por `createdAt, id`, 50 filas | `parentId` | 2,6 ms |
| Igual | `(parentId, createdAt, id)` parcial | 0,05 ms |
| Filtro por estado y prioridad, orden por número, 50 filas | `parentId` | 2,3 ms |
| Conteo por grupo (`GROUP BY` del estado) | `parentId` | 2,5 ms |
| Suma, promedio, mínimo y máximo de un número | `parentId` | 5,5 ms |
| «Contiene» sobre una lista (persona), 50 filas | `parentId` | 2,3 ms |
| Siguiente página con cursor por número y `id` | `parentId` | 4,3 ms |
| Una columna de tablero en orden manual (unión con la lista del orden) | `parentId` | 15 ms |
| La misma columna con `array_position` por fila | `parentId` | 391 ms |
| Filas con permisos propios de la colección | `parentId` | 0,6 ms |
| Con 100.000 filas: filtro y orden / conteo por grupo | `parentId` | 25 ms / 28 ms |

Un índice GIN sobre `(parentId, properties->'values')` solo cambió el plan de las consultas muy selectivas (6 ms con 100.000 filas), y no cambió los conteos. Las cifras son de una máquina de desarrollo y se repiten en las pruebas de rendimiento de la implementación.

## Alternatives Considered

### Quién arma la consulta

- **Subir el tope y seguir agrupando en memoria.**
  - PRO: cero cambio de contrato.
  - CON: el costo sigue creciendo con la colección, el corte sigue sin poder continuarse y los conteos siguen siendo falsos pasado el tope.
- **El cliente manda filtro, orden y grupos completos (el «cargador» de Notion).**
  - PRO: sirve para vistas efímeras sin guardar nada.
  - CON: dos fuentes de verdad para la configuración, y el servidor tiene que validar y autorizar cada filtro que llega. Un agente tendría que releer la vista para saber qué consulta hace la persona.
- **El cliente manda el id de la vista y reductores con nombre; el servidor compila desde la vista guardada (elegida).**
  - PRO: una sola fuente de verdad, un contrato pequeño, y lo temporal (filtro rápido, búsqueda, orden de encabezado) viaja aparte.
  - CON: una consulta sin vista (la del agente) necesita sus propios campos temporales.

### Paginación

- **Subir el límite del reductor en cada «cargar más» (Notion).**
  - PRO: el servidor no guarda estado.
  - CON: cada página relee todo lo anterior. Después de diez páginas se han leído cincuenta y cinco.
- **Offset.**
  - PRO: trivial.
  - CON: salta o repite filas si alguien edita entre páginas, y el costo crece con el desplazamiento.
- **Cursor por claves (elegida).**
  - PRO: costo constante por página, y una edición ajena no repite ni salta filas ordenadas por una clave estable.
  - CON: el cursor lleva los valores de orden de la última fila, y el compilador debe generar la comparación con valores vacíos y direcciones mezcladas.

### Permisos en conteos y agregados

- **Filtrar las filas en TypeScript después de la consulta (como hoy).**
  - PRO: reutiliza `keepAccessible`.
  - CON: los conteos y las páginas dejan de coincidir con lo que se ve. Una página de 50 puede llegar con 38.
- **Calcular el acceso de cada fila en SQL con una consulta recursiva por ancestros.**
  - PRO: exacto sin estado intermedio.
  - CON: cada fila paga un recorrido de ancestros, y la lógica de `describePageAccess` quedaría duplicada en SQL.
- **Resolver primero el conjunto de filas que el lector no puede leer y empujarlo a la consulta (elegida).**
  - PRO: una fila hija de la colección hereda el acceso de la colección salvo que declare permisos propios. Esas filas son pocas (0,6 ms para encontrarlas entre 10.000), se evalúan con el código existente y todo conteo, página y agregado las excluye.
  - CON: el conjunto viaja como parámetro y tiene tope. Una colección con miles de filas restringidas necesita otra estrategia.

### Índices sobre `properties.values`

- **Un índice de expresión por propiedad (DDL desde la aplicación).**
  - PRO: orden y filtro por esa propiedad sin ordenar en memoria.
  - CON: las claves de propiedad son de cada colección, así que habría que crear y borrar índices al editar el esquema. Las filas se actualizan sin HOT en cada edición.
- **GIN sobre `(parentId, values)` con `btree_gin`.**
  - PRO: acelera «contiene» selectivo.
  - CON: no mejora conteos ni ordenes, y cuesta escritura en cada edición de una fila. Los bloques ya llevan dos GIN de texto.
- **Una tabla de valores tipados (una fila por celda).**
  - PRO: índices normales por tipo, escala a millones.
  - CON: duplica `properties.values` y obliga a mantener las dos copias. Es otra reescritura del modelo de ADR 021.
- **El índice por `parentId` que ya existe, más uno parcial para el orden por defecto (elegida).**
  - PRO: lo medido cabe en 30 ms hasta 100.000 filas, el índice parcial no impide las actualizaciones HOT, y no hay estructura que mantener.
  - CON: cada orden por propiedad ordena en memoria las filas ya filtradas. El umbral para reabrir esta decisión es una colección sobre 100.000 filas o un p95 sobre 50 ms.

### Orden manual

- **Seguir con `children` de la colección.**
  - PRO: ya existe, está completo y es seguro ante concurrencia.
  - CON: lo comparten todas las vistas y el árbol lateral. Reordenar una tarjeta del tablero mueve la fila en la tabla de otro equipo.
- **Índice fraccional en cada fila.**
  - PRO: mover es escribir una fila.
  - CON: dos personas que sueltan en el mismo hueco generan la misma clave, y la lista necesita reequilibrarse.
- **Una lista de ids por grupo.**
  - PRO: el orden de una columna es directo.
  - CON: mover entre columnas cambia dos listas, y si el valor de la fila cambia por otro camino, la fila queda en la lista equivocada.
- **Una lista plana de ids por vista, con operaciones relativas a un id (elegida).**
  - PRO: el orden de una columna es la subsecuencia de la lista, mover es una operación y dos movimientos con anclas distintas no se anulan.
  - CON: la lista de una vista tiene tope, y las filas nuevas hay que agregarlas a las listas que existen.

### Escrituras de la configuración de una vista

- **Seguir guardando la configuración completa con lectura y fusión previas.**
  - PRO: ya funciona.
  - CON: queda una ventana entre leer y escribir, y cada pantalla de configuración tiene su propia lógica de fusión.
- **Parches JSON genéricos.**
  - PRO: un solo mecanismo.
  - CON: direccionan listas por posición, que es justo lo que no resiste dos escritores.
- **Un vocabulario cerrado de operaciones, cada una sobre una clave o un elemento con id (elegida).**
  - PRO: dos personas que tocan claves distintas no se pisan, y cada operación se valida sola.
  - CON: hay que definir y probar cada operación, y los nodos del filtro necesitan ids.

## Decision

### El contrato de consulta

`POST /api/v1/collections/:collectionId/query`, con este cuerpo:

| Campo | Qué es |
|---|---|
| `viewId` | La vista guardada. Opcional. Sin vista no hay filtro, orden ni grupos propios. |
| `quickFilter` | Un filtro que se suma con AND al de la vista. No se guarda. |
| `search` | Texto que busca en el título de la fila (`Block.text`) y en sus respuestas de texto (texto enriquecido, enlace, correo y teléfono), sin distinguir mayúsculas ni acentos. No busca en números, fechas ni en los nombres de las opciones. No se guarda. |
| `sorts` | Reemplaza los de la vista solo para esta consulta (orden de encabezado, consulta del agente). |
| `timeZone` | La zona de quien mira. Se acepta y se reserva para la etapa 8 («hoy», «yo»). Hoy las fechas sin hora se comparan como UTC, igual que el oráculo de `packages/shared`, para que el SQL y el motor compartido no discrepen. |
| `reducers` | Lista de `{ id, kind, ... }`. El cliente elige el `id` y la respuesta lo devuelve. |

El servidor compila filtro, orden y grupos desde la vista guardada. El cliente nunca manda los de la vista. La zona, el lector y la hora entran al compilador como contexto, de modo que la etapa 8 resuelva «yo» y «hoy» ahí sin cambiar el contrato.

Cuatro reductores:

| `kind` | Entrada | Salida |
|---|---|---|
| `results` | `limit` (por defecto 50, tope 100), `cursor`, `properties` (valores que se devuelven) | `{ ids, nextCursor }` |
| `groups` | `groupBy` (por defecto el de la vista), `subGroupBy`, `rowsPerGroup` (por defecto 25, tope 50), `groupLimit` (por defecto 100), `includeHidden` | `{ groups: [{ key, hidden, ids, nextCursor }], hasMoreGroups }` |
| `groupResults` | `group: { key, subKey? }`, `limit`, `cursor` | `{ ids, nextCursor }`. Es el «cargar más» de una columna. |
| `aggregations` | `by` (`NONE` o `GROUP`), `items: [{ id, propertyKey, calculation }]` | un valor por ítem, y por grupo si `by` es `GROUP` |

- `groupBy` y `subGroupBy` dentro de `groups` permiten que el agente agrupe sin tocar la vista.
- Una respuesta no puede traer más de 1.000 ids entre todos los reductores. Pedir más se rechaza con `VIEW_QUERY_INVALID`.
- Las agregaciones son las que ya existen: contar todo, vacíos y llenos, suma, promedio, mínimo, máximo, mediana y porcentaje marcado. Cada propiedad admite las que su tipo permite en la tabla de ADR 024. Contar es una agregación sin propiedad, y el conteo de cada columna del tablero es una agregación `COUNT_ALL` con `by: GROUP`. Las sumas se hacen en `numeric`.
- La respuesta lleva `view` (id, versión y configuración compilada), `rows` (un registro por fila, una sola vez aunque esté en varios grupos, con los valores de las propiedades pedidas o visibles), `lookups` (títulos de filas relacionadas y nombres de archivos, como hoy) y `reducers` (un resultado por `id`).
- El lector de una fila sin permiso no recibe ni su id ni su registro. Lo mismo vale para los ids de relación de cada celda.
- Todos los reductores de una petición corren en una transacción de solo lectura con un solo snapshot y `statement_timeout` de 5 s. Dos peticiones distintas pueden ver estados distintos.

**Carga en dos fases.** El cliente pide primero `results` o `groups` y pinta. Después, en una segunda petición independiente, pide `aggregations` y muestra «calculando» hasta que llega. El servidor no guarda estado entre las dos. Los conteos de columna y los pies de tabla son siempre de la segunda fase.

**Gráficos y calendario.** El gráfico usa solo `aggregations` con `by: GROUP`, sin filas. El calendario pide `results` con un `quickFilter` sobre el rango visible, con límite 100 y aviso si hay más.

### Cursores y paginación

El cursor es opaco (JSON en base64url) y lleva la versión de la vista, un resumen del orden efectivo y el valor de cada clave de orden de la última fila, más su posición y su `id`. El orden siempre termina en `(posición, id)`, así que es total y estable. Los valores vacíos van al final en ambas direcciones.

- El compilador expande la comparación como una cadena de `OR` y `AND`, que cubre direcciones mezcladas y valores vacíos. La comparación por tupla de Postgres no los cubre.
- Si el orden efectivo cambió desde que se emitió el cursor, la respuesta es `VIEW_QUERY_CURSOR_STALE` y el cliente reinicia desde la primera página.
- Si una fila cambia de valor entre páginas, puede aparecer dos veces o no aparecer en esa carga. El cliente deduplica por id y repite la consulta cuando le avisen (etapa 5).

### SQL sobre `Block.properties.values`

- Las consultas siempre fijan `parentId = colección`, `type = 'page'` y `lifecycle = 'ACTIVE'`, y comparan sobre expresiones tipadas de `properties->'values'->key`. Cada extracción lleva una guarda de tipo (`jsonb_typeof`) para que una celda corrupta no tumbe la consulta.
- Opciones y estado comparan el id. Selección múltiple y persona usan contención (`@>`). La relación usa contención de un id. La fecha compara `start` y `end` como instantes. Creación y edición leen las columnas del bloque, como fija ADR 024.
- Agrupar por una propiedad de varios valores expande la celda con `jsonb_array_elements_text` y repite la fila en cada grupo. El reductor `aggregations` informa aparte `distinctRowCount`, para que un total no se infle.
- **Índices.** La migración añade uno solo: `Block_rows_order_idx` sobre `(parentId, createdAt, id)` con `WHERE type = 'page' AND lifecycle = 'ACTIVE'`. No se añade GIN ni índices por propiedad. Las pruebas de rendimiento (`page-query.performance.integration.spec.ts`) miden con `EXPLAIN` una colección de 10.000 filas, rodeada de 40.000 filas de otras colecciones, y un tablero de 2.000 tarjetas. Fallan si el plan lee `Block` entero en lugar de usar `Block_parentId_idx` o `Block_rows_order_idx`, si el p95 de la base supera 50 ms o si el p95 de la API supera 150 ms (solas, las consultas responden en 45 a 65 ms).
- **El orden por defecto no usa el índice parcial.** Una vista sin orden propio sigue el orden de `children`, que se lee como una lista de posiciones (`unnest ... WITH ORDINALITY`) unida a las filas: 6 ms con 2.000 filas y unos 15 ms con 10.000. El índice parcial sirve al orden por fecha de creación. Para que el planificador una las posiciones con un hash y no con un bucle anidado (que las recorre una vez por fila: 223 ms con 2.000 filas, 2,8 s con 10.000), la transacción de lectura fija `enable_nestloop = off`. La prueba de rendimiento lo descubrió y lo vigila.
- **Semántica única.** El motor de `packages/shared` (`matchesPageFilter`, `comparePageRowsBySorts`) sigue siendo el oráculo de qué significa cada operador. El compilador SQL se prueba contra él con colecciones generadas, por cada tipo y operador de la tabla de ADR 024. El portal lo sigue usando para decidir dónde cae localmente una tarjeta que acaba de moverse.

### Permisos

Antes de compilar, el servidor calcula el **conjunto denegado** de la colección:

1. busca las filas con `permissions IS NOT NULL`, que son las únicas que pueden diferir de la colección (el lector ya pasó el control de acceso de la colección);
2. evalúa esas filas con `keepAccessible`, el mismo código que usan hoy las lecturas;
3. pasa los ids que el lector no puede leer como `id <> ALL($ids)` a cada reductor.

Así los conteos, las páginas, los agregados y los grupos excluyen esas filas, y un conteo nunca revela que existen. El tope es 5.000 ids denegados. Pasado el tope, la consulta falla con `VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS` y un log `ERROR` con el id de la colección, y no se degrada en silencio.

**Valores de relación.** Para cada propiedad de relación que la consulta toque (como filtro, orden o agregado), el servidor calcula el conjunto de filas de la colección destino que el lector no puede leer o que están en la papelera, con el mismo tope. La consulta resta ese conjunto de la celda antes de comparar o contar (`values->key - $ids::text[]`). Un filtro cuyo valor es un id que el lector no puede leer no coincide con nada. Purgar una fila quita su id de las celdas de relación de las demás filas en la misma transacción de la purga, así que no quedan ids colgantes y los conteos son exactos. La relación admite como agregación contar llenos y vacíos, no sumas ni medianas, porque sus valores no son números.

### Orden manual

`PageSchemaView` gana `manualOrder`, una lista de ids de filas que puede ser nula.

- **Nula** significa que la vista sigue el orden de `children` de la colección, que es el comportamiento de hoy. Ninguna vista existente cambia de aspecto.
- **Con lista**, el orden de una vista sin `sorts` es esa lista. Una vista con `sorts` ordena por ellos y usa la lista solo para desempatar. Una fila que no está en la lista va después de las que sí, por `createdAt` y `id`.
- **Se materializa en la primera operación de orden.** El servidor copia a la lista las filas vivas en el orden de `children`, dentro de la misma transacción que aplica la operación. El tope es 20.000 ids. Más allá, reordenar a mano se rechaza con un mensaje claro.
- **Las operaciones** son `listAfter`, `listBefore` y `listRemove` sobre el puntero de la vista, con la misma semántica que sobre `children`: mover quita el id si estaba y lo inserta tras el ancla, o al final si el ancla ya no está. Son idempotentes y relativas a un id.
- **Filas nuevas.** La transacción que crea una fila la agrega al final de las listas no nulas de las vistas de su colección. Una fila a la papelera conserva su lugar y vuelve a él al restaurarse. Purgarla la quita de las listas.
- **Posición en SQL.** La consulta une las filas con `unnest(manualOrder) WITH ORDINALITY`. Esa unión cuesta 15 ms con 10.000 filas, contra 391 ms de `array_position` por fila.
- **Es una sola lista para toda la vista**, no una por grupo. El orden de una columna es la subsecuencia de las tarjetas que caen en ella.

**Mover una tarjeta de columna es una sola transacción** del canal de bloques, con dos operaciones: la que cambia el valor de la fila y una `listAfter` (o `listBefore`) sobre la vista, anclada a la tarjeta vecina de la columna destino. Si la columna destino está vacía, no hay operación de orden. Con tablero de subgrupos, el movimiento diagonal cambia los dos valores en esa misma transacción. Si cualquier operación falla, no queda nada a medias. La tarjeta se mueve en pantalla antes de la respuesta, y si la transacción falla el cliente vuelve a pedir la columna.

Las propiedades de varios valores (selección múltiple, persona) se mueven con un comando nuevo del bloque, `changeValueList` con `{ property, add, remove }`, en lugar de los dos previstos (`addValue` y `removeValue`): una tarjeta que cambia de columna quita una entrada y agrega otra, y un solo comando lo hace en un paso. Es idempotente y relativo a lo que la celda guarda al escribir, como `addRelation`: primero quita, luego agrega tras las entradas que se quedan y sin repetir. Arrastrar una tarjeta de la columna A a la B quita A y agrega B sin tocar los demás valores de la celda, aunque otra persona los haya cambiado en el intervalo. `move-row` lo recibe como `listChanges` y lo valida con las reglas de la propiedad antes de escribir. El comando solo lo envía el backend (es de los de página); un cliente cambia una celda con `set`.

Cambiar el orden de una vista exige poder editar la colección, como cambiar su configuración. Un editor de la fila sin permiso sobre la colección puede cambiar el valor de la tarjeta, pero no moverla de lugar, y la transacción conjunta se rechaza entera.

### La configuración de una vista se escribe por operaciones

`PageSchemaView` gana `version` (entero, sube con cada operación) y el canal de bloques acepta una tabla nueva, `view`, con estos comandos. Cada uno toca una clave o un elemento, nunca la configuración entera:

| Comando | Sobre | Efecto |
|---|---|---|
| `set` | una clave escalar (`groupBy`, `rowHeight`, `frozenColumns`, `icon`, `visibleProperties` y las demás de la configuración) | reemplaza ese valor. `name` e `isDefault` no son operaciones: siguen cambiando con la forma de la colección. |
| `setEntry`, `removeEntry` | un mapa por clave (`calculations`, `columnWidths`, `columnAlignments`, `columnLimits`) | cambia o quita la entrada de una clave |
| `listAfter`, `listBefore`, `listRemove` | una lista de claves (`visibleProperties`, `collapsedGroups`, `hiddenGroups`, `manualOrder`) | inserta relativo a un id |
| `sortSet`, `sortRemove` | `sorts`, que se identifica por `propertyKey` | cambia la dirección o quita un orden |
| `filterInsert`, `filterUpdate`, `filterRemove` | un nodo del filtro, por su `id` | agrega, cambia o quita un nodo sin tocar los demás |

- Cada nodo del filtro (condición o grupo) lleva un `id`. El servidor lo asigna si falta.
- `visibleProperties` nulo significa «todas». La primera operación sobre la lista la materializa con las propiedades actuales.
- Tras aplicar las operaciones, el servidor valida la vista resultante con `validateSchemaView`, como hoy, y rechaza la transacción entera si no es válida.
- Dos personas que cambian claves distintas no se pisan. Dos que cambian la misma clave escalar conservan la última, como en el resto de los campos del bloque.
- La escritura de la configuración completa queda solo para crear una vista. `update_view` del MCP y las pantallas del portal pasan a las operaciones.

### Agrupar

- Las vistas citan opciones por id (ADR 024). Una columna de tablero es una opción, y el grupo «sin valor» es la clave `UNASSIGNED_GROUP_KEY`.
- El estado agrupa por opción o por grupo con una clave nueva, `groupByMode` (`OPTION` o `GROUP`), que solo vale para estado. Soltar una tarjeta en un grupo de estado le da la primera opción de ese grupo, la misma regla que ADR 024 usa al quitar una opción. El estado no tiene grupo «sin valor».
- Persona y selección múltiple agrupan por cada valor, con las filas repetidas. El tablero deja de excluirlas, lo que cambia la nota de ADR 024.
- Las propiedades sin opciones declaradas (fecha, número, casilla, creación y edición) toman los grupos de los valores que las filas tienen, ordenados, hasta `groupLimit`. Si hay más, `hasMoreGroups` es verdadero y la interfaz lo dice.
- **Grupos ocultos.** `hiddenGroups` es una lista de claves de la vista. Sus filas no salen de `groups` salvo que se pida `includeHidden`, y la interfaz las ofrece en una lista con su conteo. `hidesEmptyGroups` y `hidesUnassignedColumn` siguen como están.
- **Orden de los grupos.** Sigue viviendo en la propiedad (el orden de sus opciones), como hoy, y no en la vista. No cambia.
- **Subgrupos.** Una celda del tablero con subgrupos es `{ key, subKey }`. Los reductores `groups`, `groupResults` y `aggregations` la aceptan, y la etapa 7 no cambia el contrato.

### Portal

- Las vistas se piden por **id**, no por nombre. El nombre sigue siendo único por colección.
- La primera carga la hace el servidor de Next con la fase uno. La fase dos y el «cargar más» van por acciones del cliente. Cada columna de tablero, cada grupo de tabla y la lista de una galería pagina por su cuenta.
- **Virtualización** de tabla, lista y tablero con una ventana propia (`usePagesWindowVirtualizer`): sigue el desplazamiento del área principal del portal, dibuja las filas visibles más un margen de diez, mide cada fila después de dibujarla y mantiene siempre montada la tarjeta que se arrastra. Una lista de hasta sesenta elementos se dibuja entera. En el tablero se virtualizan las tarjetas de cada columna. El arrastre se resuelve contra el orden de los datos y no contra el DOM. Se probó `@tanstack/react-virtual` y se retiró: sus funciones no son compatibles con las reglas de React de este repositorio (`react-hooks/incompatible-library`, `react-hooks/refs`), y la única salida era una directiva que las silencia, que `AGENTS.md` no permite. La ventana propia son unas ochenta líneas puras con pruebas, y no añade ninguna dependencia.
- «Seleccionar todo» selecciona las filas cargadas. Ofrece «seleccionar las N que coinciden», que trae solo ids con un tope de 1.000.
- Antes de pedir una consulta, el cliente espera a que se envíen sus escrituras pendientes sobre esa colección, para que el resultado ya las contenga.

### Herramientas del MCP

`query_collection` conserva su nombre y cambia de forma para que un agente pida exactamente lo que necesita, con nombres de columna y de opción en vez de ids:

| Campo | Qué hace |
|---|---|
| `collection`, `view?` | La colección y, si se da, la vista cuyo filtro y orden se aplican. |
| `where?`, `sort?` | Filtro (se suma al de la vista) y orden (reemplaza el de la vista). Es lo que hoy ya existe. |
| `search?` | Busca en el título y en las respuestas de texto de las filas. |
| `columns?` | Qué columnas devolver. Por defecto, las visibles de la vista, con un tope. |
| `limit?`, `cursor?` | Una página de filas. `limit: 0` no devuelve filas. |
| `group?` | El nombre de un grupo, para leer solo sus filas con su propio cursor. |
| `groupBy?` | Devuelve los grupos con su conteo y sus primeras filas. |
| `aggregate?` | Una lista de `{ column, calculation }`, con `by: group` opcional. |

- Lo que se implementó: `groupBy` agrupa y trae el conteo de cada grupo; `group` lee las filas de un solo grupo con su cursor; `aggregate` es una lista de `{ calculation, column? }` sobre todas las filas que pasan el filtro (con `groupBy`, también por grupo); `columns` recorta las columnas de cada fila (el título siempre va); `limit: 0` devuelve solo conteos. Sin `groupBy` la respuesta no se agrupa aunque la vista agrupe, y con `view` y sin `where` ni `sort` se lee con el orden manual de esa vista. La descripción de la herramienta explica cómo pedir solo conteos, un grupo o una página con las columnas necesarias.
- El cursor del MCP es el del servidor. `truncated` desaparece, y `total` sale de una agregación exacta: todas las filas que el token puede leer y que pasan el filtro. Las filas que una regla del token cierra se excluyen de la consulta, no se descartan después.
- Una escritura nueva, `move_row`, recibe `{ collection, view, row, properties?, before?, after? }` y la ejecuta como la transacción única de arriba. `update_view` conserva sus campos de alto nivel (dónde filtra, cómo ordena, por qué agrupa) pero ya no manda la configuración completa: calcula la diferencia con la vista y la manda como operaciones. Los títulos de las filas que una relación enlaza se buscan por id o por título exacto en el servidor, no listando la colección.
- Salida: no se hizo una forma compacta de lista de valores; cada fila trae sus propiedades con nombre, y `columns` es la forma de acortarla.

### Migración

Una sola migración (`packages/db`, conforme a su `AGENTS.md`), en una transacción:
1. agrega `PageSchemaView.manualOrder` (lista de texto nula) y `PageSchemaView.version` (entero, 0 por defecto);
2. crea `Block_rows_order_idx`;
3. asigna `id` a cada nodo de filtro de cada configuración y agrega `hiddenGroups: []` y `groupByMode: 'OPTION'`;
4. cuenta vistas y nodos de filtro antes y después, y falla si no coinciden.

Se prueba primero en una base desechable y después se aplica a `company-brain`. El orden de `children` no se toca.

## Consequences

- Positivas:
  - una colección de 10.000 filas se recorre por páginas de costo constante, y 100.000 filas siguen en unos 30 ms según lo medido;
  - los conteos y los agregados son exactos y excluyen lo que el lector no puede leer;
  - el tablero deja de ser un caso especial: cada columna es un `results` con su cursor;
  - mover una tarjeta cambia valor y orden en una transacción, y dos personas que reordenan o que cambian ajustes distintos de la misma vista no se pisan;
  - las vistas dejan de compartir el orden de las filas;
  - un agente pide una página, una columna o solo los conteos, con una salida corta;
  - las etapas 5, 7 y 8 reciben el punto de entrada: versión de la vista, celdas `{ key, subKey }` y un compilador con contexto de lector, zona y hora.
- Negativas:
  - hay dos implementaciones de la semántica de filtro, la de TypeScript y la de SQL, y solo la prueba de paridad evita que se separen;
  - el conjunto denegado tiene tope, y una colección con más de 5.000 filas restringidas falla en vez de degradarse;
  - la purga de una fila recorre las celdas de relación que la citan, y eso suma trabajo a la transacción de purga;
  - cada orden por propiedad ordena en memoria las filas filtradas, con un umbral conocido para reabrir la decisión;
  - la lista de orden manual de una vista tiene tope de 20.000 ids y cada fila nueva se agrega a ella;
  - una fila que cambia de valor entre dos páginas puede repetirse o faltar hasta la siguiente consulta;
  - la fase dos obliga a una segunda petición por vista;
  - el filtro cambia de forma (ids en los nodos), y todo código que lo construye o lo lee se actualiza.
- Cambios de comportamiento existente:
  - arrastrar una tarjeta ya no reordena la fila en las demás vistas ni en el árbol lateral;
  - el tope de 500 filas y el de 5.000 de la consulta desaparecen, junto con `hasMore` y `truncated`;
  - el tablero agrupa por persona y selección múltiple, que ADR 024 había dejado fuera, y por grupo de estado;
  - las vistas se direccionan por id y no por nombre en el contrato;
  - la configuración completa deja de escribirse desde las pantallas y el MCP;
  - `query_collection` cambia de forma y gana `move_row` como herramienta de escritura.
- Aceptado como costo: el modo cliente de Notion (el servidor devuelve todos los ids y el cliente filtra en local) queda fuera. Se evalúa con la etapa 5, cuando haya canal de cambios por colección.

## Governance

- La prueba de paridad entre el compilador SQL y el motor de `packages/shared` cubre cada operador de cada tipo de la tabla de ADR 024. Un operador nuevo no entra sin ese caso.
- Las pruebas de rendimiento (colección de 10.000 filas y tablero de 2.000 tarjetas) comprueban con `EXPLAIN` que el plan use `Block_rows_order_idx` y `Block_parentId_idx`, y miden el tiempo. Un plan con `Seq Scan` sobre `Block` rompe la prueba.
- Las pruebas de permisos comprueban que un lector con una fila oculta ve el mismo conteo en `groups`, `aggregations` y `results`, y que una celda de relación no cuenta ids ilegibles.
- Reglas de negocio de `FEA-CLC` que este ADR cambia, a reemplazar con `rules:add` y `supersedes` al implementar:
  - BR-3c85c11 (el tope de filas y su aviso);
  - BR-22dc232 (guardar la configuración fundiendo lo que hay);
  - BR-5a97271 (una tarjeta soltada solo escribe el valor: ahora también el lugar);
  - BR-f707396 (un cambio de columnas no pisa el de otro), si su alcance cubre las vistas.
  Se añaden reglas para el orden manual por vista, el conjunto denegado en conteos y agregados, y las operaciones de configuración.
- Todo error del compilador es un `Result` con código (`VIEW_NOT_FOUND`, `VIEW_QUERY_INVALID`, `VIEW_QUERY_CURSOR_STALE`, `VIEW_QUERY_TIMEOUT`, `VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS`). Un fallo inesperado deja un `ERROR` con traza y nunca una lista vacía.
- Una decisión de abrir el tope de 100.000 filas por colección o de añadir índices por propiedad se toma en un ADR nuevo.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21. Aprobado con cuatro precisiones. El orden manual es por vista y una lista nula sigue el orden de `children`. Superar el tope de 5.000 ids denegados falla con error tipado y deja un log `ERROR` con el id de la colección. `@tanstack/react-virtual` se aprobó para `apps/portal` con versión fija (después no se usó, ver Portal) y `addValue`/`removeValue` quedan aprobados (se implementaron como un solo comando, `changeValueList`). Purgar una fila quita su id de las celdas de relación en la misma transacción, así que no quedan ids colgantes.
- Modified: 2026-10-21 (cierre de limitaciones). La búsqueda del portal ya no filtra en la pantalla lo cargado: las palabras viajan en la dirección (`q`) y se mandan como `search`, que mira el título de la fila y sus respuestas de texto (lo mismo que miraba la búsqueda de la pantalla), a las filas, a los conteos y a las páginas siguientes de la tabla, la lista, la galería y el tablero. El calendario lee con `quickFilter` las filas que empiezan en los días de la cuadrícula del mes (`month` en la dirección; hasta mil, y la pantalla avisa si hay más), y cuenta aparte las filas sin fecha. Lo que una columna o una tabla cargó con «cargar más» se conserva cuando el servidor la dibuja de nuevo: la ventana se lee otra vez desde el nuevo final (`refreshPageRowsAction`) y reemplaza lo anterior. «Seleccionar las N que coinciden» pide los ids al servidor, hasta mil, y avisa si son más.
- Modified: 2026-10-21 (etapa 8, fechas relativas y «yo»). `timeZone` deja de estar reservado. El servidor resuelve el filtro para quien consulta antes de compilarlo: `@me` pasa a ser el id del lector (el dueño del token en el MCP) en las propiedades de persona, creada por y editada por, y las fechas relativas (`@today`, `@yesterday`, `@tomorrow`, `@this_week`, `@last_week`, `@next_week`, `@this_month`, `@last_month`, `@next_month`, `@past_days:N`, `@next_days:N`, con N de 1 a 365) pasan a ser un rango de días en la zona dada, sobre fecha, fecha de creación y fecha de edición. Se guardan como texto en el nodo del filtro, y un marcador que no existe se rechaza al guardar la vista y al consultar. Las semanas van de lunes a domingo y los últimos y próximos N días incluyen hoy. Una fecha sin hora se compara por días y una con hora por instantes de la zona (el motor compartido y el SQL calculan los límites con los mismos valores, y la prueba de paridad corre en cuatro zonas). Se agregan los operadores `IS_ON_OR_BEFORE` e `IS_ON_OR_AFTER` para fechas. Cambio de comportamiento: una fila sin valor en la propiedad ya no pasa cualquier condición sobre ella; solo cumple las que piden la ausencia (`IS_NOT`, `NOT_CONTAINS`, `IS_NOT_IN_GROUP`), y una casilla sin tocar vale «sin marcar», porque de otro modo «responsable contiene yo» mostraba las filas sin responsable. El filtro rápido del portal usa el `quickFilter` del contrato y viaja en la dirección (`filter`); la zona del navegador viaja en una cookie que el servidor de Next lee y manda como `timeZone`. El servidor lee la hora de un reloj inyectable (`PAGE_QUERY_CLOCK`) para que las pruebas se queden quietas en un instante.
- Modified: 2026-10-21 (etapa 7, vistas que faltaban). Se agrega el tipo de vista `TIMELINE` (un valor más del enum de la base, con su migración) y estas claves de la configuración, todas escritas por las operaciones de esta decisión y nunca por la configuración entera: `endDateProperty` (la propiedad donde termina cada fila; nula lee el final del rango de `dateProperty`), `dateScale` (`DAY`, `WEEK` o `MONTH`; el calendario toma las dos últimas), `cardSize` (`SMALL`, `MEDIUM` o `LARGE`), `coverProperty` y el mapa `columnWraps` (columnas que ajustan su texto). El contrato de consulta no cambia, con una sola ampliación: el valor de una condición sobre una fecha puede ser un rango de días `{ start, end }`, y `IS` lo entiende como «las fechas de la fila se superponen con esos días», que es la pregunta de una ventana de calendario o de línea de tiempo (el motor compartido ya lo definía así y el compilador SQL lo repite). La ventana viaja como `quickFilter`, y `andQuickFilters` ya no anida el filtro de la persona un nivel más cuando es un grupo «y», porque el servidor acepta tres niveles. Con el final en otra propiedad la ventana son dos preguntas (inicio antes de que termine la ventana y final después de que empiece, e inicio dentro de la ventana sin final) y no una «o», que ya no cabría en tres niveles; el portal junta las respuestas. Una línea de tiempo lee hasta 2.000 filas de su ventana (20 páginas) y dice cuántas dibuja si hay más; las filas sin inicio se piden aparte, 100 y el total. **Portada de tarjeta: sale de una propiedad de archivos, no del contenido de la página.** Las filas ya traen esa propiedad y sus archivos (con el tipo MIME) en la misma respuesta, mientras que la primera imagen del cuerpo pediría leer el cuerpo de cada fila y obligaría a avisar de sus cambios, que ADR 026 deja fuera del aviso a propósito; una portada desde el contenido queda pendiente de ese aviso. Ocultar un grupo ya estaba en el servidor (`hiddenGroups`, `includeHidden`) y ahora lo ofrece el tablero: el menú de la columna oculta, y una lista aparte, con el conteo que sale de las agregaciones por grupo, las muestra de nuevo. La validación de una vista exige que `dateProperty` y `endDateProperty` apunten a una propiedad de fecha y `coverProperty` a una de archivos, y deja pasar una clave de una propiedad que ya no existe, para que la vista siga pudiéndose cambiar. Las lecturas y escrituras de orden manual de la tabla usan `move-row` con solo el vecino, sin valores.
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 4)
- La medición se hizo en una base desechable (`adr025_scratch`, ya borrada) con los scripts de la sesión, y se repite en las pruebas de la implementación.
