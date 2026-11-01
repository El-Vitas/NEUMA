# Plan: lo que le falta a Neuma para trabajar como Notion

Sale de dos estudios del 20 de octubre de 2026:
- el inventario de lo que Neuma tiene hoy, leído en el código;
- un estudio de cómo se usan en Notion las vistas, las consultas y los tableros.

Se hace sobre el modelo de bloques del ADR 021, en una rama nueva desde `develop` cuando `refactor/bloques-planos` esté integrada.

Cada etapa se cierra igual:
- un ADR antes del código cuando la etapa toma una decisión de diseño;
- las reglas de negocio nuevas o reemplazadas con `rules:add`;
- pruebas escritas antes del código, vistas fallar;
- `bun run check` en cero y las suites del backend y del portal en verde;
- la etapa probada en el navegador, con una página `QA <tema>` que quede en Engineering;
- un commit por etapa.

## Orden y dependencias

| # | Etapa | Depende de | ADR | Costo |
|---|---|---|---|---|
| 1 | Historial de versiones en la interfaz | — | no | bajo |
| 2 | Comentarios en hilo, con menciones y bandeja | — | sí | medio |
| 3 | Propiedades que faltan | — | sí | medio |
| 4 | Vistas que consultan por reductores, con paginación | 3 | sí | medio |
| 5 | Aviso de cambios por colección | 4 | sí | medio |
| 6 | Permisos por bloque y compartir en la interfaz | — | no | medio |
| 7 | Vistas que faltan o están incompletas | 4 | no | medio |
| 8 | Filtros con fechas relativas y «yo» | 4 | no | bajo |
| 9 | Plantillas de base de datos | 3 | no | medio |
| 10 | Rollups y fórmulas | 3, 4 | sí | alto |
| 11 | Caché local y modo cliente | 4, 5 | sí | alto |

Las etapas 1, 2, 3 y 6 no dependen entre sí y pueden ir en paralelo.

## Etapa 1 · Historial de versiones

El backend ya guarda una versión por racha de edición y sabe restaurarla con permisos por bloque (`findVersion`, `restoreVersion`), pero ninguna ruta ni pantalla los expone.

- Rutas: listar las versiones de una página con autor y fecha, leer una versión y restaurarla.
- Panel de historial en el portal: la lista, la vista previa en solo lectura de la versión elegida y el botón para restaurar, con confirmación.
- Restaurar es una transacción más: llega en vivo a quien tiene la página abierta y corta una versión nueva.
- Pruebas: un lector sin acceso a un bloque no lo ve en ninguna versión; restaurar no toca bloques ocultos; una página bloqueada no se restaura.

## Etapa 2 · Comentarios en hilo

Hoy un comentario es una lista plana guardada en el formato del bloque, más una marca en el texto. Notion guarda discusiones y comentarios como registros propios.

- ADR: los comentarios pasan a tablas propias.
  - `Discussion` cuelga de un bloque y puede citar un tramo de texto.
  - `Comment` es cada mensaje de un hilo, con texto enriquecido.
  - Una discusión se marca como resuelta y se puede reabrir.
  - Los permisos son los del bloque.
- Menciones de personas en los comentarios y en el texto de las páginas, que generan una notificación.
- Bandeja de notificaciones: menciones, respuestas en hilos donde uno participa y cambios en páginas que uno sigue, con leído y no leído. Llega por el canal en vivo.
- Migración de los comentarios actuales a hilos de un mensaje, sin perder ninguno.
- MCP: leer y responder hilos.

## Etapa 3 · Propiedades que faltan

Hoy existen 8 tipos: título, texto, selección, selección múltiple, persona, fecha, casilla y número.

- ADR: cómo se guarda cada tipo nuevo en `properties.values` y quién lo calcula.
- **Estado.** Opciones repartidas en tres grupos fijos: por hacer, en curso y hecho.
- **Relación.** Ids de páginas de otra colección.
  - Puede ser de una vía o de dos. La de dos vías mantiene la propiedad espejo en la misma transacción.
  - Lee respetando permisos: una fila que el lector no ve no aparece ni cuenta.
- **URL, correo y teléfono**, con validación.
- **Archivos**, sobre los adjuntos existentes.
- **Fecha y autor de creación y de edición.** Se leen de las columnas del bloque, sin copiarlas.
- **Id único con prefijo.** Lo asigna el servidor con un contador por colección dentro de la transacción, nunca el cliente.
- **Persona con varios valores** y **fecha con rango**.
- **Formatos de número:** moneda, porcentaje y decimales.
- **Opciones identificadas por id.** Hoy los grupos se identifican por el nombre de la opción, y renombrar no debe romperlos.
- **Requerido** visible en la interfaz.
- Pruebas por tipo: validación, filtro, orden, agrupación y exportación.

## Etapa 4 · Vistas que consultan por reductores

Hoy cada vista trae hasta 500 filas y no pagina.

- ADR: la vista pasa a ser la consulta. El cliente manda el id de la vista y los reductores que necesita, y el servidor arma filtro, orden y grupos desde la vista guardada.
- Reductores:
  - `results` para tabla, lista y galería, con límite y cursor;
  - `groups` para el tablero, con el conteo de cada grupo y las primeras tarjetas de cada uno;
  - un `results` por columna, con su propio «cargar más»;
  - agregados aparte: suma, promedio, mínimo y máximo.
- Carga en dos fases: primero las filas, después los conteos y los agregados, con estado «calculando».
- El orden manual es una lista de ids en la vista, con operaciones relativas a un id, igual que los hijos de un bloque.
  - Mover una tarjeta de grupo es una sola transacción que cambia la fila y la vista.
  - La lista se escribe por operaciones, no reemplazando la configuración entera: guardar el formato completo de una vez hace que el último que escribe pise al otro.
- Índices de Postgres para los filtros y órdenes más comunes sobre `properties.values`, medidos con `EXPLAIN` sobre una colección de 10.000 filas.
- Virtualización de tabla, lista y tablero: solo se dibujan las filas visibles más un margen.

## Etapa 5 · Aviso de cambios por colección

Hoy el canal en vivo avisa por página. Una vista abierta no se entera de que cambió una fila, salvo que la fila sea la página abierta.

- ADR: suscripción por colección en el canal en vivo.
  - Al confirmar una transacción que toca filas de una colección, se avisa `{fila: versión}` a quien tiene una vista de esa colección abierta, solo con las filas que cada uno puede leer.
- El cliente pide solo las filas que cambiaron y las recoloca en local. Repite la consulta solo si el cambio afecta un filtro o un orden que no puede evaluar.
- Antes de consultar una vista, el cliente espera a que se envíen sus escrituras pendientes en esa colección.

## Etapa 6 · Permisos por bloque y compartir

Los permisos por bloque funcionan en el backend y no se pueden configurar desde el portal.

- Diálogo «Compartir» en cada página: quién tiene acceso, con qué rol, y si hereda del padre o declara los suyos.
- Agregar y quitar personas, y cambiar el rol: lector, editor o acceso total.
- Restringir una sección dentro de una página: declarar permisos en un bloque que no es página.
- Indicador en la página y en el árbol lateral cuando algo tiene permisos propios.
- Pruebas en el navegador con tres usuarios: quien comparte, quien recibe y quien no tiene acceso.

## Etapa 7 · Vistas que faltan o están incompletas

- **Línea de tiempo:** fecha de inicio y de fin, escala de día, semana y mes, arrastre para mover y estirar.
- **Calendario:** vista por semana y fechas con rango.
- **Galería:** portada desde una propiedad de archivos o desde el contenido, y tamaño de tarjeta.
- **Tablero:** subgrupos, portada en la tarjeta, ocultar grupos y el grupo «sin valor».
- **Tabla:** reordenar filas a mano y columnas fijas.

## Etapa 8 · Filtros con fechas relativas y «yo»

- Fechas relativas: hoy, esta semana, los próximos N días, vencido.
- «Yo» en los filtros de persona y de autor: se resuelve con quien mira, no con quien guardó la vista.
- Filtros rápidos sobre la vista, además de los guardados.

## Etapa 9 · Plantillas de base de datos

- Plantillas por colección: contenido y propiedades iniciales, que se copian con ids nuevos, igual que al duplicar.
- Plantilla por defecto al crear una fila desde cualquier vista.
- Botón que crea una fila desde una plantilla. El bloque botón ya existe.

## Etapa 10 · Rollups y fórmulas

- ADR: un solo motor de fórmulas en `packages/shared`, que usan el servidor y el portal. Corre con límites de tiempo y de trabajo.
- Resultado guardado en caché por fila y propiedad, invalidado por la versión del esquema y por las filas de las que depende.
- **Rollup:** resume una propiedad de las filas relacionadas con contar, sumar, promedio, mínimo, máximo o porcentaje. Se calcula para toda la vista en lote, no fila por fila.
- Las fórmulas y los rollups se pueden filtrar y ordenar. Si no se puede hacer en SQL, el servidor los calcula en lote.

## Etapa 11 · Caché local y modo cliente

- ADR: caché de registros en el navegador por versión, en SQLite sobre WASM o en IndexedDB, según lo que se mida.
- **Pintar desde caché y después revalidar.** Al abrir una página o vista se pinta lo que hay en caché y se revalida con el servidor. La caché se descarta si cambió la consulta.
- **Modo cliente.** En colecciones chicas, el servidor manda todos los ids y el navegador filtra, ordena y agrupa con el mismo motor de la etapa 4. El umbral se mide y no se fija a ojo.
- **Cola de transacciones persistente,** para que lo escrito sin conexión no se pierda al cerrar la pestaña.
- **Fallos.** Ante un fallo, se vuelven a pedir los registros tocados en vez de deshacer con operaciones inversas.

## Riesgos que se vigilan en todas las etapas

- **Filtraciones:** ningún conteo, agregado, relación, rollup ni notificación revela una fila que el lector no puede ver.
- **Rendimiento:** cada etapa con vistas mide una colección de 10.000 filas y un tablero de 2.000 tarjetas.
- **Escrituras concurrentes:** la configuración de una vista nunca se pisa entre dos personas que la editan a la vez.
