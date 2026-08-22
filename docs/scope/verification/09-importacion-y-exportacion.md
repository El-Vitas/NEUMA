# 09 · Importación y exportación

Que el contenido pueda salir del producto y volver a entrar sin quedar atrapado.

> Leer `README.md` de esta carpeta antes de usar este documento.

---

## IO-01 · Debe permitir exportar una página a Markdown

**Cómo probarlo:** exporta una página con encabezados, listas, tabla, imagen y una mención.

- [x] Hay una opción de exportar en el menú de la página
- [x] Se descarga un archivo `.md`
- [x] Los encabezados salen como `#`, `##`, `###`
- [x] Las listas con viñetas y numeradas conservan su anidación
- [x] Las tareas salen como `- [ ]` y `- [x]` según su estado
- [x] Las citas salen como `>`
- [x] Los bloques de código conservan el lenguaje en la marca de apertura
- [x] Las tablas salen como tabla Markdown
- [x] Negrita, cursiva, código y tachado se conservan
- [x] Los enlaces conservan texto y destino
- [x] Las menciones a otras páginas salen como enlace con el título
- [ ] Las imágenes salen referenciadas y el archivo se incluye
- [x] Los diagramas salen como bloque de código con su lenguaje
- [ ] Las propiedades de la página salen al inicio del archivo
- [x] El archivo se llama como la página
- [ ] Un archivo exportado y vuelto a importar produce la misma página — no hay importación todavía

> Lo que Markdown no sabe decir sale como cerca `:::tipo{datos}` o como enlace
> con su propio destino, y un bloque que el esquema no conoce se conserva en vez
> de perderse. Comprobado en el navegador el 2026-08-21.

## IO-02 · Debe permitir exportar varias páginas de una vez

> **Un archivo por página.** Varias páginas salen en un comprimido cuyas
> carpetas son la jerarquía que tenían. Una colección sale siempre comprimida,
> porque cada fila es una página. Registrado en `docs/business-rules/` (FEA-PAG).

- [x] Se puede exportar una página **con todas sus subpáginas**
- [x] Se puede exportar un espacio completo
- [ ] Se pueden seleccionar varias páginas sueltas y exportarlas juntas — el modo selección ofrece mover y papelera, no exportar
- [x] Se descarga un comprimido con un archivo por página
- [x] Las carpetas del comprimido reflejan la jerarquía que tenían las páginas
- [ ] Una colección se exporta comprimida, con un archivo por fila — sale comprimida por ser varias páginas, pero no hay una acción de exportar desde la colección
- [ ] Los enlaces entre las páginas exportadas apuntan a los archivos exportados, no a la web
- [ ] Los archivos adjuntos se incluyen en el comprimido
- [ ] Se elige si se incluyen los adjuntos o solo el texto
- [ ] Una exportación grande no bloquea la interfaz: avisa cuando está lista
- [ ] Se indica el avance mientras se prepara
- [x] Solo se exporta lo que uno tiene permiso de ver

> Comprobado el 2026-08-22 contra la API: una página responde `text/markdown`;
> una rama y un espacio responden `application/zip`. El espacio de Engineering
> salió con 84 archivos en 10 carpetas, hasta tres niveles de hondo, con
> integridad correcta según `unzip -t`. Una página madre queda a la vez como
> archivo y como carpeta de sus hijas. Nueve hermanas llamadas igual reciben un
> número cada una en vez de pisarse. Un nombre con acento llega con su acento.

## IO-03 · Debe permitir exportar a otros formatos

- [ ] Se puede exportar a PDF
- [ ] Se puede exportar a HTML
- [ ] El PDF conserva encabezados, listas, tablas e imágenes
- [ ] El PDF no corta las tablas ni los diagramas por la mitad
- [ ] Se puede elegir el tamaño de página y la escala
- [ ] Se puede exportar a PDF incluyendo las subpáginas

## IO-04 · Debe permitir exportar una colección como datos

- [ ] Una colección se puede exportar a CSV
- [ ] Cada propiedad sale como columna
- [ ] Se exporta lo que muestra la vista actual, respetando filtros y orden
- [ ] Se puede elegir exportar todas las filas en vez de la vista filtrada
- [ ] Las fechas salen en un formato reconocible por una hoja de cálculo
- [ ] Las selecciones múltiples salen separadas de forma legible
- [ ] Los acentos y la ñ se leen bien al abrir el archivo

## IO-05 · Debe permitir copiar como Markdown

- [ ] Se puede copiar una página como Markdown al portapapeles
- [ ] Se puede copiar una selección de varios bloques como Markdown
- [ ] Lo copiado se pega correctamente en un editor de texto plano
- [ ] Lo copiado se pega correctamente en otra página de la app

## IO-06 · Debe permitir imprimir

- [ ] La página se imprime desde el navegador de forma legible
- [ ] No se imprimen el árbol lateral ni los botones
- [ ] Los bloques plegados se imprimen abiertos
- [ ] Las tablas anchas se ajustan al papel

## IO-07 · Debe permitir importar Markdown

- [ ] Se puede importar un archivo `.md` y queda como página
- [ ] Encabezados, listas, tareas, citas, código y tablas se convierten en bloques reales
- [ ] El formato en línea se conserva
- [ ] Se pueden importar varios archivos a la vez
- [ ] Una carpeta con subcarpetas conserva su jerarquía como páginas anidadas
- [ ] Se elige en qué espacio y bajo qué página entra lo importado
- [ ] Los enlaces entre los archivos importados quedan enlazando las páginas creadas

## IO-08 · Debe permitir importar datos a una colección

- [ ] Se puede importar un CSV como colección nueva
- [ ] Se puede importar un CSV a una colección existente
- [ ] Se muestra una previsualización antes de confirmar
- [ ] Se elige a qué propiedad corresponde cada columna
- [ ] Se detecta solo el tipo de cada columna y se puede corregir
- [ ] Se puede elegir qué columna es el título
- [ ] Las filas con errores se informan sin abortar toda la importación

## IO-09 · Debe permitir traer contenido de otras herramientas

- [ ] Se puede importar una exportación de Notion
- [ ] La jerarquía de páginas se conserva
- [ ] Las bases de datos de Notion llegan como colecciones
- [ ] Se puede importar HTML
- [ ] Se puede importar un documento de Word
- [ ] Las imágenes referenciadas se suben y quedan enlazadas

## IO-10 · Debe informar qué pasó al importar

- [ ] Se ve el avance mientras importa
- [ ] Al terminar se dice cuántas páginas se crearon
- [ ] Se listan los archivos que fallaron y por qué
- [ ] Se puede abrir directamente lo importado
- [ ] Una importación fallida no deja páginas a medio crear

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
