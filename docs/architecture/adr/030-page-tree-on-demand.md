# 030: Árbol de páginas bajo demanda

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `022-retire-the-outbox-and-projection-workers.md`, `025-views-as-reducer-queries.md`, `029-client-record-cache.md`
**Precedes:** nada del plan `2026-10-20-paridad-con-notion.md`. Cierra la deuda que la cuarta nota de ADR 029 dejó abierta (el árbol de páginas devuelve todo el espacio).

## Context

Abrir una página en un espacio de 12.000 páginas transmite un documento de unos 40 MB y tarda unos 5,9 s. La causa es una sola decisión de diseño. El portal trata «las páginas del espacio» como una lista completa con su contenido, y todo lo demás se apoya en ella.

- `GET spaces/:spaceId/pages?includeTrashed=true` devuelve las 12.000 páginas con su documento. Pesa 9,98 MB y tarda 1.010 ms.
- El servidor de Next la pide dos o tres veces por carga: el layout para armar el menú lateral de **todos** los espacios, la ruta de la página, y `generateMetadata`.
- La ruta de la página entrega esa lista entera al componente de cliente `PagesWorkspace`, que la serializa en el documento (los 40 MB).
- El backend ya tiene lo contrario. `PageOutlineRepository` expone `listChildren` (con ventana, conteo de hijos legibles y marca de colección), `listAncestors` y `listReadable`, y el MCP los usa en `list_pages`. El portal no.

### Quién usa hoy la lista completa

Medido con búsqueda en el código. La columna final dice qué la reemplaza.

| Consumidor | Qué toma de la lista | Lo reemplaza |
|---|---|---|
| `app/(portal)/layout.tsx` (menú lateral) | Id, título, ícono, orden, padre, ciclo de vida y permisos propios de cada página de cada espacio | `GET pages/tree` por padre, solo raíces y lo abierto |
| `spaces/[spaceId]/page.tsx` (inicio del espacio) | Páginas raíz y actividad reciente (todas, ordenadas por edición) | `tree` de raíces y `GET pages/recent` con tope |
| `pages/[pageId]/page.tsx`, `readPagesHolding` | La página abierta, para saber si existe y re-lectura si el caché no la tiene | `GET pages/:pageId` (ya existe), sin lista |
| `generateMetadata` de esa ruta | Título de la página abierta | La misma lectura de la página, deduplicada por petición |
| `resolvePanelPageId` | Comprueba que la página del panel lateral exista | `GET pages/:pageId` de la página del panel |
| `PagesWorkspace` (`pages`) | Página seleccionada, árbol para migas, páginas para el editor y el panel | `page`, `panelPage` y `ancestors` por separado; `pages` desaparece |
| Migas de pan (`splitBreadcrumbParentPages`, `parentBreadcrumbPages`) | Cadena de padres construida con `buildPageTree` | `GET pages/:pageId/ancestors` (envuelve `listAncestors`) |
| Menciones y enlaces (`gatherThePagesNamed`, `usePagesMentionSearch`, `pagesAtHand`) | Páginas «a mano» para sugerir antes de buscar | Lo cargado en el árbol y recientes, más la búsqueda de servidor que ya existe |
| Títulos e íconos de subpáginas incrustadas (`pages.editor.subpage.lib`) | Título, ícono y ciclo de vida por id | `POST pages/lookup` en lote |
| Bloques sincronizados (`readBorrowedBlock`, `pages.editor.synced.lib`) | El **contenido** de otras páginas, leído de la lista | El servidor lee de una vez las páginas citadas por la abierta y las entrega con ella; los nuevos se piden con `lookup` de contenido |
| Panel de propiedades de una fila (`buildPanelLookups`, `relatedRows`) | Títulos de las filas a las que apunta una relación | `POST pages/lookup` con los ids de la relación |
| `buildEmbeddedCollections` | Título de cada colección incrustada | `lookup` de esos ids |
| `listPageDestinationsAction` (selector de destino) | Todas las páginas activas del espacio | El selector pide por padre con el mismo `tree` y busca con la búsqueda existente |
| `listMoveDestinations` | Ya es una lectura aparte del backend | Sin cambio |
| `/trash` y `getTrashedPages` | Su propio endpoint, sin ventana | El mismo endpoint, ahora paginado |
| `exportAsMarkdown` (backend) | `list(...)` interno | Sin cambio. Es una exportación, lee todo a propósito |

El backend queda con un solo llamador de la lista completa, la exportación. `GET spaces/:spaceId/pages` deja de ser parte de la ruta de lectura del portal.

### Cómo lo resuelve Notion

El menú lateral de Notion carga las raíces, los favoritos y el camino hacia la página abierta. Los hijos llegan al expandir, y cada fila trae si tiene hijos para dibujar la flecha sin cargarlos. Las filas de una base de datos nunca aparecen en el menú. El contenido de una página solo viaja cuando se abre, y los títulos de menciones y enlaces se piden en lotes por id y se guardan en la caché de registros. Los cambios de otros llegan por el canal en vivo y tocan solo la rama que cambió.

### Metas medidas

En la compilación de producción, en el espacio de 12.000 páginas, con la cuenta administradora.

| Medida | Hoy | Meta |
|---|---|---|
| Documento de la página abierta | 40 MB | 1 MB o menos |
| Primer dibujo al abrir una página | 5,9 s | 1,5 s o menos |
| Cada petición del árbol (raíces, hijos, camino, lote, ancestros) | 1.010 ms la lista | 100 ms o menos, p95 |

## Alternatives Considered

### Cómo se carga el árbol

- **Mantener la lista completa y quitarle el contenido.**
  - PRO: el cambio más chico. La lista sin documento pesaría unos 2 a 3 MB.
  - CON: sigue creciendo con el espacio y sigue tardando lo que tarda armar 12.000 entradas legibles (permisos fila por fila). A 100.000 páginas el problema vuelve. No resuelve el costo del servidor, que es lo que pesa, y mantiene el menú de todos los espacios en el layout.
- **Cargar el árbol completo en el navegador una vez y mantenerlo con el canal en vivo.**
  - PRO: sin peticiones al expandir.
  - CON: la primera carga es la misma de hoy sin el contenido, y el canal en vivo tendría que mantener 12.000 entradas por pestaña. Reproduce el problema en otro lugar.
- **Raíces, favoritos, camino abierto e hijos al expandir, con `hasChildren` (elegida).**
  - PRO: el costo depende de lo que la persona ve, no del tamaño del espacio. Reutiliza `listChildren` y `listAncestors`, que el MCP ya prueba con permisos. Es lo que hace Notion.
  - CON: expandir pide al servidor la primera vez (se cubre con la caché local de ADR 029). Hay que mantener ramas parciales al llegar cambios de otros. Buscar dentro del menú ya no recorre un árbol completo, así que se apoya en la búsqueda de servidor.

### Cómo se entera el menú de cambios de otros

- **Invalidar la caché del espacio y volver a pedirlo todo (lo de hoy).**
  - PRO: sin código nuevo.
  - CON: con el árbol parcial obliga a releer todas las ramas abiertas, y no se entera de nada hasta una navegación.
- **Sondeo cada cierto tiempo.**
  - PRO: simple.
  - CON: latencia, carga constante por pestaña y nada que ADR 020 y 026 no resuelvan mejor.
- **Un aviso `tree-changes` por el canal en vivo existente (elegida).**
  - PRO: el canal ya entrega por permisos y sabe de `previousParentId`, `hasAccessChange` y de «demasiados», igual que los avisos de colección de ADR 026. El menú aplica solo lo que cambió.
  - CON: una suscripción más que mantener (ver «Decisiones que necesitan confirmación»).

### Resolver títulos de menciones, enlaces y subpáginas

- **Un `GET` por id.** CON: N+1 al abrir una página con 40 menciones.
- **Embeber el título en el documento al escribir.** CON: se desactualiza al renombrar y toca todo el documento de cada página que menciona.
- **Lote por ids con coalescencia y caché (elegida).** PRO: una petición por apertura, sin importar cuántas menciones. Los resultados van al almacén de ADR 029 con su `version`, así que no se piden dos veces y se corrigen con `sync`.

## Decision

### Contratos del backend

Todos bajo `JwtAuthGuard`, resueltos con el mismo `PageOutlineReader` que ya usa el MCP. Ninguno se salta la visibilidad por permisos ni el alcance del token. Lo que el lector no puede abrir no aparece, no se cuenta y no deja rastro en un total.

- **`GET spaces/:spaceId/pages/tree?parentId=&skip=&take=`.** Hijos de un padre (o raíces si falta `parentId`), con ventana (`take` por defecto 100, máximo 200). Cada entrada lleva `id`, `title`, `icon`, `order`, `lifecycle`, `hasOwnPermissions`, `hasChildren`, `isCollection` y `version`. La respuesta trae `total`. `hasChildren` es un booleano y no un conteo, porque contar hijos legibles de cada fila cuesta más que saber si hay uno. Una colección entra con `hasChildren: false`. Sus filas nunca aparecen en el árbol. Las páginas en la papelera no se listan.
- **`GET spaces/:spaceId/pages/:pageId/path`.** El camino abierto en una sola ida. Devuelve los ancestros desde la raíz (con la redacción de `listAncestors` para los que no se pueden leer) y, por cada nivel, la ventana de hijos que contiene al siguiente, de modo que la página abierta siempre quede dentro de su ventana. Una sola petición arma el menú abierto.
- **`GET spaces/:spaceId/pages/:pageId/ancestors`.** Solo la cadena, para migas y para el panel lateral.
- **`POST pages/lookup`.** Cuerpo `{ ids }` (hasta 100), a nivel del espacio de trabajo porque una mención puede apuntar a otro espacio. Devuelve `{ id, title, icon, lifecycle, spaceId, version }` por cada id legible. Un id inexistente y uno sin acceso se responden igual (ausentes), para no filtrar su existencia.
- **`POST pages/lookup-content`.** Cuerpo `{ ids }` (hasta 20). Devuelve el documento de esas páginas, con el mismo filtro de permisos. Es la única lectura masiva de contenido y la usan los bloques sincronizados.
- **`GET spaces/:spaceId/pages/recent?take=`.** Las últimas editadas del espacio que el lector puede abrir (tope 50), para el inicio del espacio.
- **`GET pages/trash?spaceId=&search=&skip=&take=`.** El endpoint de papelera actual, ahora con ventana y `total`. Es lo único que lista páginas borradas.
- **`GET spaces/:spaceId/pages`.** Se conserva para la exportación y para clientes externos, pero el portal deja de llamarlo.

Si `listChildren` no cumple los 100 ms con 12.000 hermanos, la ventana se empuja a SQL (orden por posición, sobrelectura para el filtro de permisos) y se agrega el índice que el plan pida. Es una migración chica, formateada con biome sobre ese archivo, y se anota aquí al hacerla.

### Portal

- El layout deja de leer páginas. Entrega los espacios, los favoritos (que ya traen título e ícono) y las raíces de cada espacio visible. El árbol de cada espacio vive en un almacén de cliente (el de ADR 029, con un tipo de registro de esquema `outline`) que guarda, por padre, la lista de hijos y su `total`. Se pinta desde IndexedDB y se revalida contra `tree`.
- La ruta de la página lee la página abierta, la del panel (si hay) y `path`. El componente de cliente recibe `page`, `panelPage`, `ancestors` y los títulos que ya resolvió el servidor para esa página. Nunca más una lista con contenido. `PagesWorkspace` pierde la prop `pages`.
- Las migas salen de `ancestors`. El panel lateral usa los ancestros de su propia página.
- Menciones, enlaces, subpáginas y relaciones piden `lookup` en lote. Un resolutor junta los ids pedidos en una misma ventana de tiempo (un tick), los deduplica contra el almacén y manda una sola petición. Los resultados se guardan con su versión. Mientras llegan, se dibuja el texto del documento, sin parpadeo.
- Bloques sincronizados. Al renderizar la página abierta, el servidor extrae los `pageId` de sus nodos sincronizados, los lee en un solo `lookup-content` y los entrega junto a la página. Lo que se inserte después se pide con `lookup-content` en el momento de insertarlo.
- El selector de destino y las sugerencias «a mano» salen de lo que el árbol tiene cargado, los recientes y la búsqueda de servidor que ya existe.
- La papelera pagina con «Cargar más» sobre `pages/trash`.
- El inicio del espacio usa las raíces de `tree` y `recent`.

### Vivo

El canal de bloques ya avisa de cada transacción confirmada (`NOTIFY`, ADR 020 y 022). Se agrega una suscripción `subscribe-space-tree` por espacio expandido, y el servidor responde con tres mensajes, por analogía con ADR 026.

- **`tree-changes`.** Solo páginas que no son filas de una colección, con `id`, `parentId`, `previousParentId`, `title`, `icon`, `order`, `lifecycle`, `hasChildren` y `version`, filtradas por lo que cada suscriptor puede leer. El cliente aplica cada entrada. Si el padre está cargado, inserta, mueve o quita. Si no lo está, solo corrige el `hasChildren` de la fila del padre que sí tenga cargada.
- **`tree-resync`.** Cuando hay demasiados cambios en una transacción, o un cambio de acceso deja dudas. El cliente relee los padres cargados con `tree`.
- **`tree-revoked`.** Se perdió el acceso a un espacio. El menú lo cierra y borra su copia local (la regla de ADR 029 para permisos).

Crear filas de una colección o editar el contenido de una página no genera `tree-changes`. Renombrar, mover, reordenar, ícono, papelera y restauración sí.

### Agentes (agent first)

`list_pages` ya recorre por nivel con ventana y cursor, y se apoya en `listChildren`. No carga el espacio. Se verifica en la implementación que ningún otro tool lo haga (`search`, `fetch`, `list_trash`, `move_page` y `create_page` se revisan una por una) y que `list_trash` use la misma paginación nueva. Los agentes ganan la misma ventaja que el portal sin trabajo extra: el contrato nuevo y el MCP comparten repositorio y permisos. `list_pages` conserva su `childCount` por entrada, que es más informativo para un agente que el booleano del menú. La descripción del tool sigue diciendo cómo recorrer el árbol, porque la guía vive en el MCP y no en el repositorio.

## Consequences

- Positivas:
  - El documento de la página abierta deja de depender del tamaño del espacio. El costo del servidor tampoco depende de él: cada petición toca una rama.
  - El portal y el MCP comparten un solo camino de lectura del árbol, con los mismos permisos.
  - Los títulos de menciones, enlaces y relaciones dejan de depender de que la página citada esté en una lista cargada. Funcionan igual con cualquier tamaño y entre espacios.
  - El menú se corrige solo cuando otra persona crea, mueve, renombra o borra, sin recargar.
- Negativas:
  - Expandir una rama por primera vez cuesta una petición. La caché local lo oculta en visitas siguientes, pero la primera sigue ahí.
  - El árbol es parcial. Todo lo que hoy asume «están todas las páginas» (selector de destino, sugerencias a mano, el inicio del espacio) debe repensarse y algunas funciones se vuelven búsquedas.
  - Una suscripción más por pestaña y un tipo de registro nuevo en la caché local.
  - Los bloques sincronizados ya no leen el contenido de otra página de memoria sin pedirlo. El servidor lo adelanta, pero un bloque sincronizado insertado en vivo lleva una espera.
  - `PagesWorkspace` y sus hijos cambian de contrato. Es un cambio ancho en el portal (más de una docena de archivos) aunque conceptualmente simple.

## Governance

- Una prueba de integración con un espacio sembrado de miles de páginas comprueba que abrir una página no pide la lista completa, que el documento queda bajo el tope y que cada petición del árbol cumple la meta. La medición de producción de este ADR se repite al cerrar la etapa.
- Una prueba de contrato recorre cada endpoint nuevo con un lector sin acceso a una rama y comprueba que la rama no aparece ni cuenta.
- Ningún componente nuevo recibe una lista de páginas con contenido. `PageSummary` con `content` solo existe para la página abierta y la del panel.
- Todo lo nuevo que el portal pueda hacer se revisa contra el MCP: si hay un camino de menú, hay un camino de `list_pages`.

## Decisiones confirmadas

1. **Conexión del menú.** Mismo endpoint y protocolo del canal en vivo (`/api/v1/blocks/live`) con un tipo de suscripción nuevo. Una conexión separada por pestaña es aceptable por ahora, porque compartirla reescribiría `block-sync.session.lib`. **Deuda anotada:** unificar el socket del menú y el del editor en uno por pestaña.
2. **Filas de colección fuera del menú**, como en Notion. Siguen alcanzables desde la colección, la búsqueda, las menciones y los enlaces.
3. **Más de 100 hermanos.** «Ver más» al final de la lista, en ventanas de 100.
4. **Índice de `recent`.** Si el plan de consulta no cumple los 100 ms, una migración chica con el índice `(spaceId, updatedAt)` sobre `Block`.
5. **Papelera en el menú.** Las páginas en la papelera no aparecen nunca en el árbol, salvo la página abierta que esté en la papelera, que se muestra por el camino abierto.

## Notes

- Author: El-Vitas (borrador de Claude)
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21 (implementación). Hecho y verificado en el navegador de producción con dos personas, sobre un espacio sembrado de 12.000 páginas (40 raíces, 800 en el segundo nivel, 8.000 en el tercero, una página con 1.020 hijos y el resto más abajo). **Mediciones.** Documento de la página abierta, de 17,95 MB a 0,37 MB (el espacio sembrado pesa menos que el de la medición de ADR 029, que daba 40 MB; la proporción es la misma). Primer dibujo (mediana de 5 a 7 corridas, Chrome sin caché): de 1.780 ms a 376 ms. Peticiones del árbol en el backend, mediana de tres corridas: raíces 20 ms, 100 hijos de una página con 1.020 hijos 13 a 27 ms, camino abierto 45 ms, 100 títulos en lote 16 ms, recientes 21 ms, papelera 14 ms, ancestros 20 ms. Abrir una página con 1.020 hijos en el menú, 280 ms de la pulsación al dibujo. Un cambio de otra persona llega al menú en 260 a 530 ms (renombrar, crear, enviar a la papelera, mover). **Desviaciones.** (1) El aviso vivo es `tree-changed` con los **ids de los padres** cuya lista cambió, y `tree-resync`; no lleva entradas ni existe `tree-revoked`. Si se pierde el acceso, la relectura de esa rama ya no trae nada. (2) El árbol vive en memoria del navegador; no se guarda en IndexedDB todavía, así que el primer dibujo del menú viene del servidor y no de la copia local. (3) Los nombres que una página necesita (menciones, subpáginas, relaciones, títulos de colecciones incrustadas y contenido de bloques sincronizados) se piden **en dos peticiones al abrirla**, en el servidor, y viajan con la página. Un nombre que aparece después (una mención recién insertada) usa la etiqueta que lleva el nodo hasta la próxima apertura; no hay un resolutor de cliente que pida ids sueltos. (4) El selector de destino de bloques y botones lista la cima del espacio mientras no se escribe, y la búsqueda del espacio cuando se escribe. (5) La papelera pagina de 50 en 50 con «Cargar más», y `list_trash` del MCP deja de leer la jerarquía de cada espacio. (6) No hizo falta la migración del índice `(spaceId, editedAt)`: `recent` tarda 21 ms. **Errores hallados.** Un identificador de transacción de mover o enviar a la papelera (`page-move:<id>:<id>`, 83 caracteres) superaba el máximo de 64 con el que se validaba el aviso del servidor, así que cada mover provocaba una relectura de todo el canal; ahora el aviso del servidor no impone el máximo del cliente. Y mover una página desde la cima de su espacio no avisaba de que la cima cambiaba: el aviso ahora lleva `previousParentId: null`. **Deuda.** (a) Buscar «Pagina» en 12.000 páginas (una palabra que está en todas) tarda 1,3 s en la búsqueda existente, que calcula ancestros de cada acierto antes de limitar; las búsquedas con palabras selectivas tardan de 7 a 190 ms. (b) `GET pages/move-destinations/:id` sigue listando todas las páginas legibles de todos los espacios (1,9 MB, 450 ms, solo al abrir el diálogo de mover) y `GET pages/assigned` lee todas las páginas con propiedades del espacio de trabajo. (c) `list_pages` del MCP tarda de 100 a 160 ms en la cima de este espacio porque cuenta los hijos legibles leyéndolos; el menú usa un camino más barato que el MCP podría adoptar. (d) Un solo socket por pestaña para menú y editor (deuda anotada en la decisión 1).
- Modified: 2026-10-22 (cuatro correcciones sobre la deuda anterior, medidas en el mismo espacio de 12.000 páginas). (1) **Búsqueda.** La sentencia ya no recorre los ancestros de todos los aciertos: ordena y limita primero una ventana de los mejores (8 veces las filas pedidas) y solo a esos les calcula ancestros. Para páginas, escoge las páginas de la ventana y después trae **todos** los aciertos de esas páginas (no solo los de la ventana), de modo que el permiso sigue siendo exacto: un acierto que la persona no puede leer no oculta otro que sí puede, y las filas ilegibles las descarta TypeScript como antes, pidiendo más ventana si hacen falta. Si la ventana deja pocos resultados y quedaron aciertos fuera, se ensancha según la tasa con que sobrevivieron (una sonda cuenta los aciertos). El orden de las páginas de igual rango pasa a desempatar por el mejor acierto de la página (para una página titulada coincide con su id) y no por el id de la página, porque solo así la ventana es un prefijo consistente. La unión con `Space` se cambió por una lista de espacios legibles resuelta una vez, que deja al planificador repartir el recorrido en varios procesos. «Pagina» (en todas las páginas): de 560 a 630 ms hoy medidos (1,3 s en la medición anterior) a 120 ms; «Pag» de 380 a 52 ms; «Texto» de 420 a 73 ms; palabras selectivas de 17 a 27 ms. (2) **`list_pages` del MCP.** Usa el mismo camino barato del menú (`hasChildren`, sin leer los hijos para contarlos) y respeta el alcance del token. La salida cambia: `childCount` pasa a `hasChildren` (booleano), en `list_pages` y en los hijos de `fetch`. De 100 a 158 ms a 32 a 55 ms en la cima y de 85 a 52 a 69 ms bajo la página de 1.020 hijos. (3) **Destinos de mover.** `GET pages/move-destinations/:id?query=` ya no lista todo: sin texto, la cima de cada espacio (20 por espacio); con texto, la búsqueda de las páginas, sin la propia página ni nada de su rama. Devuelve también el título del padre actual. De 1,9 MB y 450 ms a 7 KB y 40 ms (la cima) y 130 ms (una búsqueda que acierta en todas). El diálogo de mover del panel y el de mover varias páginas del menú piden al servidor lo que se escribe, con pausa. (4) **Pérdida de acceso.** Un cambio de permisos en una página de la cima del espacio no llegaba a quien la perdía, porque la cima no tiene padre que leer y la página ya no era legible: ahora un cambio de acceso se avisa a todos los seguidores del espacio (solo dice que la cima cambió, no nombra la página). Y quien deja de poder leer el espacio entero recibe `tree-resync` en el siguiente aviso del espacio y deja de ser seguido; ese siguiente aviso es el límite: no hay hoy una operación de la interfaz que quite a alguien de un espacio y no se emite un aviso propio. **Deuda nueva.** Un cambio ocurrido entre el dibujo del servidor y la primera suscripción del socket no llega: la primera suscripción no relee lo ya cargado.
