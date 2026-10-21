# 027: Plantillas de colección

**Status:** Accepted
**Date:** 2026-10-21
**Approved by:** El-Vitas, 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`, `025-views-as-reducer-queries.md`
**Precedes:** la etapa 9 (plantillas de base de datos) del plan `2026-10-20-paridad-con-notion.md`.

## Context

Una plantilla es una página con contenido y valores de propiedades que se copia al crear una fila. La etapa 9 pide crearla, editarla, renombrarla, borrarla, marcar una por defecto, crear filas desde ella (tabla, tablero, calendario, botón y MCP) y resolver `@today` y `@me` al crear.

La decisión que condiciona todo lo demás es dónde vive la plantilla, porque debe poder editarse como cualquier página y no debe aparecer jamás como fila, conteo, resultado de búsqueda ni elemento de un listado MCP.

Lo que el código impone hoy:

- **El editor, las versiones, el título, el ícono y los permisos trabajan sobre bloques `type = 'page'`.** `BLOCK_CONTENT_SCHEMAS`, el lector de contenido, la búsqueda (página más cercana de un acierto) y los candados buscan «la página más cercana» de un bloque. Un tipo nuevo para la raíz de la plantilla rompería todo eso.
- **Un bloque vivo debe estar en `children` de su padre** (`checkPlacedUnderParent`). Una plantilla hija de la colección aparece en `children` junto a las filas.
- **Las filas se reconocen por `parentId = colección AND type = 'page'`.** No hay otra marca. Lo hacen `page-query.repository` (3 puntos), `page-changes.repository` (2), `page-schema.repository` (conteo de filas y `readPagesUnder`), `block.live.collection.domain` y los listados de `PageBlockReader` (`readChildPageBlocks`, `readPagesUnder`, `readSpacePageBlocks`), de donde salen el árbol lateral, los resultados de MCP y la papelera.
- **Los esquemas de página son estrictos** (`properties` solo admite `title` y `values`).
- **El bloque botón ya tiene `deed: 'row'`** (agrega una fila). La etapa 9 solo le suma una plantilla elegida.
- **`@today` y `@me` ya se resuelven** en filtros (`readPageRelativeDate`, `PAGE_FILTER_ME`, etapa 8).

## Alternatives Considered

### Dónde vive la plantilla

- **Tabla propia (`PageTemplate`) con contenido en JSON.**
  - PRO: queda fuera de toda consulta de bloques sin tocarlas.
  - CON: rompe ADR 021 (todo es un bloque). El contenido deja de ser bloques, así que no hay editor, ni versiones, ni permisos heredados, ni duplicado con ids nuevos. Hay que escribir de nuevo todo eso.
- **Bloque nuevo de tipo `template` como raíz.**
  - PRO: las consultas por `type = 'page'` lo excluyen solas.
  - CON: pierde «página más cercana», así que el contenido de la plantilla no se puede buscar, bloquear ni versionar, y el editor no la abre. Equivale al caso anterior con más piezas.
- **Contenedor `template_list` (bloque que no es página) hijo de la colección; las plantillas son páginas hijas del contenedor.**
  - PRO: las consultas de filas no las ven, y el editor y todo lo demás funcionan porque son páginas.
  - CON: el contenedor es un hijo de la colección que no es página, así que el contenido de la colección lo lee como bloque (hay que excluir ese tipo del documento de la colección). Las plantillas quedan huérfanas en `readSpacePageBlocks` (árbol lateral, papelera, búsqueda, MCP), un fallo distinto en cada lector y sin una marca que se pueda consultar.
- **Página hija de la colección con una marca `properties.template` (elegida).**
  - PRO: es una página completa: editor, versiones, permisos heredados, duplicado con ids nuevos y papelera funcionan sin cambios. Una sola marca que se consulta en SQL y en TypeScript.
  - CON: queda en `children` de la colección y en toda consulta de `parentId = colección AND type = 'page'`, así que cada una de las listadas arriba debe excluirla. Es el riesgo principal.

### Cómo se evita la fuga

- **Parchear cada consulta cuando se encuentra.**
  - CON: la próxima consulta nueva la filtra de nuevo, y nadie lo nota.
- **Un predicado central y una prueba que recorre todos los caminos (elegida).**
  - `isTemplatePage` en `packages/shared` y su fragmento SQL en una sola constante. Todo lector de filas y todo listado de páginas de `PageBlockReader` lo aplica. Una prueba de integración crea una plantilla con una fila vecina y afirma que no aparece en: consulta de vista, conteos y agregados, avisos de cambios, árbol lateral, búsqueda (título y contenido), `list_pages`, `get_collection`, `query_collection`, papelera y exportación. Esa prueba es la barrera contra la fuga futura. La plantilla se ve solo por el listado propio de plantillas y por id.

### Plantilla por defecto

- **Marca `isDefault` en cada plantilla.**
  - CON: dos escrituras para cambiarla (quitar y poner), y dos plantillas por defecto si fallan o compiten.
- **Puntero `defaultTemplateId` en la colección (elegida).**
  - PRO: un solo campo, una sola escritura atómica, y siempre hay cero o una.
  - CON: si se borra la plantilla apuntada, el puntero debe limpiarse en la misma transacción.

### Por colección o por vista

- **Por vista.**
  - PRO: calendario con una plantilla y tablero con otra.
  - CON: es configuración de vista, con el cuidado de edición concurrente de ADR 025, y el agente no tiene vista en `create_row`.
- **Solo por colección (elegida).** El caso pedido (default al crear desde cualquier vista) lo cubre. Una plantilla distinta por vista se puede agregar después como un campo opcional de la vista, sin cambiar este modelo.

### Variables

- **Lenguaje de expresiones.** CON: es la etapa 10 (fórmulas).
- **Solo `@today` y `@me` (elegida).** Se guardan como marcador de texto en una propiedad de fecha o de persona de la plantilla, y se resuelven al crear con las mismas funciones de la etapa 8. La fila resultante nunca los contiene.

## Decision

1. **Una plantilla es una página hija de la colección** con `properties.template`, un objeto `{ variables }`. Se agrega al esquema de página como campo opcional. Las palabras `@today` y `@me` no van dentro de los valores de la plantilla (ahí la validación de columnas las rechazaría) sino en `variables`, que dice qué columna se llena con qué palabra; la columna sale de `values` y la palabra se resuelve al crear la fila. `@today` solo cabe en una columna de fecha y `@me` en una de persona.
2. **La colección guarda `properties.defaultTemplateId`** (opcional). El servidor lo limpia al borrar o al sacar la marca de la plantilla apuntada.
3. **Ningún lector de filas ni de páginas devuelve una plantilla.** Se excluye con el predicado central, y la prueba de fuga de arriba la cubre.
4. **Crear una fila desde una plantilla** copia contenido y valores con ids nuevos reutilizando la planificación del duplicado (`planCopies`), resuelve `@today` y `@me` para quien crea, y escribe todo en una sola transacción. Sin plantilla explícita, `create` en una colección con `defaultTemplateId` usa la de por defecto. Una fila creada con contenido o valores propios los mezcla sobre la plantilla (lo dado gana).
5. **Operaciones de plantilla** (crear, renombrar, editar valores y variables, borrar, marcar por defecto) tienen su propia ruta bajo la colección (`/pages/:colección/templates`); el contenido se edita con el editor de página, porque la plantilla es una página. Exigen poder editar la colección. Borrar una plantilla la manda a la papelera con plazo de purga (sin pasar por el listado de la papelera) y limpia el puntero si era la de por defecto.
6. **Los valores iniciales de las columnas** viajan aparte en la creación (`defaultValues`) para quedar bajo la plantilla: dado explícito, luego plantilla y variables, luego valor inicial de la columna.
7. **El botón** suma `templateId` opcional a `deed: 'row'`; sin él se usa la plantilla por defecto.
8. **MCP:** `list_templates`, `save_template` (crea o actualiza, y puede marcarla por defecto), `delete_template`, y `create_row` con `template` (nombre o id; null para una fila en blanco) y con la de por defecto cuando no se da. Las descripciones lo explican.
9. **Avisos de cambios y duplicado:** el aviso en vivo de una colección ignora los cambios de sus plantillas, y duplicar una colección con sus páginas copia las plantillas con su marca y reasigna la plantilla por defecto.
10. **No hay migración.** La marca y el puntero viven en `properties` (JSON).

## Consequences

- **Más de un punto toca consultas de filas.** Es el costo de que la plantilla sea una página completa. La prueba de fuga lo vuelve visible y la regla de negocio lo declara.
- **Una plantilla ocupa un lugar en `children`.** No afecta el orden de las filas porque las vistas ordenan por reductores (ADR 025). Quien lea `children` de una colección sin pasar por el lector debe filtrar.
- **Los permisos de la plantilla son los de la colección** (se heredan). Quien no puede editar la colección no cambia sus plantillas, y quien solo la lee ve la lista de plantillas y las usa solo si puede crear filas.
- **Plantilla por vista queda abierta.** Es un campo más de la vista si el uso lo pide.
- **Hay que decidir** si una fila hecha con valores propios y plantilla por defecto mezcla (propuesto) o los valores propios reemplazan toda la plantilla.
