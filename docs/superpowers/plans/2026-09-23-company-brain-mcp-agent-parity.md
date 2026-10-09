# MCP · Que el agente haga lo que hace una persona

> Estado: aprobado. F0, F1 y F2 hechos; F3 pendiente.
>
> Ejecuta el nivel 3 de la escalera de `docs/architecture/adr/008-adopt-single-page-primitive.md`
> y el contrato de `docs/architecture/mcp-content-authoring.md`. Cierra `AG-01`,
> `AG-02` y `AG-03` de `docs/scope/verification/08-agentes-y-experiencia.md`.

## Qué se busca

Un agente conectado con un token trabaja en Company Brain como una persona con
los permisos de ese token:

- encuentra un bloque concreto, sabe en qué página y sección vive, y llega a él;
- recibe una URL de página o de bloque copiada del portal y la abre;
- escribe en una página sin pisar a quien la tiene abierta;
- opera un tablero: crea tareas, cambia sus propiedades, las mueve de estado,
  crea vistas y cambia columnas.

Hoy tiene tres herramientas de lectura (`list_spaces`, `read_page`,
`search_company_brain`). Ve cada página como un bulto, la búsqueda contesta
«está en esta página» y no «está en este bloque», y no puede escribir nada.

## Lo que se encontró al revisar el código

Estos cuatro hallazgos deciden el diseño.

1. **La edición colaborativa no sincroniza nada.** Comprobado en el navegador
   el 2026-09-23: con la misma página abierta en dos pestañas, lo escrito en una
   no llega a la otra aunque las dos dicen «Edición colaborativa conectada», y
   `CollaborationSnapshot` está vacía. En Hocuspocus 4, `handleConnection` ya no
   escucha el socket: quien lo conecta reenvía cada mensaje con `handleMessage`
   y el cierre con `handleClose`, como hace el `Server.ts` de la propia librería.
   `collaboration.transport.ts` solo llama a `handleConnection`, así que el
   servidor nunca recibe un mensaje. Lo que hoy guarda es el autoguardado, sobre
   `Page.content`.

   **Arreglarlo destapa el problema siguiente.** El editor siembra el documento
   colaborativo desde `Page.content` solo cuando está vacío
   (`pages.collaboration.session.lib.ts`). En cuanto Yjs guarde de verdad, una
   escritura del servidor directo en `Page.content`, como la de
   `addBlocksToPageAction`, no aparecerá en el editor y el siguiente autoguardado
   la borrará. El ADR 008 advierte este caso: «if a Yjs session's state can ever
   diverge from `Page.content` without an autosave reconciling it, the canonical
   record is wrong». Por eso el transporte y el escritor del servidor se
   arreglan juntos, nunca el primero solo.
2. **El autoguardado manda las propiedades enteras desde la copia local.**
   `pages.editor.tsx` envía `propertyValues` completo con cada guardado. Si el
   agente mueve una tarea a «Hecho» mientras alguien la tiene abierta, el
   próximo autoguardado la devuelve a su estado anterior. Hoy pasa igual entre
   dos personas.
3. **El esquema de ProseMirror vive en el portal** (`pages.editor.schema.ts`,
   949 líneas, con el dibujo en DOM mezclado). Para escribir en Yjs desde el
   servidor, el backend necesita el esquema.
4. **La base de bloques ya está.** El editor da un UUID a cada bloque, el enlace
   a un bloque ya existe en el menú del bloque (`…/pages/<página>#<bloque>`), y
   hay un exportador a Markdown en `packages/shared`, aunque solo cubre diez
   tipos de bloque. El `id` es opcional en `pageContentSchema`, así que puede
   haber contenido sin ids.

## Decisiones de diseño

- **El MCP es un adaptador.** Cada herramienta llama a los mismos servicios que
  usa el portal, con las mismas validaciones. Nunca consulta Prisma directo.
- **La referencia es `(página, bloque)`.** Todo bloque tiene id, y toda
  respuesta nombra la página y el bloque.
- **Se lee Markdown con anclas; se escriben bloques estructurados.** El modelo
  lee Markdown mejor y más barato que el JSON del editor. Escribir va en bloques
  tipados, como fija el contrato de autoría, y el texto dentro de cada bloque
  admite marcas en línea (negrita, cursiva, código, enlace, mención).
- **Toda escritura de contenido pasa por el documento colaborativo.** Un escritor
  del servidor abre una conexión directa de Hocuspocus, aplica el cambio en una
  sola transacción de Yjs y escribe `Page.content` y su `PageVersion` con el
  resultado. Quien tenga la página abierta lo ve en vivo, y la lectura
  siguiente del agente ya lo trae. `addBlocksToPageAction` pasa a usar el mismo
  escritor.
- **Las propiedades se guardan por clave.** El servidor mezcla solo las claves
  que llegaron, de forma atómica, y el autoguardado deja de mandar las que no
  cambiaron.
- **Todo lo que el agente referencia pasa por las reglas del token.** Una
  mención, una subpágina, un bloque sincronizado o una colección incrustada que
  apunta a una página que el token no alcanza se contesta como inexistente. El
  ADR 008 exige esto mismo para los títulos de las menciones.
- **Cada escritura queda registrada** con la persona dueña, el token y el bloque
  que tocó. Sin registro no hay escritura.
- **Paridad con una persona, no más.** Una página bloqueada no se escribe. Lo
  que el documento `14` decida sobre páginas verificadas aplicará igual al
  agente, sin un camino aparte.

## Enlaces a páginas y bloques

- **Bloque:** ya existe «Copiar enlace» en el menú del bloque.
- **Página:** falta. Se agrega «Copiar enlace» en el menú de la página y en el
  menú de la página en el árbol lateral.
- **Forma:** `https://<portal>/<idioma>/spaces/<espacio>/pages/<página>#<bloque>`.
  El agente acepta la URL completa, solo la ruta, o los ids sueltos. El idioma
  y el dominio no cambian el resultado.
- Un enlace a un bloque que ya no existe contesta «el bloque no existe; esta es
  la página», no un error mudo (`AG-03`).

## Herramientas

Cada herramienta exige un permiso del token, evaluado en la página donde actúa
con la regla más cercana.

### Leer (`pages:read`, `collections:read`)

| Herramienta | Entrada | Devuelve |
|---|---|---|
| `search` | texto, filtros (espacio, página raíz, tipo), cursor | bloques: fragmento, id del bloque, página, ruta de páginas y encabezado bajo el que está |
| `fetch` | URL, o id de página, o id de bloque; cursor | **página**: título, ruta, propiedades si es fila, Markdown con el id de cada bloque, subpáginas, retroenlaces y comentarios. **Bloque**: el bloque, su sección y la página a la que pertenece |
| `list_pages` | espacio o página padre, cursor | el árbol de un nivel, con cuántos hijos tiene cada página |
| `list_spaces` | — | ya existe |
| `get_collection` | colección | columnas con sus tipos y opciones, y vistas con su configuración |
| `query_collection` | colección, una vista o un filtro y orden propios, cursor | filas con sus propiedades tipadas |

El Markdown de `fetch` cubre **todos** los tipos de bloque del esquema, no solo
los diez de hoy. Un tipo que no se sabe escribir sale como marcador con su id y
su tipo, nunca desaparece.

### Escribir en páginas (`pages:write`)

| Herramienta | Qué hace |
|---|---|
| `create_page` | crea una página en un espacio o bajo otra página, con bloques iniciales opcionales |
| `insert_blocks` | agrega bloques antes o después de un bloque, dentro de uno (hijos), o al principio o final de la página |
| `update_block` | reemplaza un bloque y conserva su id |
| `update_table_cell` | cambia una celda por tabla, fila y columna (contrato de autoría) |
| `move_blocks` | mueve bloques dentro de la página o a otra |
| `delete_blocks` | borra bloques por id |
| `update_page` | título e ícono |
| `move_page` / `duplicate_page` | igual que en el portal, con la misma advertencia de acceso |
| `comment_on_block` | deja un comentario en un bloque |

No existe `rewrite_page`. Cada escritura devuelve el estado que quedó guardado,
para que el agente no tenga que volver a leer.

### Operar colecciones (`collections:write`)

| Herramienta | Qué hace |
|---|---|
| `create_row` | crea una fila (una página bajo la colección) con título, propiedades y bloques opcionales |
| `update_row_properties` | cambia una o varias propiedades. **Mover una tarea de estado es esto** |

Los valores se validan contra el esquema de la colección: una opción que no
existe se rechaza con las opciones válidas, en vez de guardarse a medias.

### Configurar colecciones (`collections:configure`)

| Herramienta | Qué hace |
|---|---|
| `update_collection_schema` | agrega, renombra o quita columnas y opciones (renombrar una opción reescribe las filas, como hoy) |
| `create_view` / `update_view` / `delete_view` | tabla, tablero, lista, galería, calendario o gráfico, con filtros, orden, agrupación y columnas visibles |

### Papelera (`pages:trash`)

`trash_page` y `restore_page`, con la misma vista previa del portal.

### Fuera, a propósito

Borrar para siempre, vaciar la papelera y administrar miembros y espacios. Son
actos de administración, y ningún permiso del token los cubre. Verificar,
bloquear y asignar responsable empezaron aquí y entraron en F3, con su propio
permiso (`pages:manage`).

## Datos nuevos

- **`PageBlock`**, la proyección del nivel 3: id del bloque, página, espacio,
  bloque padre, orden, tipo, texto, ruta de encabezados y versión de la página.
  La rellena el mismo proyector de la búsqueda, desde los eventos `PAGE_*`.
- **La búsqueda indexa bloques.** Cada bloque con texto es una fila de
  `SearchDocument` que guarda su página. El filtro del token pasa a mirar la
  página del bloque, así que las exclusiones siguen valiendo sin reescribirse.
- **Backfill de ids.** Una migración asigna id a todo bloque que no lo tenga, en
  `Page.content` y en el documento Yjs guardado, usando el mismo escritor. Desde
  ahí, `id` pasa a ser obligatorio en el esquema.
- **Registro de acciones del agente.** Una tabla con token, persona, herramienta,
  página, bloques, resultado y hora.

## Seguridad

Cada caso lleva su prueba de integración, como las 32 de hoy, y se comprueba que
la prueba falla cuando se rompe el filtro.

- Un bloque de una página excluida no sale en `search` ni se abre con `fetch`,
  aunque se tenga su id o su URL.
- Una mención, subpágina, bloque sincronizado o colección incrustada hacia una
  página inaccesible no revela título ni contenido.
- Una URL o un id inaccesible contesta lo mismo que uno inexistente.
- No se escribe en una página sin `pages:write` en ella, ni se crea una fila en
  una colección con solo `collections:read`.
- `move_page` y `move_blocks` exigen escritura en el origen y en el destino.
- Una página bloqueada rechaza toda escritura.
- Los valores de propiedades se validan contra el esquema. Los bloques, contra
  `pageContentSchema`. Lo inválido se rechaza entero, nunca se guarda a medias.
- Hay topes por llamada (bloques, texto y filas), además del límite de
  frecuencia que ya existe.
- Si la persona dueña pierde el acceso, el token lo pierde en la llamada
  siguiente.

## Fases

Cada fase se cierra probándola con Claude conectado de verdad, con sus reglas de
negocio en `fea-tok` y `fea-mcp`, y con `check` y las pruebas en cero.

**F0 · Cimientos de escritura.** El transporte de la colaboración reenviando
mensajes y cierres a Hocuspocus, el esquema de ProseMirror en `packages/shared`
(estructura sin DOM; el portal le agrega el dibujo), el escritor por Yjs,
`addBlocksToPageAction` sobre el escritor, y propiedades por clave. Arregla los
hallazgos 1 y 2 también para las personas.

> **Hecho el 2026-09-27**, verificado en el navegador. Además de lo previsto
> aparecieron y quedaron resueltos:
>
> - `UUID_PATTERN` solo aceptaba UUID v1 a v5, y los ids de página son v7: toda
>   conexión en vivo se rechazaba con `permission-denied`.
> - Cada navegador sembraba el documento al encontrarlo vacío; dos a la vez lo
>   duplicaban. Ahora siembra el servidor en `onLoadDocument`.
> - Con varias pestañas abiertas, cada una guardaba el contenido y cortaba su
>   propia versión. Ahora guarda el servidor, en `onStoreDocument`, y no corta
>   versión si nada cambió.
> - Una página bloqueada se podía escribir por Yjs: el bloqueo solo lo respetaba
>   el editor.
> - `updateProperties` reescribía el contenido y leía fuera de la transacción.
>   Ahora bloquea la fila y toca solo las propiedades.
> - El autoguardado quedaba marcado como pendiente para siempre en desarrollo
>   (el doble montaje de React dejaba `isMountedRef` en falso) y avisaba de
>   «cambios sin guardar» al salir.
>
> Se retiró `PATCH /pages/:id`, la única vía que escribía el contenido sin pasar
> por el documento en vivo. El contenido se escribe con `PUT …/content` y
> `POST …/blocks`; el título con `PATCH …/title`; las propiedades con
> `PATCH …/properties`.

**F1 · Leer y ubicarse.** Ids obligatorios y backfill, `PageBlock`, búsqueda por
bloque, Markdown de todos los bloques, `fetch`, `search`, `list_pages`, URLs, y
«Copiar enlace» de página. Cierra `AG-01` y `AG-03`.

> **Hecho el 2026-09-28**, probado con un cliente MCP real contra el servidor de
> desarrollo y en el navegador. Quedó así:
>
> - Las herramientas son `search`, `fetch`, `list_spaces` y `list_pages`. Las de
>   antes, `read_page` y `search_company_brain`, se retiraron.
> - `fetch` abre un enlace del portal (con o sin idioma), un id de página o un id
>   de bloque. Una página llega en Markdown con el id de cada bloque, sus
>   propiedades si es una fila, sus comentarios, lo que cuelga de ella y quién la
>   enlaza; una página larga llega de a tramos, con un cursor. Un bloque llega con
>   su sección y su página.
> - `search` devuelve bloques con su página, su sección y su enlace, más las
>   páginas que coinciden por título, y se puede filtrar por espacio, por página
>   raíz y por tipo de bloque. Tolera errores de tipeo.
> - «Copiar enlace» está en el encabezado de la página, para todos, y en su menú
>   del árbol.
>
> Se apartó del plan en tres puntos:
>
> - **Los bloques no van a `SearchDocument`.** Un id de bloque solo es único
>   dentro de su página, porque duplicar una página o mover bloques conserva los
>   ids, y `SearchDocument` exige un id de origen único en toda la base. `PageBlock`
>   tiene la clave (página, bloque) y su propio índice de texto. La búsqueda del
>   portal sigue siendo por página.
> - **El relleno no es una migración.** Un proceso aparte pisaría el documento en
>   vivo de quien tenga la página abierta. Es un mantenimiento que corre dentro del
>   backend quien administra el espacio de trabajo (`POST /maintenance/pages/blocks`):
>   da ids a las páginas que no los tienen y proyecta todas. Se puede correr las
>   veces que haga falta.
> - **`id` sigue siendo opcional en el esquema.** El servidor lo asigna en toda
>   escritura (crear, sembrar el documento en vivo y escribir en él), así que ya no
>   entra contenido sin ids. Volverlo obligatorio al leer rompería contenido
>   guardado que el relleno todavía no tocó, sin ganar nada.
>
> Queda anotado para después: una propiedad de persona se entrega como el id de la
> persona, no su nombre; y la búsqueda y los retroenlaces leen la misma bandeja de
> eventos, así que con los dos proyectores corriendo uno le puede quitar eventos al
> otro.

**F2 · Colecciones.** `get_collection`, `query_collection`, `create_row`,
`update_row_properties` y la configuración de columnas y vistas.

> **Hecho.** Se apartó del plan en cuatro puntos:
>
> - El registro de acciones (`AgentAction`) llegó en F2 y no en F3, porque F2 es la
>   primera fase que escribe. Anota lo hecho, lo rechazado y lo fallido.
> - `update_row_properties` quedó como `update_row`, que cambia también el título.
>   Mover una tarea de columna es cambiar su estado ahí.
> - La configuración quedó en cuatro herramientas: `update_collection_columns`,
>   `create_view`, `update_view` y `delete_view`.
> - Para que el agente siga las mismas reglas que el portal, pasaron a `shared` la
>   clave de una columna nueva (`buildPagePropertyKey`) y dos reglas de vistas
>   (`removeSchemaView` y `makeSchemaViewDefault`).
>
> Lo probaron agentes haiku con preguntas naturales y solo el MCP. Hicieron falta
> dos instrucciones más: anotar las tareas del equipo en Company Brain y no en la
> lista propia del agente, y que un tablero puede tener su nombre en otro idioma.
>
> El título y las propiedades de una fila se guardan en una sola escritura
> (`updateProperties` acepta el título), así que quedan las dos cosas o ninguna.

**F3 · Escribir en páginas.** Las herramientas de `pages:write` y `pages:trash`.
Cierra `AG-02`.

> **Hecho el 2026-09-30**, probado con pruebas de integración contra la base real,
> con agentes haiku que reciben pedidos vagos y solo el MCP, y en el navegador.
> Quedó así:
>
> - **Bloques.** `create_page`, `insert_blocks`, `update_block`, `move_blocks` y
>   `delete_blocks` escriben todo el menú de bloques: texto, títulos, listas,
>   tareas, citas, destacados, código, diagramas, fórmulas, tablas, desplegables,
>   índice, subpáginas, colecciones incrustadas, botones, columnas, tarjetas de
>   enlace, videos incrustados y bloques sincronizados. Todo pasa por el documento
>   en vivo, así que quien tiene la página abierta lo ve al momento.
> - **Formato.** El texto lleva negrita, cursiva, código, tachado, subrayado,
>   color y resaltado, y `update_block` pinta un bloque entero. `fetch` devuelve
>   lo mismo que se escribe: el subrayado y los colores en HTML en línea, y los
>   colores de un bloque en su ancla.
> - **Tablas.** `update_table` cambia celdas, agrega filas y las quita, sin tocar
>   la identidad ni los comentarios de lo demás.
> - **Comentarios.** `comment_on_block` comenta un bloque o unas palabras suyas,
>   firmado por la persona dueña del token; `delete_comment` lo quita. `fetch`
>   muestra cada comentario con su id.
> - **Páginas enteras.** `update_page` (título, emoji, quitar la portada,
>   bloquear, verificar y dueño), `move_page`, `duplicate_page`, `trash_page` y
>   `restore_page`.
> - **Dibujos revisados en el servidor.** Antes de guardar, el backend lee cada
>   diagrama con el mismo Mermaid del portal (en un worker aparte), cada fórmula
>   con KaTeX y cada ícono contra los paquetes que dibuja el portal, y revisa que
>   un diagrama de arquitectura agrupe bien. Si algo falla, no se escribe nada y
>   el agente recibe el error con el número de bloque.
>
> Se apartó del plan en cinco puntos:
>
> - `update_table_cell` quedó como `update_table`, que además agrega y quita filas.
> - **Verificar, bloquear y asignar dueño entraron**, en `update_page`, aunque este
>   plan los dejaba fuera como actos de confianza. Por eso piden un permiso propio
>   del token, `pages:manage`, aparte de escribir: lo trae el nivel completo y no
>   el de lectura y escritura, y solo lo da quien puede escribir.
> - Mandar a la papelera, mover y copiar con hijas piden el permiso en todo el
>   árbol: si una página de abajo tiene su propia regla que no lo permite, no se
>   hace nada y se nombra esa página.
> - El registro de acciones abre la acción como pendiente antes de escribir y la
>   cierra después, así no queda una escritura sin anotar.
> - Lo que el agente no puede: subir imágenes, videos, audios y archivos, ni
>   poner una portada nueva, por el riesgo de que el servidor pida direcciones que
>   le dé el agente. Los íconos de página son solo emojis; los símbolos del
>   portal quedan para después.
>
> En el camino se arreglaron en el portal: el texto de varias líneas que se
> cortaba dentro de las cajas de un diagrama, un marco de diagrama que se salía de
> la pantalla (ahora acotado, con alto ajustable que se guarda y zoom de quien
> mira), un diagrama o una fórmula sincronizados que se veían como código, y el
> «no existe» de la primera visita a una página creada fuera del portal.

F0 va primero porque F2 y F3 escriben, y sin F0 esas escrituras se pierden.

## Por decidir

1. **Formato de escritura.** Bloques estructurados con marcas en línea dentro
   del texto, como propone este plan, o también Markdown completo como atajo.
   El contrato vigente pide lo primero.
2. **Propiedades en vivo.** Con la mezcla por clave, nadie pisa a nadie. Que el
   cambio del agente aparezca en vivo en una tarea abierta exige llevar las
   propiedades al documento Yjs. Este plan lo deja para después de F3.