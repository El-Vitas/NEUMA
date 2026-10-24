# 028: Rollups y fórmulas con un solo motor, calculados al leer

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`, `025-views-as-reducer-queries.md`, `026-collection-change-notices.md`
**Precedes:** la etapa 11 (caché local y modo cliente) del plan `2026-10-20-paridad-con-notion.md`.

## Context

La etapa 10 pide dos tipos de propiedad nuevos. Una **fórmula** calcula un valor desde las otras propiedades de la fila. Un **rollup** resume una propiedad de las filas que una relación enlaza. Se muestran en tabla, tablero y galería, se filtran, ordenan, agrupan y agregan como cualquier otra propiedad, y las puede definir y leer un agente.

ADR 024 dejó esto fuera y fijó dos cosas que valen aquí. Los valores derivados no se copian a `properties.values`, y las lecturas quitan de cada celda de relación los ids que el lector no puede leer antes de contar o agregar. ADR 025 compila filtro, orden y grupos a SQL sobre `properties.values`, con el motor de `packages/shared` como oráculo de la semántica. ADR 026 dio a cada bloque un `changeXid`.

La referencia de Notion (`notion-views-and-databases.md`, sección 6) describe un motor con límite de tiempo y de trabajo, un resultado por `(fila, propiedad)` atado a la versión del esquema, carga de dependencias en lotes y valores precalculados para filtrar y ordenar. También dice que es lo más caro de la paridad.

Lo que obliga a decidir:

- una fórmula no se puede expresar en SQL sin duplicar el lenguaje, y un rollup depende de otras filas;
- un rollup puede revelar una fila ilegible, y una fórmula con `now()` cambia sin que nadie escriba;
- cuando cambia una fila relacionada cambia el valor de otra fila cuyo bloque no se tocó;
- el agente debe poder definir, probar y entender un error sin pasar por el portal.

AGENTS.md pide la solución más simple y optimizar solo con una medición. Por eso esta decisión **no incluye caché** en la primera versión, y fija cuándo se añade.

## Alternatives Considered

### Dónde corre el lenguaje

- **Compilar la fórmula a SQL.**
  - PRO: filtrar y ordenar sale de la base.
  - CON: dos semánticas, fechas y zonas distintas, y Postgres no da un límite de trabajo por fila.
- **Una librería de expresiones o un sandbox de JavaScript.**
  - PRO: nada que escribir.
  - CON: no controla el trabajo por celda, el sandbox es superficie de ataque y añade una dependencia sin aprobar.
- **Portar el lenguaje de Notion con listas, funciones anónimas y variables.**
  - PRO: paridad total.
  - CON: trae bucles y recursión, que la etapa 10 deja fuera.
- **Un intérprete propio, pequeño y tipado, una sola vez en `packages/shared` (elegida).**
  - PRO: servidor, portal y MCP ejecutan el mismo código. Sin bucles, el trabajo de una celda está acotado.
  - CON: hay que escribir y probar analizador y catálogo. Las fórmulas de Notion no se importan tal cual.

### Dónde viven los resultados

- **Calcular al leer, en lote (elegida para la versión 1).**
  - PRO: el resultado siempre es fresco y es por lector de forma natural (permisos, `now()` y zona funcionan sin reglas aparte). No hay tabla, migración de datos, invalidación ni respuesta «pendiente».
  - CON: filtrar, ordenar, agrupar o agregar por un valor calculado evalúa los candidatos en cada consulta. Su costo crece con la colección, y por eso se mide.
- **Tabla de resultados validada al leer con `changeXid` (plan siguiente, con disparador).**
  - PRO: SQL filtra y ordena sobre columnas tipadas.
  - CON: dos tablas, invalidación por fila y por filas relacionadas, valores por lector aparte, presupuesto y respuesta «pendiente».
- **Copiar a `properties.values` o invalidar al escribir.**
  - PRO: el motor de ADR 025 no cambia.
  - CON: ADR 024 descartó copiar derivados, y una edición movería en cascada otras filas, su `version` y los avisos.

### Cómo se filtra, ordena y agrega un valor calculado

- **Traer toda la colección y evaluarla en TypeScript.**
  - PRO: simple.
  - CON: reintroduce el corte que ADR 025 eliminó, si no hay un filtro previo.
- **Un prefiltro en SQL más evaluación exacta en TypeScript (elegida).**
  - PRO: el SQL recorta con lo que sí sabe y la semántica final es la del motor compartido.
  - CON: dos pasos, y un tope de candidatos.

## Decision

### El lenguaje

Un módulo `packages/shared/src/page-formula/` con analizador, comprobador de tipos, evaluador y catálogo de funciones. Lo usan el servidor (evaluar, guardar y probar) y el portal (editor, validación, vista previa y recálculo optimista). Sin dependencias, sin interpretar JavaScript.

| Grupo | Contenido |
|---|---|
| Operadores | `+ - * / %`, `== != < <= > >=`, `and`, `or`, `not` (y `&& \|\| !`), negación unaria |
| Condición | `if(condición, a, b)` |
| Propiedades | `prop("Nombre")`: texto, número, casilla, fecha, selección, estado, persona, creación y edición, id único, otra fórmula o un rollup |
| Números | `abs ceil floor round sqrt pow sign min max toNumber` |
| Texto | `concat length lower upper trim contains startsWith endsWith replace replaceAll slice format join empty` |
| Fechas | `now today date dateAdd dateSubtract dateBetween start end year month day weekday hour minute formatDate timestamp fromTimestamp` |
| Listas (lectura) | `length join first last contains empty` sobre relaciones y rollups de «mostrar original». Sin `map`, `filter` ni funciones anónimas |

- Fuera de la versión 1: bucles, recursión, funciones anónimas, variables, expresiones regulares (ReDoS) y acceso a otras filas que no sea un rollup.
- **Tipos.** Número, texto, casilla, fecha (con fin opcional) y lista. El comprobador infiere el tipo al guardar y rechaza lo que no cuadra. El resultado de una fórmula es un escalar. Un valor vacío se propaga por la aritmética y las comparaciones; `empty(x)`, `if`, `and` y `or` lo reciben sin propagarlo. La tabla exacta se fija primero en las pruebas.
- **Guardado.** `PageSchemaProperty.config` guarda `source` (texto), `ast` (con ids de propiedad), `resultType` y `references`. Renombrar una propiedad reescribe solo los tramos de `source` que la citan. Escribir una celda de fórmula o de rollup se rechaza, como en creación y edición.
- **Límites.** Texto de hasta 2.000 caracteres, árbol de hasta 500 nodos y profundidad 24. Presupuesto de 10.000 pasos por celda (por nodo evaluado y por elemento o carácter procesado), determinista y no de reloj. Resultado de texto de hasta 10.000 caracteres. La relación ya tiene tope de 100 ids por celda (ADR 024).
- **Errores tipados.** Al guardar se rechaza con `Result` y código: `FORMULA_SYNTAX`, `FORMULA_UNKNOWN_FUNCTION`, `FORMULA_UNKNOWN_PROPERTY`, `FORMULA_TYPE_MISMATCH`, `FORMULA_CYCLE`, `FORMULA_TOO_LARGE`, con posición (`from`, `to`) y mensaje; el desconocido propone las dos etiquetas más cercanas. Al evaluar, el error pertenece a la celda y no rompe la fila: `FORMULA_DIVISION_BY_ZERO`, `FORMULA_INVALID_ARGUMENT`, `FORMULA_WORK_LIMIT`, `FORMULA_DEPENDENCY_ERROR` y `ROLLUP_TARGET_UNAVAILABLE`. El portal pinta el código y el mensaje. Un error no cumple ningún filtro, va al final del orden y se cuenta aparte en las agregaciones (`errorCount`).
- **Cambios de esquema rechazados.** Borrar o cambiar de tipo una propiedad que cita una fórmula o un rollup (de la misma colección o de otra) falla con `PROPERTY_IN_USE` y la lista de dependientes. Un ciclo falla al guardar. Una cadena de rollups sobre rollups o fórmulas tiene tope de 3 colecciones (`ROLLUP_DEPTH_EXCEEDED`).

### El rollup

`config` guarda `relationPropertyId`, `targetPropertyId`, `calculation` y `resultType`; la colección destino sale de la relación.

| Cálculo | Resultado |
|---|---|
| `COUNT_ALL` (filas relacionadas), `COUNT_FILLED`, `COUNT_EMPTY` | número |
| `PERCENT_FILLED`, `PERCENT_EMPTY` | número (misma convención que `PERCENT_CHECKED`) |
| `SUM`, `AVERAGE`, `MEDIAN` | número |
| `MINIMUM`, `MAXIMUM` | número, o fecha si el destino es una fecha |
| `SHOW_ORIGINAL` | lista de los valores del destino |

- Los cálculos válidos salen de `listPageCalculationsFor(tipo del destino)`. `PERCENT_FILLED` y `PERCENT_EMPTY` pasan a ser cálculos de esa tabla (también de los pies de tabla), con su caso en el compilador SQL de agregaciones de ADR 025 y en la prueba de paridad. Las funciones de `page-view.calculation.lib` se reutilizan, no hay segunda implementación.
- Sin filas relacionadas, los conteos y la suma valen 0; el promedio, mínimo, máximo, mediana y porcentajes quedan vacíos.
- `SHOW_ORIGINAL` se muestra, se lee por el MCP y se usa desde otra fórmula, pero **no se filtra, ordena ni agrupa en la versión 1** (`VIEW_QUERY_INVALID` con un mensaje claro).

### Calcular al leer

Un **contexto de cálculo** por petición carga, en lotes y sin una consulta por fila:

1. las filas candidatas, con sus valores;
2. los ids de relación de las propiedades que la fórmula o el rollup citan, ya sin los que el lector no puede leer (el conjunto denegado de ADR 025, mismo tope de 5.000 y mismo error tipado);
3. las filas relacionadas distintas, en una consulta `id = ANY($ids)` por colección destino y por bloque de 500 fuentes, solo con las claves necesarias;
4. si el destino es otra fórmula o un rollup, se evalúa primero en ese contexto (hasta el tope de profundidad).

Los cálculos corren con el motor compartido. Como cada petición evalúa para su lector, con su reloj (`PAGE_QUERY_CLOCK`) y su zona (`timeZone`), el resultado es el que ese lector debe ver: un rollup nunca cuenta una fila ilegible y `now()` es el de la respuesta. Un lector sin acceso a la colección destino ve el rollup como si la relación estuviera vacía. Ninguna respuesta informa cuántas filas se excluyeron.

**Pantalla.** Para las filas de una página (de `results`, `groupResults` o la lectura de una fila) solo se evalúan las columnas calculadas pedidas.

### Filtrar, ordenar, agrupar y agregar

El compilador de ADR 025 sigue haciendo en SQL todo lo que no depende de un valor calculado. Cuando la consulta toca una columna calculada en el filtro, el orden, los grupos o las agregaciones, el servidor hace dos pasos:

1. **Prefiltro SQL.** Compila el filtro reemplazando por «verdadero» cada condición sobre una columna calculada, y aplica la búsqueda, el conjunto denegado y el resto. Es un superconjunto del resultado.
2. **Evaluación exacta.** Carga los candidatos en lotes, calcula las columnas calculadas necesarias, aplica el filtro completo con `matchesPageFilter`, ordena con `comparePageRowsBySorts`, agrupa con `groupPageRows` y agrega con las funciones de `page-view.calculation.lib`, todos del motor compartido. Pagina con el mismo cursor opaco de ADR 025 (valores de orden de la última fila más `id`).

- **Tope.** Hasta 20.000 candidatos. Por encima, `VIEW_QUERY_COMPUTED_TOO_LARGE` con un mensaje que indica cuántos candidatos hay y que un filtro por propiedades almacenadas los reduce. Nunca una respuesta truncada.
- **Una consulta que no toca columnas calculadas no cambia**: sigue entera en SQL.
- **Semántica única.** El valor calculado entra al motor compartido igual que los derivados de creación y edición (`withDerivedValues`). El paso 2 usa el oráculo directamente. La paridad con SQL se prueba donde hay SQL: el prefiltro debe ser un superconjunto del resultado exacto (propiedad probada con colecciones generadas), y `PERCENT_FILLED` y `PERCENT_EMPTY` entran a la paridad de las agregaciones.

### Medición y disparador del caché

Los datos reales de Neuma son pequeños (dos personas, unos cientos de páginas), y una colección de 10.000 filas con 10 relaciones por fila filtrada por una columna calculada es el caso de estrés, no el común. Los presupuestos son por eso dos. Una página de 50 filas con sus valores calculados tiene **p95 de API de 300 ms o menos**. Filtrar, ordenar, agrupar o totalizar por columnas calculadas sobre 10.000 filas con 10 relaciones tiene **p95 de 600 ms o menos**. La prueba `formulas-and-rollups.performance.integration.spec.ts` los vigila y se mide sola, sin otro proceso pesado: con el servidor de desarrollo de otra sesión en marcha los tiempos se duplican. Medido así en una máquina de desarrollo cargada, la página tardó 114 ms y las consultas calculadas entre 193 y 374 ms. El caché **solo se añade si un p95 medido sobre datos reales (o en la VM de producción) supera esos presupuestos**; la prueba de estrés en una máquina compartida no basta. El siguiente paso planeado es una tabla de resultados por `(fila, propiedad)`, validada al leer con `changeXid` como cursor (ADR 026), con `asOf` por entrada, huella de versiones de esquema, marca `hasRestrictedInputs` para las celdas que dependen de filas con permisos propios (que seguirían calculándose por lector), presupuesto de relleno por petición y una respuesta `COMPUTED_VALUES_PENDING`. Ese diseño se escribe en un ADR nuevo cuando el disparador se cumpla.

### Avisos y portal

- **Una fila cambia y su dependiente no se toca.** La consulta responde `computedDependsOn`, las colecciones destino de los rollups. El portal las sigue por el canal en vivo (cuentan en el tope de 20) y, ante un aviso, dibuja la página otra vez desde el servidor: las vistas no colocan esas filas porque no son suyas. Hoy el portal toma esas colecciones del esquema, así que sigue solo las directas: un rollup sobre un rollup de otra colección no se sigue hasta la tercera. Pedir por ids solo los valores calculados de las filas cargadas queda como mejora.
- **Optimista.** Mientras se escribe una celda de la tabla, el portal recalcula en local con el mismo motor las fórmulas de la fila que leen solo propiedades almacenadas u otras fórmulas así, y no usan el reloj. El resto espera al servidor.
- **Fila abierta en su página.** La lista de páginas no trae valores calculados (costaría calcularlos para todo el espacio), así que la página de una fila que pertenece a una colección con fórmulas o rollups los pide aparte con `GET` de la página, que los calcula para el lector.
- **Editor.** Valida mientras se escribe, con el mismo motor, y dice el tipo que da la fórmula. La prueba sobre filas reales es de `test_formula` para los agentes; el portal no la tiene todavía.
- **Para la etapa 11.** Un valor calculado no es parte de la `version` de la fila, porque puede cambiar con la fila intacta. Un registro cacheado en el navegador no debe darlos por buenos solo por la misma `version`.

### Herramientas del MCP

- **`update_collection_columns`** acepta `FORMULA` con `{ formula }` (texto con nombres de columna) y `ROLLUP` con `{ relation, property, calculation }`. Responde `resultType` y `references`, y si falla, el código, la posición y las etiquetas más cercanas.
- **`test_formula`** (nueva, solo lectura): `{ collection, formula | rollup, rows?, trace? }`. Comprueba una definición sin guardarla y la evalúa en hasta 5 filas. Devuelve `resultType`, `references`, los valores o errores por fila y, con `trace`, el valor de cada subexpresión. Es idempotente.
- **`query_collection`** y `get_collection` devuelven las columnas calculadas como `{ value }` o `{ error: { code, message } }` y aceptan `where`, `sort`, `groupBy`, `aggregate` y `columns` sobre ellas por nombre. Ante `VIEW_QUERY_COMPUTED_TOO_LARGE`, el mensaje dice cómo acotar.
- **`collection_changes`** (ADR 026), sin caché, no puede saber qué valor calculado cambió. Para cada colección con rollups, además de las filas de bloque tocado, devuelve como `possiblyChanged` las filas fuente cuya relación apunta a una fila destino que cambió desde `since` (se buscan por los ids de relación con una pasada por la colección, del orden de 3 ms con 10.000 filas según ADR 025). Van marcadas como posibles, completas y con sus valores actuales, y el agente deduplica por `id` y valor. Para fórmulas, una fila cambia solo si su bloque cambió, así que ya está cubierta.
- La guía de funciones y errores vive en las instrucciones del MCP y en la descripción de `test_formula`.
- Un agente tiene los permisos de su persona: los mismos rollups por lector y el mismo conjunto denegado.

### Otras superficies

- **Exportación** (Markdown, CSV): escribe el valor calculado para el lector, por la misma vía.
- **Totales con celdas fallidas**: `errorCounts` dice cuántas celdas de una columna totalizada fallaron entre las filas evaluadas, que son las que pasan las condiciones sobre columnas guardadas; es una cifra aproximada para no leer el total como si lo fuera todo.
- **Plantillas y valor por defecto**: no aplican a fórmulas ni rollups, y `required` se rechaza.
- **Fila en la papelera**: deja de contar en los rollups porque la relación ya la excluye (ADR 025).

### Migración

Solo la que el enum necesita: una migración pequeña (`packages/db`, conforme a su `AGENTS.md`) que agrega `FORMULA` y `ROLLUP` a `DatabasePropertyType`. No hay tablas nuevas. Antes de crearla se revisa `ls packages/db/migrations/app` por si otra etapa tiene una sin aplicar. Se prueba en una base desechable y luego se aplica a `company-brain`.

## Consequences

- Positivas:
  - un solo lenguaje que corre igual en servidor, portal y MCP, con trabajo acotado por celda;
  - sin tablas de caché, sin invalidación y sin estado «pendiente». Los valores son siempre frescos y por lector, con los permisos correctos;
  - la escritura no paga nada por fórmulas ni rollups;
  - el agente prueba una fórmula antes de guardarla, ve el código y la posición del error, y se entera de qué filas pueden haber cambiado.
- Negativas:
  - filtrar, ordenar, agrupar o agregar por un valor calculado evalúa los candidatos en cada consulta, con tope de 20.000 y una medición que puede obligar a añadir el caché;
  - `SHOW_ORIGINAL` no se filtra ni ordena;
  - `collection_changes` puede devolver filas que no cambiaron de valor (`possiblyChanged`);
  - el portal gasta suscripciones del tope de 20 en colecciones destino;
  - el lenguaje no importa fórmulas de Notion y no tiene listas funcionales ni expresiones regulares.
- Cambios de comportamiento existente:
  - borrar o cambiar de tipo una propiedad citada por una fórmula o un rollup falla con `PROPERTY_IN_USE`;
  - la tabla de cálculos gana `PERCENT_FILLED` y `PERCENT_EMPTY`.

## Governance

- Pruebas primero (TDD). Cada función del catálogo y cada regla de vacío tiene su caso antes del código. El analizador y el renombre tienen pruebas de propiedades.
- **Permisos.** Una prueba de fuga por rollup: un lector sin acceso a una fila relacionada obtiene el mismo valor que si no existiera, en celda, filtro, orden, grupo, agregación, exportación y MCP, y lo mismo con un lector sin acceso a la colección destino.
- **Prefiltro.** Prueba con colecciones generadas de que el resultado del SQL es siempre superconjunto del exacto.
- **Rendimiento.** Colección de 10.000 filas con 10 relaciones por fila: p95 de API de 300 ms o menos para una página de 50 filas con sus valores calculados y de 600 ms o menos para filtrar, ordenar, agrupar o totalizar por columnas calculadas, sin consultas por fila. Si un valor medido sobre datos reales los supera, se avisa con las cifras antes de añadir el caché.
- **Errores.** Todo error de consulta es un `Result` con código; un fallo inesperado deja un `ERROR` con traza y nunca una lista vacía.
- **Reglas de negocio** (`FEA-CLC`, con `rules:add`): fórmulas y rollups, errores de celda, permisos, `PROPERTY_IN_USE`, `VIEW_QUERY_COMPUTED_TOO_LARGE`.
- Una función, operador o cálculo nuevos no entran sin su caso de paridad. Añadir el caché se decide en un ADR nuevo.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21. Aprobado con un cambio estructural: sin tablas de caché ni validación al leer en la versión 1. Se calcula al leer, en lote, con el motor compartido, y el caché queda como plan siguiente con su disparador (p95 de 300 ms sobre 10.000 filas con relaciones). Se mantienen el lenguaje propio sin regex, `SHOW_ORIGINAL` solo de lectura, `PROPERTY_IN_USE`, el recálculo optimista, `PERCENT_FILLED` y `PERCENT_EMPTY`, y los avisos por colecciones destino.
- Modified: 2026-10-24. La evaluación exacta quedó distinta de lo escrito en Decisión: el servidor calcula las columnas calculadas sobre los candidatos que dejan pasar las condiciones guardadas, y entrega esos valores al SQL como si estuvieran guardados (`materializeComputed` en `page-query.service.ts`). Así el filtro, el orden, los grupos, el cursor y los totales siguen corriendo en el compilador de ADR 025, sin una segunda implementación en TypeScript.
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 10); `docs/architecture/references/notion-views-and-databases.md` (secciones 2.5 y 6)
