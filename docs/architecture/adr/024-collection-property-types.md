# 024: Nuevos tipos de propiedad de colección y opciones identificadas por id

**Status:** Accepted
**Date:** 2026-10-20
**Depends on:** `021-everything-is-a-block.md`, `023-comments-as-discussions.md`
**Precedes:** la etapa 4 del plan `2026-10-20-paridad-con-notion.md` (vistas por reductores), que filtra, ordena y agrupa sobre lo que este ADR fija.

## Context

Una colección es un bloque `page` con un esquema (`PageSchemaProperty`, una fila por propiedad con `key`, `label`, `type`, `required`, `options`) y vistas (`PageSchemaView`). Los valores de cada fila viven en `properties.values` de su bloque, indexados por `key`. Hoy hay ocho tipos: título, texto, selección, selección múltiple, persona, fecha, casilla y número. El plan pide once más (etapa 3), y la etapa 4 construirá la consulta del servidor encima de ellos.

Cuatro cosas del modelo actual no aguantan los tipos nuevos:

- **Las opciones se identifican por su nombre.** Una selección guarda `"En curso"` en cada fila. Renombrar una opción reescribe todas las filas, y dos personas que renombran y editan a la vez se pisan (BR-699e037 existe para parchar eso). Los filtros guardados, las columnas colapsadas y los límites de columna de las vistas también citan nombres. `docs/architecture/references/notion-views-and-databases.md` (sección 5.1) señala que Notion agrupa por nombre y que es lo que no hay que copiar.
- **Persona guarda un solo id** y **fecha guarda un solo instante**, sin rango ni varios valores.
- **Un número es un número a secas**, sin moneda, porcentaje ni decimales.
- **`required` existe en el servidor** (una fila sin ese valor se rechaza) pero ninguna pantalla lo ofrece, y la regla actual rechaza editar cualquier otra propiedad de una fila vieja que no tenga el valor.

El servidor ya valida cada transacción contra el esquema del tipo (ADR 021, paso 3) y las lecturas de filas ya quitan lo que el lector no puede ver. Los tipos nuevos tienen que sostener las dos garantías.

## Alternatives Considered

### Identidad de las opciones

- **Seguir por nombre.**
  - PRO: cero migración.
  - CON: renombrar es una reescritura masiva y concurrente. Cada tipo nuevo con opciones (estado) heredaría el problema, y la agrupación del tablero quedaría atada al texto visible.
- **Id estable por opción, asignado por el servidor (elegida).**
  - PRO: renombrar toca solo el esquema. Filas, filtros y vistas no cambian. El orden de las opciones puede cambiar sin afectar a nadie.
  - CON: una migración que reescribe filas y vistas, y cada borde (MCP, exportación) debe traducir id a nombre.
- **Índice posicional.**
  - PRO: valores cortos.
  - CON: reordenar o borrar una opción corre los índices de todas las filas.

### Dónde viven los valores calculados (creación, edición, id único)

- **Copiarlos a `properties.values` en cada transacción.**
  - PRO: el motor de filtros lee todo de un solo lugar.
  - CON: cada edición escribe una clave más, la copia puede divergir de las columnas, y las filas existentes necesitan un relleno.
- **Leerlos de las columnas del bloque (elegida para creación y edición).**
  - PRO: una sola fuente, nada que sincronizar, y la etapa 4 ordena y filtra con un índice sobre `createdAt` y `editedAt`.
  - CON: el motor compartido recibe un valor compuesto (almacenado más derivado), no solo `values`.
- **Id único: secuencia de Postgres por colección.**
  - PRO: lo resuelve el motor.
  - CON: obliga a crear y borrar secuencias con DDL desde la aplicación, dentro de la transacción de esquema.
- **Id único: contador en la fila de la propiedad (elegida).**
  - PRO: `UPDATE ... RETURNING` bajo el bloqueo de fila, dentro de la transacción de la fila que se crea. Si la transacción falla, el número no se consume.
  - CON: serializa la creación de filas de esa colección mientras dure la transacción. Es corta, y solo afecta a colecciones que tienen la propiedad.

### Relaciones

- **Tabla de aristas `BlockRelation`.**
  - PRO: integridad referencial y consulta inversa con índice.
  - CON: una tabla más, y la lectura de una fila necesita una unión para saber a qué apunta. Duplica lo que ya hace `properties.values`.
- **Ids dentro de `properties.values`, con la propiedad espejo mantenida por el servidor (elegida).**
  - PRO: coherente con el resto de los valores, viaja en la misma lectura de la fila, y los permisos filtran con el mismo mecanismo que `children`.
  - CON: la consulta inversa de una relación de una vía necesita un índice GIN sobre el JSON (se mide en la etapa 4), y no hay clave foránea que impida un id colgante. Las lecturas descartan los ids que ya no apuntan a una fila viva.

### Estado

- **Una selección con un campo `group` opcional.**
  - PRO: un tipo menos.
  - CON: el estado tiene invariantes propios (siempre tiene valor, tres grupos fijos, al menos una opción por grupo) que una selección no tiene. Habría que ramificar dentro de la selección.
- **Un tipo `STATUS` aparte (elegida).**
  - PRO: sus reglas viven en su definición.
  - CON: un tipo más que enseñar en cada lista de tipos.

## Decision

### Opciones con id

Cada opción de `SELECT`, `MULTI_SELECT` y `STATUS` pasa a `{ id, value, color }`, más `group` en estado.

- `id` es una cadena aleatoria de 8 caracteres `[a-z0-9]`, única dentro de su propiedad. La asigna el servidor al guardar una opción que llega sin id. El cliente nunca la propone.
- Las filas guardan el **id**. Selección guarda un id, selección múltiple una lista de ids.
- `value` es el nombre visible y sigue siendo único dentro de la propiedad.
- Renombrar una opción cambia solo `value` en el esquema. No reescribe filas ni vistas. `rewriteSchemaOption` pasa a operar por id.
- Quitar una opción sigue quitando su id de las filas en la misma operación, con la excepción de estado (abajo).
- Un id que una fila guarda y el esquema ya no conoce se trata como vacío al leer, nunca como un valor. Nada lo reinterpreta por nombre.
- Las vistas citan ids: valores de filtro de selección, estado y persona, `collapsedGroups` y `columnLimits` cuando agrupan por una propiedad de opciones.
- **Migración.** Una sola migración de datos (ver más abajo) convierte los nombres existentes a ids.
- **MCP.** Las herramientas aceptan nombres de opción y los traducen a id en el borde. Un nombre desconocido es un error con la lista de nombres válidos. Las lecturas devuelven `{ id, name }`. Un agente no necesita conocer los ids.

### Catálogo de tipos

Los once tipos nuevos suman `STATUS`, `RELATION`, `URL`, `EMAIL`, `PHONE`, `FILES`, `CREATED_TIME`, `EDITED_TIME`, `CREATED_BY`, `EDITED_BY` y `UNIQUE_ID`. Tres tipos existentes cambian de forma: persona, fecha y número.

| Tipo | Valor guardado en `values[key]` | Configuración |
|---|---|---|
| `STATUS` | id de opción (cadena), siempre presente | opciones con `group`: `TO_DO`, `IN_PROGRESS`, `COMPLETE` |
| `RELATION` | lista de ids de filas de la colección destino | `targetCollectionId`, `mirrorPropertyKey` (nulo si es de una vía) |
| `URL` | cadena | ninguna |
| `EMAIL` | cadena | ninguna |
| `PHONE` | cadena | ninguna |
| `FILES` | lista de ids de `FileAsset` | ninguna |
| `CREATED_TIME`, `EDITED_TIME` | nada. Se lee de `Block.createdAt` y `Block.editedAt` | ninguna |
| `CREATED_BY`, `EDITED_BY` | nada. Se lee de `Block.createdById` y `Block.editedById` | ninguna |
| `UNIQUE_ID` | entero asignado por el servidor | `prefix` (opcional) |
| `PERSON` (cambia) | lista de ids de usuario | `allowsMultiple` (falso por defecto) |
| `DATE` (cambia) | `{ start, end? }` | ninguna |
| `NUMBER` (cambia) | número | `format` (`NUMBER`, `PERCENT`, `CURRENCY`), `decimals`, `currency` |

La configuración vive en una columna nueva `PageSchemaProperty.config` (JSON, nula en los tipos sin configuración), validada con un esquema Zod por tipo en `packages/shared`. Las opciones siguen en `options`.

### Estado

- Tres grupos fijos. Cada grupo tiene al menos una opción. Una propiedad nueva nace con tres opciones, una por grupo.
- La fila siempre tiene valor. Al crearla, el servidor escribe la primera opción del grupo `TO_DO`. Escribir un valor vacío se rechaza. Al agregar la propiedad a una colección con filas, esas filas reciben el mismo valor en la misma transacción.
- Quitar una opción mueve sus filas a la primera opción restante del mismo grupo. Quitar la última opción de un grupo se rechaza.
- El filtro admite una opción (`IS`, `IS_NOT`) o un grupo entero con dos operadores nuevos, `IS_IN_GROUP` e `IS_NOT_IN_GROUP`, cuyo valor es el nombre del grupo.

### Relación

- **Destino.** Una colección del mismo espacio que el escritor puede leer. Se admite apuntar a la propia colección (la espejo, si la hay, es otra propiedad).
- **Validación al escribir.** Cada id debe ser una fila viva, hija de la colección destino y legible por quien escribe. Un id ilegible o inexistente rechaza la transacción con el mismo mensaje en ambos casos, para no revelar que la fila existe. Tope de 100 ids por celda.
- **Cómo se escribe.** Con dos comandos propios del pipeline de bloques, `addRelation` y `removeRelation`, con argumentos `{ property, targetId, after? }`. `after` es el id de la relación tras la cual se inserta (o ninguno para el final). Son relativos a un id, como `listAfter`, así que conservan el orden y dos personas que agregan filas distintas a la misma celda no se pisan. Ambos son idempotentes. `set` de la lista completa se rechaza en una propiedad de relación. `listAfter` y `listRemove` no se generalizan a `properties.values`.
- **Dos vías.** Crear la relación en dos vías crea la propiedad espejo en el destino en la misma transacción de esquema (exige poder escribir ambas colecciones y que el destino tenga espacio bajo el tope de propiedades). Al aplicar un comando, la misma transacción bloquea las filas espejo (en orden de id, para evitar bloqueos cruzados) y agrega o quita el id de origen en su celda.
- **Permiso del lado espejo.** Escribir el espejo exige poder **editar** la fila destino, no solo leerla. Si quien escribe no puede editarla, se rechaza toda la operación con un error tipado (`RELATION_MIRROR_FORBIDDEN`) que nombra que es el lado espejo. Un lector no modifica una página que no puede editar. Si la celda espejo pasaría de 100 ids, toda la transacción se rechaza.
- **Quitar la propiedad.** Borrar un lado deja el otro como relación de una vía y conserva sus valores. Si se manda a la papelera o se purga la colección destino, la propiedad muestra «colección eliminada» y sus valores no se devuelven.
- **Lecturas con permisos.** Toda respuesta que incluya filas (lectura de colección, MCP, exportación, y en la etapa 4 los conteos y agregados) quita de cada celda de relación los ids que el lector no puede leer antes de responder, con una sola comprobación en lote por página de filas. El conteo de la celda y cualquier agregado se calculan después de ese filtro. Un id no legible nunca se cuenta.

### URL, correo y teléfono

Se guardan como cadena recortada.
- **URL.** Debe parsear con esquema `http` o `https` y tener host. Máximo 2048 caracteres. El portal antepone `https://` cuando la persona escribe solo el host. El servidor no corrige nada.
- **Correo.** Un `@`, dominio con punto, sin espacios, máximo 254 caracteres.
- **Teléfono.** Dígitos, espacios y `+ - ( )`, entre 6 y 20 dígitos.

### Archivos

La celda guarda la lista de ids de `FileAsset` (máximo 10). No se duplica el archivo ni se guarda el nombre.
- Cada id debe ser un activo `ACTIVE` del mismo workspace que subió quien escribe, o uno que ya está en esa celda.
- Al adjuntarlo, si el activo no tiene `pageId`, se le asigna el de la fila. Un activo referenciado por una celda cuenta como en uso para la limpieza de huérfanos.
- Las lecturas de filas devuelven junto a los ids el nombre, tamaño y tipo, leídos de `FileAsset`.

### Fecha y autor de creación y edición

No se guardan en `values`. Una escritura sobre estas claves se rechaza. El lector compone un valor derivado desde las columnas del bloque (`withDerivedValues`) y se lo entrega al motor de filtros, orden y agrupación de `packages/shared`. La etapa 4 usa las columnas directamente en SQL. «Editado» refleja cualquier edición de la fila, incluido su cuerpo y las escrituras espejo de una relación.

### Id único

- El valor es el entero. La vista lo muestra como `prefix-N`, o `N` sin prefijo. Cambiar el prefijo cambia cómo se muestra en todas las filas, sin tocar datos.
- El contador es una columna nueva `PageSchemaProperty.nextValue` (entero, 1 por defecto, solo se usa en `UNIQUE_ID`). Al crear una fila en la colección, la transacción hace `UPDATE ... SET nextValue = nextValue + 1 ... RETURNING` sobre esa fila, escribe el valor en la fila nueva y confirma todo junto. Una escritura del cliente sobre esa clave se rechaza.
- Al agregar la propiedad a una colección con filas, el servidor las numera por `createdAt` y `id` en la transacción de esquema.
- Los números no se reutilizan si se borra una fila. Una fila que entra a la colección por un movimiento recibe el siguiente.

### Persona con varios valores

La celda de persona guarda siempre una lista de ids de usuario. `allowsMultiple` en falso limita la lista a un elemento y es lo que migran las propiedades actuales. Cada id debe ser un miembro del directorio, como hoy.

### Fecha con rango

`{ "start": "2026-10-20", "end": "2026-10-25" }`, con `end` ausente en una fecha simple. `start` y `end` usan la misma precisión, `YYYY-MM-DD` o un instante ISO con desfase, y `end` no es anterior a `start`. Las agrupaciones por día, semana y mes usan `start`.

### Formatos de número

El valor guardado es siempre el número plano.
- `NUMBER`: sin unidad.
- `CURRENCY`: unidades mayores, con `currency` como código ISO 4217. El portal formatea con `Intl.NumberFormat`.
- `PERCENT`: se guarda la fracción (`0.25` se muestra «25 %»), para que las sumas y los promedios sigan siendo aritmética correcta. El editor convierte y redondea al escribir.
- `decimals` (0 a 8, o nulo para libre): el servidor rechaza un valor con más decimales de los configurados. El editor redondea antes de enviar. Se acepta el error de punto flotante para montos grandes. Los agregados de la etapa 4 suman en `numeric` de Postgres.

### `required`

- Se ofrece en el editor de cada propiedad, y la columna lleva un asterisco en el encabezado. No se ofrece para título (siempre requerido), casilla, estado, ni para los tipos calculados (creación, edición, id único), que ya siempre tienen valor.
- Se exige al crear una fila y cuando se escribe o se vacía esa propiedad. Editar otra propiedad de una fila vieja que no tenía el valor ya no se rechaza (cambio respecto de hoy, donde la regla bloqueaba cualquier edición). La fila muestra «falta» en la propiedad.
- Vacío significa lo que dice cada tipo: texto en blanco, lista sin elementos, rango ausente.
- El formulario de fila nueva no se puede confirmar con una propiedad requerida vacía.

### Qué soporta cada tipo

El motor compartido de filtros, orden y agrupación se organiza por tipo lógico. Se añaden los tipos lógicos `STATUS`, `RELATION` y `FILES`. Persona pasa a `MULTI_TAG`.

| Tipo | Filtro | Orden | Agrupa | Texto exportado |
|---|---|---|---|---|
| `TITLE`, `RICH_TEXT`, `URL`, `EMAIL`, `PHONE` | es, no es, contiene, no contiene, vacío | alfabético | no | el texto |
| `SELECT` | es, no es, vacío | por posición de la opción | sí, por opción | el nombre |
| `MULTI_SELECT` | contiene, no contiene, vacío | por la primera opción, por posición | sí, la fila aparece en cada valor | nombres separados por coma |
| `STATUS` | es, no es, en el grupo, no en el grupo | por grupo y luego por posición | sí, por opción o por grupo | el nombre |
| `PERSON` | contiene, no contiene, vacío | por el primer nombre | sí, la fila aparece en cada persona | nombres separados por coma |
| `DATE` | es (el día cae en el rango), antes (`end` o `start`), después (`start`), vacío | por `start` y luego `end` | sí, por día, semana o mes de `start` | `AAAA-MM-DD` o `AAAA-MM-DD → AAAA-MM-DD` |
| `CHECKBOX` | es | falso antes que verdadero | sí | `true` o `false` |
| `NUMBER` | es, no es, mayor, menor, vacío | numérico | sí | número con su formato |
| `UNIQUE_ID` | como número | numérico | no | `PREFIJO-N` |
| `CREATED_TIME`, `EDITED_TIME` | como fecha | cronológico | sí, por día, semana o mes | instante ISO |
| `CREATED_BY`, `EDITED_BY` | es, no es | por nombre | sí | nombre |
| `RELATION` | contiene (un id), no contiene, vacío | por cantidad | no | títulos de las filas legibles, separados por coma |
| `FILES` | vacío, no vacío | no | no | nombres de archivo separados por coma |

Las reglas que la etapa 4 hereda:
- Ordenar una propiedad de opciones usa el orden de las opciones del esquema, que la persona controla. Reemplaza el orden alfabético de hoy, y se puede expresar en SQL sin unir nombres.
- Agrupar por una propiedad de varios valores repite la fila en cada grupo. El reductor `groups` informa aparte el conteo de filas distintas, para que un total no se infle.
- Las filas sin valor forman el grupo «sin valor», salvo en estado, que no lo tiene.
- Las vistas citan tipos y opciones por id y llave. Un filtro o un orden sobre una propiedad borrada se deja de aplicar, como hoy.
- El tablero conserva su lista actual de propiedades que agrupan, más estado. No agrupa por varios valores en esta etapa.

### Migración

Una sola migración (`packages/db`, conforme a su `AGENTS.md`) hace, en este orden y en una transacción:
1. agrega los once valores al enum `DatabasePropertyType`, y las columnas `PageSchemaProperty.config` y `PageSchemaProperty.nextValue`;
2. asigna un id a cada opción de cada selección y selección múltiple;
3. reescribe en `Block.properties.values` los nombres de opción por sus ids. Un nombre que no está entre las opciones se cuenta y se informa en la salida, no se reinterpreta;
4. reescribe en `PageSchemaView.configuration` los valores de filtro, `collapsedGroups` y `columnLimits` que apuntan a una propiedad de opciones;
5. convierte los valores de persona de cadena a lista de un elemento, con `allowsMultiple` en falso, y cambia en las vistas los operadores `IS` e `IS_NOT` de persona a `CONTAINS` y `NOT_CONTAINS`;
6. convierte los valores de fecha de cadena a `{ start }`;
`PageVersion.content` no se toca: es el documento del cuerpo de la página (títulos y bloques de contenido), y no guarda `properties.values`.

Cuenta valores y vistas antes y después, y falla si no coinciden. Se prueba contra una copia de la base con colecciones reales, y se corre primero en una base desechable. Como no hay producción (mismo criterio del ADR 022), no hay convivencia entre el formato viejo y el nuevo.

## Consequences

- Positivas:
  - renombrar una opción es un cambio de una fila del esquema y no puede pisar a nadie;
  - cada tipo nuevo se valida en el servidor con la misma tubería de transacciones, y las relaciones respetan permisos al leer;
  - la etapa 4 recibe una tabla clara de qué filtra, ordena y agrupa cada tipo, y valores que pueden pasar a SQL con un índice;
  - creación y edición no divergen de las columnas porque no se copian;
  - `required` deja de ser una regla invisible.
- Negativas:
  - la migración reescribe filas, vistas y versiones, y toca tres formas de valor a la vez (opciones, persona, fecha);
  - toda lectura de filas con relaciones paga una comprobación de permisos en lote;
  - la relación en dos vías hace que escribir una celda toque filas ajenas, que se bloquean y suben su `version`;
  - el contador del id único serializa la creación de filas de esa colección;
  - cambiar el orden de selección de alfabético a posicional es un cambio visible para quien lo usaba;
  - sin clave foránea, una relación puede guardar ids colgantes que las lecturas descartan;
  - como el id de una opción es propio de su propiedad, mover una fila a otra colección cuyas selecciones tienen otros ids se rechaza (409), en vez de guardar valores que aquella colección no entiende;
  - al guardar la forma, completar los estados por defecto y los números del id único de las filas que ya existían, y limpiar las opciones quitadas, ocurre dentro de la misma transacción de Postgres que el cambio del esquema (la tubería de bloques acepta una transacción ya abierta, `applyTrustedWithin`); si un paso falla, no queda ni la propiedad ni las filas a medias. El costo es que guardar la forma de una colección con una fila que quien guarda no puede editar se rechaza entera;
  - una transacción cruda de bloques (`POST /transactions`, el canal en vivo) no puede escribir en `values` un id único ni un campo de creación o edición: la tubería lo rechaza con `BLOCK_PROPERTY_SERVER_ASSIGNED`. La tubería lee el esquema de la colección de la fila que toca, así que esa lectura ahora ocurre en toda transacción cliente que cambie una fila. El resto de la validación de valores sigue siendo la de la API de páginas y la del MCP.
  - el MCP sube archivos con `upload_file` (base64, nombre y tipo, hasta 10 MB) por el mismo servicio de archivos que el portal, y devuelve el id que se pone en una columna de archivos. La ruta del MCP sube el límite del cuerpo de Fastify (1 MiB por defecto) a lo que cabe un archivo de 10 MB en base64.
- Aceptado como costo: cambiar el tipo de una propiedad sigue fuera (BR-37f128e). Cada tipo nuevo se crea nuevo, y la conversión es una pregunta separada.

## Governance

Las reglas de negocio de `FEA-CLC` que este ADR cambia se reemplazan con `rules:add` y `supersedes` al implementar:
- BR-12b587f (cada opción lleva nombre y color: ahora también id);
- BR-37f128e (renombrar una opción deja de ser un aviso sobre filas);
- BR-699e037 (el renombrado de una opción se aplica por id);
- BR-d7ada57 (el valor soltado debe ser una opción que la propiedad ofrece: ahora un id).

Se añaden reglas para estado, relación (permisos y espejo), id único, y `required`. Cada tipo nuevo entra con pruebas de validación, filtro, orden, agrupación y exportación escritas antes del código. Un tipo futuro (fórmula, rollup, etapa 10) se decide en su propio ADR y reutiliza `config` y la tabla de capacidades.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20
- Modified: 2026-10-20. Aprobado con tres cambios. La relación se edita con dos comandos propios (`addRelation`, `removeRelation`) y no con `listAfter`/`listRemove`. Escribir el lado espejo exige permiso de edición sobre la fila destino. Se confirmó que `PageVersion.content` no guarda valores de filas, así que la migración no la toca.
- Implementado el 2026-10-20 con tres diferencias respecto de lo propuesto, todas de alcance: el tablero no agrupa por persona ni por selección múltiple (queda la lista previa más estado y los tiempos de creación y edición); un estado no se agrupa «por grupo» sino por opción; y el MCP lee relaciones y archivos pero no los escribe. Las reglas de `FEA-CLC` se reemplazaron o agregaron con `rules:add` (BR-12b587f, BR-37f128e, BR-699e037 y BR-d7ada57 quedaron reemplazadas).
- No existe exportación de colecciones todavía. `toExportText` es el renderizado de texto compartido que usarán el MCP, la exportación de páginas y el copiado.
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 3); `docs/architecture/references/notion-views-and-databases.md` (secciones 5.1 y 6)
