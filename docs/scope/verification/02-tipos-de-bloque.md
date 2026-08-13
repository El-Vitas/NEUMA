# 02 · Tipos de bloque

El catálogo. Qué tipos existen y qué hace cada uno por dentro.

> Leer `README.md` de esta carpeta antes de usar este documento.
>
> Lo que **todos** los tipos deben permitir —arrastrar, anidar, convertir, duplicar, comentar, enlazar— está en `01-bloques.md` y no se repite aquí. Cuando revises un tipo, prueba también esa lista sobre él.

---

## TB-01 · Párrafo

- [x] Es el tipo por defecto al escribir
- [x] Enter crea un párrafo nuevo separado
- [x] Shift+Enter hace un salto de línea dentro del mismo párrafo
- [x] Al escribir no aparece ningún fondo ni color que no se haya pedido
- [x] Un párrafo vacío indica que se puede escribir ahí, sin ensuciar la lectura

## TB-02 · Encabezados

- [x] `#`, `##`, `###` + espacio producen los tres niveles
- [x] Los tres se distinguen visualmente entre sí y del texto normal
- [x] Desde el menú `/` se puede elegir el nivel, no solo uno fijo
- [x] Un encabezado se puede volver plegable
- [x] Plegarlo oculta el contenido hasta el siguiente encabezado del mismo nivel
- [x] El estado plegado se conserva al navegar
- [ ] Al exportar o imprimir, lo plegado se incluye igual

## TB-03 · Lista con viñetas

- [x] `-`, `*` o `+` + espacio inician la lista
- [x] Enter crea el siguiente punto
- [x] Enter en un punto vacío sale de la lista
- [x] Tab y Shift+Tab anidan y desanidan
- [x] Los niveles anidados se ven distintos entre sí

## TB-04 · Lista numerada

- [x] `1.` + espacio inicia la lista
- [x] La numeración continúa sola
- [x] Empezar en otro número respeta ese inicio
- [x] Al anidar, la numeración interior reinicia
- [x] Insertar un punto en el medio renumera lo que sigue

## TB-05 · Lista de tareas

- [x] `[]` + espacio crea una casilla marcable
- [x] Un clic marca y desmarca
- [x] El texto marcado se distingue del no marcado
- [x] El estado sobrevive al recargar
- [x] Enter crea la siguiente tarea
- [x] Se pueden anidar tareas dentro de tareas
- [ ] Si otra persona marca una casilla, se ve sin recargar

## TB-06 · Bloque plegable

- [x] Se inserta desde el menú `/`
- [x] El triángulo lo abre y lo cierra
- [x] Se puede escribir su título
- [x] Admite otros bloques dentro, no solo texto
- [x] Cerrado, oculta su contenido por completo
- [x] El estado abierto/cerrado no se pierde de forma molesta al navegar

## TB-07 · Cita

- [x] `>` + espacio la crea
- [x] Se distingue visualmente del párrafo
- [x] Se puede salir y seguir escribiendo normal

## TB-08 · Separador

- [x] `---` crea la línea divisoria
- [x] También se inserta desde el menú `/`
- [x] Se elimina con retroceso
- [x] Ocupa su propia línea sin interrumpir lo que sigue

## TB-09 · Bloque destacado

- [x] Se inserta desde el menú `/`
- [x] Tiene un ícono a la izquierda que se puede cambiar
- [x] El color de fondo se puede cambiar
- [x] Admite varias líneas y otros bloques dentro
- [x] Se distingue claramente de una cita

## TB-10 · Bloque de código

- [x] Se inserta desde el menú `/` y con ` ``` ` + espacio
- [x] Se puede elegir el lenguaje
- [ ] El código se colorea según el lenguaje
- [x] Enter hace salto de línea, no sale del bloque
- [x] Tab indenta en vez de mover el foco
- [x] Hay un botón para copiar el contenido
- [x] El texto no se reformatea ni se autocorrige dentro
- [x] Se puede alternar el ajuste de línea

## TB-11 · Tabla simple

- [x] Se inserta desde el menú `/`
- [x] Se escribe en cada celda y Tab avanza a la siguiente
- [x] Se pueden agregar y eliminar filas y columnas después de creada
- [x] La primera fila puede marcarse como encabezado
- [ ] Se puede ajustar el ancho de columna
- [x] Una tabla ancha se desplaza dentro de sí misma sin romper la página
- [ ] Una tabla simple se puede convertir en colección conservando sus datos

## TB-12 · Imagen

- [x] Se sube desde el menú `/`, arrastrando el archivo, o pegando
- [x] Mientras sube se ve el progreso
- [x] Si falla se explica por qué
- [x] Se puede redimensionar y alinear a izquierda, centro o derecha
- [x] Se puede poner a ancho completo
- [x] Admite leyenda y texto alternativo
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
| 13/08/2026 | TB-12 | Solo se podía subir por el clip, y la imagen no admitía nada más: se agregaron al contrato dónde se para y cuánto ocupa, la entrada «Imagen» en el menú `/`, y pegar desde el portapapeles. La línea escrita bajo la imagen es a la vez su leyenda y el texto que se lee a quien no la ve: pedir la misma frase dos veces es como una página termina con leyenda y sin texto alternativo. El ancho se arrastra desde el borde y se guarda como parte de la página, no en píxeles. Queda sin marcar solo la mitad de una casilla: sigue visible al recargar (probado), pero «para otra persona» depende de la colaboración en vivo, documento `06`. | 6 de 7 |
| 13/08/2026 | TB-11 | La tabla era una sola celda sin encabezados, `Tab` sacaba el foco de la página y no había forma de agregar ni quitar filas o columnas. Se adoptó `prosemirror-tables` (autorizado) con estas decisiones de interacción: se inserta 3×3 con encabezado y el cursor en la primera celda, `Tab` recorre las celdas y en la última agrega fila, y la tabla se desplaza dentro de su propia caja sin arrastrar la página. El encabezado siempre es la primera fila, se abra el menú donde se abra. Falta que El-Vitas pruebe a mano el arrastre del borde de columna, y lo de convertir en colección, que es del documento `05`. | 5 de 7 |
| 13/08/2026 | TB-10 | Faltaba casi todo salvo Enter y que no se reformatee dentro: se agregaron ` ``` ` + espacio (con el lenguaje escrito ahí mismo), la elección de lenguaje, el botón de copiar, el ajuste de línea y que `Tab` indente en vez de sacar el foco de la página. Queda sin marcar el coloreado según el lenguaje: necesita una biblioteca nueva y las dependencias no se tocan sin instrucción. | 7 de 8 |
| 13/08/2026 | TB-09 | Faltaba la marca de la izquierda, que no existía. Se agregó al contrato como el **tipo** de aviso (idea, información, advertencia, listo, bloqueado, fijado) y no como el símbolo: la página dice lo mismo para todos, y cada quien ve el dibujo que le toque. Se elige desde el menú del bloque, junto al color, que ya funcionaba. | 5 de 5 |
| 13/08/2026 | TB-08 | El separador no existía en ninguna parte: se agregó al contrato (`divider`), al editor, al menú `/` y a `---`. Como la línea no sostiene nada, insertarla al final de la página deja un párrafo debajo para seguir escribiendo. De paso se corrigió que un bloque que no sostiene nada, llegando con contenido, rompía la validación con un error técnico en vez de rechazarla. | 4 de 4 |
| 13/08/2026 | TB-07 | Faltaba solo empezarla escribiendo: `>` + espacio no hacía nada porque no existía la regla. El resto ya estaba: se distingue del párrafo por su barra y su color, y dos Enter salen de ella. | 3 de 3 |
| 13/08/2026 | TB-06 | El título no se podía escribir: estaba dentro de un `<summary>`, que se queda el foco, y ninguna tecla llegaba. Tampoco servía escribirlo como contenido del editor —el teclado responde a quien tiene el foco y el editor lee cada tecla como escritura en la página—, así que el título pasó a ser un campo propio y la flecha, un botón de verdad. Lo demás ya funcionaba; el bloque se dibuja sin `<details>` y lo que sostiene se sangra bajo el título. | 6 de 6 |
| 13/08/2026 | TB-05 | Faltaban tres cosas, las tres hechas: `[]` + espacio no creaba nada, Enter partía el párrafo en vez de dar otra tarea (y la nueva nace sin marcar aunque la anterior esté hecha), y marcar una tarea tachaba también las que colgaban de ella. Queda sin marcar que se vea lo que marca otra persona: dos clientes conectados a la misma página no se ven entre sí —ni el texto ni la presencia—, aunque cada uno guarda bien contra el documento compartido. Eso es la capa colaborativa, documento `06`. | 6 de 7 |
| 13/08/2026 | TB-04 | No faltó nada: numera sola, empezar en `5.` respeta el inicio y sobrevive a la recarga, intercalar un punto renumera lo que sigue, y al anidar la numeración interior reinicia en `a.`. Anidar quedó disponible con lo hecho en TB-03. | 5 de 5 |
| 13/08/2026 | TB-03 | Faltaba anidar: `Tab` usaba la anidación general, que dentro de una lista lee la lista entera y no hacía nada. Ahora un punto cuelga del punto de arriba, y los tres niveles se distinguen por su marca (punto, círculo, cuadrado). Probado en el navegador, con guardado y recarga. | 5 de 5 |
| 13/08/2026 | TB-02 | Se repitió la prueba del plegado sobre una página nueva: sobrevive a recargar y a navegar, plegado y desplegado. No era la capa colaborativa: el backend tenía el contrato viejo en memoria y rechazaba el guardado con 400. Queda sin marcar solo lo de exportar, que no existe en el producto (documento `09`). | 6 de 7 |
| 13/08/2026 | TB-02 | Faltaban los tres niveles en el menú `/` (estaba fijo en 2) y el encabezado plegable, ambos implementados. Quedan sin marcar: que el plegado sobreviva a la recarga (se guarda `collapsed: true` y sale el POST, pero vuelve en `false` — se sospecha de la capa colaborativa, misma zona que CL-01) y lo de exportar, que no existe en el producto (documento `09`). | 5 de 7 |
| 13/08/2026 | TB-01 | Faltaban `Shift+Enter` (no existía el nodo `hard_break` en el contrato) y la invitación a escribir en un párrafo vacío. Ambas implementadas y probadas en el navegador. | 5 de 5 |
