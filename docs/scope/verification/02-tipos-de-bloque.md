# 02 · Tipos de bloque

El catálogo. Qué tipos existen y qué hace cada uno por dentro.

> Leer `README.md` de esta carpeta antes de usar este documento.
>
> Lo que **todos** los tipos deben permitir —arrastrar, anidar, convertir, duplicar, comentar, enlazar— está en `01-bloques.md` y no se repite aquí. Cuando revises un tipo, prueba también esa lista sobre él.

---

## TB-01 · Párrafo

- [ ] Es el tipo por defecto al escribir
- [ ] Enter crea un párrafo nuevo separado
- [ ] Shift+Enter hace un salto de línea dentro del mismo párrafo
- [ ] Al escribir no aparece ningún fondo ni color que no se haya pedido
- [ ] Un párrafo vacío indica que se puede escribir ahí, sin ensuciar la lectura

## TB-02 · Encabezados

- [ ] `#`, `##`, `###` + espacio producen los tres niveles
- [ ] Los tres se distinguen visualmente entre sí y del texto normal
- [ ] Desde el menú `/` se puede elegir el nivel, no solo uno fijo
- [ ] Un encabezado se puede volver plegable
- [ ] Plegarlo oculta el contenido hasta el siguiente encabezado del mismo nivel
- [ ] El estado plegado se conserva al navegar
- [ ] Al exportar o imprimir, lo plegado se incluye igual

## TB-03 · Lista con viñetas

- [ ] `-`, `*` o `+` + espacio inician la lista
- [ ] Enter crea el siguiente punto
- [ ] Enter en un punto vacío sale de la lista
- [ ] Tab y Shift+Tab anidan y desanidan
- [ ] Los niveles anidados se ven distintos entre sí

## TB-04 · Lista numerada

- [ ] `1.` + espacio inicia la lista
- [ ] La numeración continúa sola
- [ ] Empezar en otro número respeta ese inicio
- [ ] Al anidar, la numeración interior reinicia
- [ ] Insertar un punto en el medio renumera lo que sigue

## TB-05 · Lista de tareas

- [ ] `[]` + espacio crea una casilla marcable
- [ ] Un clic marca y desmarca
- [ ] El texto marcado se distingue del no marcado
- [ ] El estado sobrevive al recargar
- [ ] Enter crea la siguiente tarea
- [ ] Se pueden anidar tareas dentro de tareas
- [ ] Si otra persona marca una casilla, se ve sin recargar

## TB-06 · Bloque plegable

- [ ] Se inserta desde el menú `/`
- [ ] El triángulo lo abre y lo cierra
- [ ] Se puede escribir su título
- [ ] Admite otros bloques dentro, no solo texto
- [ ] Cerrado, oculta su contenido por completo
- [ ] El estado abierto/cerrado no se pierde de forma molesta al navegar

## TB-07 · Cita

- [ ] `>` + espacio la crea
- [ ] Se distingue visualmente del párrafo
- [ ] Se puede salir y seguir escribiendo normal

## TB-08 · Separador

- [ ] `---` crea la línea divisoria
- [ ] También se inserta desde el menú `/`
- [ ] Se elimina con retroceso
- [ ] Ocupa su propia línea sin interrumpir lo que sigue

## TB-09 · Bloque destacado

- [ ] Se inserta desde el menú `/`
- [ ] Tiene un ícono a la izquierda que se puede cambiar
- [ ] El color de fondo se puede cambiar
- [ ] Admite varias líneas y otros bloques dentro
- [ ] Se distingue claramente de una cita

## TB-10 · Bloque de código

- [ ] Se inserta desde el menú `/` y con ` ``` ` + espacio
- [ ] Se puede elegir el lenguaje
- [ ] El código se colorea según el lenguaje
- [ ] Enter hace salto de línea, no sale del bloque
- [ ] Tab indenta en vez de mover el foco
- [ ] Hay un botón para copiar el contenido
- [ ] El texto no se reformatea ni se autocorrige dentro
- [ ] Se puede alternar el ajuste de línea

## TB-11 · Tabla simple

- [ ] Se inserta desde el menú `/`
- [ ] Se escribe en cada celda y Tab avanza a la siguiente
- [ ] Se pueden agregar y eliminar filas y columnas después de creada
- [ ] La primera fila puede marcarse como encabezado
- [ ] Se puede ajustar el ancho de columna
- [ ] Una tabla ancha se desplaza dentro de sí misma sin romper la página
- [ ] Una tabla simple se puede convertir en colección conservando sus datos

## TB-12 · Imagen

- [ ] Se sube desde el menú `/`, arrastrando el archivo, o pegando
- [ ] Mientras sube se ve el progreso
- [ ] Si falla se explica por qué
- [ ] Se puede redimensionar y alinear a izquierda, centro o derecha
- [ ] Se puede poner a ancho completo
- [ ] Admite leyenda y texto alternativo
- [ ] Sigue visible al recargar y para otra persona

## TB-13 · Archivo adjunto

- [ ] Se inserta en el punto exacto donde está el cursor
- [ ] Muestra nombre, tipo y peso
- [ ] Se descarga con un clic
- [ ] Al eliminarlo desaparece también de la lista de adjuntos de la página
- [ ] Quien no tiene acceso a la página tampoco puede descargarlo

## TB-14 · Video y audio

- [ ] Se puede subir un video y se reproduce dentro de la página
- [ ] Se puede subir un audio y se reproduce dentro de la página
- [ ] Se puede pegar el enlace de un video externo
- [ ] Los controles de reproducción funcionan
- [ ] El reproductor de video se puede redimensionar

## TB-15 · PDF

- [ ] Se sube y se ve incrustado
- [ ] Se pasa de página dentro del visor
- [ ] Se puede descargar y abrir a pantalla completa

## TB-16 · Incrustados y marcadores

- [ ] Se incrusta YouTube, Vimeo, Loom y Figma, y se reproduce dentro
- [ ] Pegar un enlace ofrece elegir entre enlace simple, tarjeta o incrustado
- [ ] Un enlace cualquiera se puede mostrar como tarjeta con título e ícono
- [ ] Una URL no permitida se rechaza con un mensaje claro
- [ ] Una vista previa que no se puede obtener degrada a enlace simple

## TB-17 · Diagramas

**Cómo probarlo:** inserta un bloque de diagrama y pega un `flowchart` de Mermaid.

- [ ] Se inserta desde el menú `/`
- [ ] Escribir código Mermaid lo dibuja
- [ ] Soporta flujo, secuencia, Gantt, clases, estados, entidad-relación, mapa mental y pastel
- [ ] Se alterna entre código, dibujo, y ambos lado a lado
- [ ] El dibujo se actualiza mientras se escribe
- [ ] Un error de sintaxis se explica con la línea, sin romper la página
- [ ] Se amplía a pantalla completa, con acercar y desplazar
- [ ] Se puede copiar el código y descargar el dibujo como imagen
- [ ] Un diagrama ancho se desplaza dentro de su bloque
- [ ] Se lee bien en modo claro y en oscuro
- [ ] Otra persona ve el dibujo, no el código

## TB-18 · Fórmulas

- [ ] Se inserta una fórmula como bloque
- [ ] Se renderiza, no queda como texto crudo
- [ ] Se puede volver a editar una ya insertada

## TB-19 · Índice de la página

- [ ] Lista los encabezados de la página
- [ ] Se actualiza solo al cambiarlos
- [ ] Al hacer clic, la página se desplaza a ese encabezado
- [ ] Refleja la jerarquía con indentación

## TB-20 · Columnas

- [ ] Se puede dividir una zona en dos columnas y agregar más
- [ ] Se puede arrastrar un bloque de una columna a otra
- [ ] Se ajusta el ancho relativo de cada columna
- [ ] En pantalla angosta las columnas se apilan

## TB-21 · Subpágina

- [ ] Desde `/` se crea una página hija en el punto del cursor
- [ ] Aparece en el cuerpo como enlace con su título
- [ ] Al hacer clic se abre esa página
- [ ] Aparece anidada en el árbol lateral
- [ ] Cambiar su título actualiza cómo se ve en el padre
- [ ] Eliminar el bloque no borra la página hija en silencio

## TB-22 · Enlace a una página existente

- [ ] Desde `/` se inserta un enlace a una página que ya existe
- [ ] Se busca escribiendo el título
- [ ] Se ve con el ícono y el título de esa página
- [ ] Si la página cambia de título, el enlace lo refleja
- [ ] Se distingue de una subpágina creada aquí

## TB-23 · Colección

Una colección es un bloque más. Su comportamiento interno —propiedades, vistas, filtros— está en `05-colecciones-propiedades-vistas.md`.

- [ ] Se inserta una colección desde el menú `/` en medio del contenido
- [ ] Convive con texto arriba y abajo
- [ ] Se puede arrastrar como cualquier otro bloque
- [ ] Se puede anidar dentro de un plegable o una columna
- [ ] Se puede insertar una vista de una colección que vive en otra parte
- [ ] Se puede convertir entre colección incrustada y página completa
- [ ] Se puede duplicar y eliminar como cualquier bloque

## TB-24 · Bloque sincronizado

- [ ] Un mismo bloque puede aparecer en dos páginas
- [ ] Editarlo en una lo actualiza en la otra
- [ ] Se ve que ese bloque es sincronizado
- [ ] Se puede romper la sincronización y dejar una copia independiente

## TB-25 · Botón

- [ ] Se inserta un botón que crea contenido predefinido
- [ ] Se configura qué bloques agrega y dónde
- [ ] Puede crear una fila en una colección en vez de bloques
- [ ] Al pulsarlo el contenido aparece de inmediato
- [ ] Su configuración se puede editar después

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
