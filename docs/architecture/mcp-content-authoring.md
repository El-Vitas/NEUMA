# MCP Content Authoring Contract

> Estado: propuesta futura. Este documento define la forma en que un MCP deberá
> crear y modificar contenido cuando se implemente. No agrega herramientas MCP
> en la implementación actual.

## Objetivo

Un agente debe poder trabajar con páginas usando estructuras semánticas, no
imitando estructuras visuales con HTML, Markdown frágil o espacios.

El contrato canónico de contenido sigue siendo el documento JSON compatible con
ProseMirror. El MCP será un adaptador sobre los casos de uso de páginas y usará
las mismas validaciones, permisos, versionado y eventos que el portal.

## Regla De Representación

Cada intención debe usar el bloque que corresponde a su semántica:

| Intención | Representación | Regla |
| --- | --- | --- |
| Datos en filas y columnas | Tabla nativa | Debe persistir como `table`, con filas, celdas y encabezados estructurados |
| Diagramas ASCII, árboles, logs o comandos | Bloque monoespaciado | Debe persistir como bloque preformateado o de código, preservando espacios y saltos de línea |
| Código ejecutable | Bloque de código | Debe incluir lenguaje cuando se conozca |
| Nodos y relaciones visuales | Diagrama estructurado | Será una capacidad futura; no se debe simular como tabla |
| Texto normal | Párrafos, títulos y listas | No debe contener estructuras ocultas hechas con espacios |

Una tabla escrita con caracteres `|`, guiones o espacios no es una tabla nativa.
Puede ser útil como texto monoespaciado, pero no debe presentarse como datos
tabulares si el agente necesita ordenar, editar o consultar sus celdas.

## Operaciones Futuras

Las herramientas deberán ser pequeñas, explícitas y revisables:

- `create_page`: crea una página y puede recibir bloques iniciales.
- `append_block`: agrega un bloque al final o bajo un bloque padre.
- `insert_table`: crea una tabla con columnas, encabezados y filas estructuradas.
- `update_table_cell`: cambia una celda identificada por tabla, fila y columna.
- `insert_code_block`: agrega código o texto monoespaciado preservando formato.
- `insert_diagram`: agrega un diagrama estructurado cuando exista ese bloque.
- `read_page_blocks`: devuelve los bloques estructurados de una página con sus ids y orden.

No se debe comenzar con una operación genérica como `rewrite_page` o
`replace_page_content`. Las operaciones acotadas reducen el riesgo de que un
agente destruya contenido que no pretendía modificar.

## Forma De Trabajo Del Agente

El agente debe:

1. Leer la página y obtener los ids de los bloques relevantes.
2. Elegir el tipo de bloque según la intención, no según cómo se ve en pantalla.
3. Usar una operación específica para crear o modificar ese bloque.
4. Recibir el estado estructurado resultante en la respuesta de escritura cuando
   sea posible.
5. Volver a leer la página solo para confirmar el estado, no para reconstruirlo
   mediante texto plano.

Ejemplo conceptual:

```json
{
  "type": "table",
  "header": ["Servicio", "Estado", "Latencia"],
  "rows": [
    ["Portal", "Operativo", "120 ms"],
    ["Backend", "Operativo", "340 ms"]
  ]
}
```

El ejemplo anterior expresa una tabla. No debe convertirse en una cadena con
alineación manual para intentar producir el mismo resultado.

## Seguridad Y Consistencia

- Cada herramienta debe resolver la identidad del principal y validar acceso al
  espacio antes de leer o escribir.
- Las escrituras deben pasar por los mismos servicios que usa el portal.
- El MCP no debe consultar Prisma directamente.
- Las respuestas de escritura deben incluir el estado persistido o su versión
  para que el agente no dependa de esperar a una proyección eventual.
- `update_table_cell` debe fallar de forma explícita si la tabla, fila o columna
  no existe.
- Los bloques desconocidos o documentos incompatibles deben rechazarse, no
  degradarse silenciosamente a texto plano.

## Criterios De Aceptación

La futura implementación cumple este contrato cuando:

- Un agente crea una tabla que la UI reconoce como tabla nativa.
- Un agente modifica una celda sin reemplazar el resto de la página.
- Un agente crea un diagrama monoespaciado sin perder espacios ni saltos de línea.
- `read_page_blocks` devuelve tipos, ids, orden y relaciones padre-hijo.
- Un agente no necesita producir HTML, Markdown ni espaciado manual para usar
  tablas o contenido estructurado.
- Las operaciones respetan permisos, versionado, auditoría y eventos igual que
  las operaciones realizadas desde el portal.

## Relación Con La Arquitectura Existente

- `docs/superpowers/plans/2026-08-01-neuma-editor.md` define el documento
  JSON compatible con ProseMirror como contrato compartido.
- `docs/superpowers/specs/2026-08-01-neuma-design.md` define MCP como
  adaptador sobre casos de uso autorizados.
- `docs/superpowers/plans/2026-08-05-neuma-notion-alignment.md` prioriza
  lecturas y escrituras acotadas por bloque.

Este documento concreta cómo esas decisiones deben aplicarse a la autoría de
contenido por agentes.
