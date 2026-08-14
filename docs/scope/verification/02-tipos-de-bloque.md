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

- [x] Se inserta en el punto exacto donde está el cursor
- [x] Muestra nombre, tipo y peso
- [x] Se descarga con un clic
- [ ] Al eliminarlo desaparece también de la lista de adjuntos de la página
- [ ] Quien no tiene acceso a la página tampoco puede descargarlo

## TB-14 · Video y audio

- [x] Se puede subir un video y se reproduce dentro de la página
- [x] Se puede subir un audio y se reproduce dentro de la página
- [ ] Se puede pegar el enlace de un video externo
- [x] Los controles de reproducción funcionan
- [x] El reproductor de video se puede redimensionar

## TB-15 · PDF

- [x] Se sube y se ve incrustado
- [x] Se pasa de página dentro del visor
- [x] Se puede descargar y abrir a pantalla completa

## TB-16 · Incrustados y marcadores

- [x] Se incrusta YouTube, Vimeo, Loom y Figma, y se reproduce dentro
- [x] Pegar un enlace ofrece elegir entre enlace simple, tarjeta o incrustado
- [x] Un enlace cualquiera se puede mostrar como tarjeta con título e ícono
- [x] Una URL no permitida se rechaza con un mensaje claro
- [x] Una vista previa que no se puede obtener degrada a enlace simple

## TB-17 · Diagramas

**Cómo probarlo:** inserta un bloque de diagrama y pega un `flowchart` de Mermaid.

- [x] Se inserta desde el menú `/`
- [x] Escribir código Mermaid lo dibuja
- [x] Soporta flujo, secuencia, Gantt, clases, estados, entidad-relación, mapa mental y pastel
- [x] Se alterna entre código, dibujo, y ambos lado a lado
- [x] El dibujo se actualiza mientras se escribe
- [x] Un error de sintaxis se explica con la línea, sin romper la página
- [x] Se amplía a pantalla completa, con acercar y desplazar
- [x] Se puede copiar el código y descargar el dibujo como imagen
- [x] Un diagrama ancho se desplaza dentro de su bloque
- [x] Se lee bien en modo claro y en oscuro
- [ ] Otra persona ve el dibujo, no el código

## TB-18 · Fórmulas

- [x] Se inserta una fórmula como bloque
- [x] Se renderiza, no queda como texto crudo
- [x] Se puede volver a editar una ya insertada

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
| 14/08/2026 | TB-18 | Las fórmulas no existían. Se siguió la misma decisión que con los diagramas, que es la que ya estaba probada: una fórmula es un bloque de código escrito en el lenguaje en que se escriben las fórmulas desde hace cincuenta años, así que lo que la página guarda es el texto —se busca, se copia, se corrige, y sigue siendo una fórmula aunque mañana la componga otro— y hereda sin escribir nada los tres modos (solo la fórmula, solo el código, ambos), copiar, pantalla completa, el aviso con su línea cuando está mal escrita, y volver a componerse sola al cambiar de claro a oscuro. Los nombres de los modos cambian con lo que hay en la caja: donde un diagrama dice «dibujo», una fórmula dice «fórmula». Descargar no se ofrece, porque una fórmula no es un dibujo que se pueda guardar aparte. Las letras con que se componen viajan con la página, así que una fórmula se ve igual en una máquina sin salida a internet. Probado en el navegador: insertada desde el menú `/`, compuesta —integral, sumatoria, raíz y fracción—, corregida después y conservada al recargar. | 3 de 3 |
| 14/08/2026 | TB-17 | El diagrama no existía. Siguiendo a Outline no se creó un tipo nuevo: un diagrama es un bloque de código escrito en el lenguaje de los diagramas, de modo que lo que la página guarda es el texto —se busca, se copia y una versión que no sepa dibujar lo conserva entero— y el dibujo se deriva de él en cada visita, nunca se guarda. Se dibuja cuando la escritura se asienta y no en cada tecla, porque un diagrama a medio escribir es casi siempre un error de sintaxis y redibujarlo hace parpadear la página a quien escribe. Se puede ver solo el dibujo, solo el código o los dos, y esa elección se guarda con la página. Un error se explica con su línea, dentro del bloque, sin tumbar la página; lo mismo al pasar un bloque de código cualquiera al lenguaje de diagramas. Se puede copiar el código —con aviso de que se copió— y bajar el dibujo, que se guarda como dibujo y no como fotografía. El dibujo se colorea para el fondo sobre el que se lee y se vuelve a dibujar solo al cambiar entre claro y oscuro: uno dejado en los colores de la noche es ilegible de día y a nadie se le ocurre reescribirlo para arreglarlo. Dos cosas aparecieron al probarlo: el dibujo se encogía hasta caber en la columna —un diagrama de siete pasos quedaba a la mitad de su tamaño y no se leía—, así que ahora se muestra al tamaño en que fue dibujado y es su propia caja la que se desplaza; y lo que se lleva a pantalla completa se puede acercar con la rueda y arrastrar para recorrerlo, que era lo que faltaba de esa casilla. Probados en pantalla los ocho: flujo, secuencia, Gantt, clases, estados, entidad-relación, mapa mental y pastel. Después se recorrieron todas las familias que el motor conoce, y aparecieron dos cosas más. Una: los diagramas de bloques no se dibujaban nunca, y no por lo que estuviera escrito —el motor convierte el diagrama entero a texto para una nota suya, ese diagrama alcanza la raíz de la página, y lo que la interfaz cuelga ahí se apunta a sí mismo, de modo que la conversión no termina nunca; se dejó eso fuera de lo que se recorre y volvieron a dibujarse. Dos: lo que no viene con el motor se le agregó —las estampas de las cosas conocidas y las de uso general, un segundo modo de repartir un grafo para los que el ordinario amontona, y la única familia que se distribuye aparte—, y las estampas viajan con la página, de manera que nombrar una en un diagrama nunca es preguntarle nada a un servidor ajeno. Un diagrama puede además fijar su propio tema, y se respeta. Después se recorrió el catálogo entero mirando cada dibujo, y de ahí salieron cinco cosas más. La primera, y la que importa: un diagrama podía hacer que el navegador de quien lo lee le pidiera una imagen a un servidor ajeno —una etiqueta con una imagen, o un estilo propio con una dirección dentro—, lo que convierte cualquier página en un soplón de quién la está leyendo; limpiar el dibujo terminado llegaba tarde, porque el motor lo pone en la página un instante para medirlo, así que ahora se limpia lo escrito antes de dibujar y el dibujo después, y no sale ni una petición. Las otras cuatro son de lectura: el texto se salía de su recuadro porque se medía con una tipografía y se dibujaba con otra; las etiquetas de las flechas venían con un fondo gris que no se lee; dos familias —el árbol y el de sistemas— están dibujadas para papel blanco y escriben en negro sobre negro; y un diagrama grande se encogía hasta ser ilegible, así que ahora se muestra al tamaño en que fue dibujado, se desplaza, y ofrece ajustarse a la caja para verlo entero de una mirada. De paso apareció que treinta y cinco diagramas dibujándose a la vez se pisan la configuración entre ellos, y ahora se dibujan en fila. Queda sin marcar que otra persona vea el dibujo y no el código: depende de la colaboración en vivo, documento `06`. | 10 de 11 |
| 14/08/2026 | TB-16 | El contrato conocía los incrustados, pero el editor los dibujaba como un `div` vacío y no había forma de crear ninguno. Siguiendo a Outline, cada servicio se muestra en la dirección con que él mismo lo reproduce —`watch?v=` se ve en `embed/`— y a Figma se le entrega la dirección entera. Pegar un enlace ahora lo escribe como enlace y ofrece las tres formas —enlace, tarjeta, incrustar—, de modo que seguir escribiendo deja lo que se pegó. La tarjeta es un tipo nuevo (`bookmark`) que guarda lo que se leyó del enlace en vez de volver a preguntarlo: una página tiene que leerse igual mañana. Lo que dice un enlace de sí mismo lo pregunta el servidor y nunca el navegador, solo por https y leyendo unas pocas líneas. Un enlace que no se puede incrustar y uno del que no se pudo leer nada se dejan como enlace, cada uno con su aviso. De paso apareció que el editor deja poner bloques donde el contrato no los acepta —un incrustado dentro de una cita rompía el guardado—: ahora el bloque sube hasta donde sí cabe, preguntándole al propio contrato. Probado en el navegador: YouTube y Figma incrustados, tarjeta de `example.com` que sobrevive a la recarga, y los dos rechazos. Las tres formas dejaron de vivir solo en el instante de pegar: el menú del bloque ofrece **Qué hacer con el enlace** sobre un enlace, una tarjeta o un incrustado, y aplica la elección al bloque vivo —antes recordaba el de cuando se abrió el menú y, si la selección se había movido, la elección se perdía en silencio y parecía lentitud—. Se agregó también escribir un enlace como se escribe en todas partes, `[nombre](url)`, y que un enlace se vea como enlace, que no se veía. Del título: YouTube escribe el suyo pasado el carácter seiscientos mil y solo se leían los primeros 512 KB, así que la tarjeta caía al nombre del sitio; ahora se leen hasta 2 MB. De la descripción: la que YouTube entrega a quien pide la página sin sesión es de otro video, así que se dejó de leer —una tarjeta que cita algo falso es peor que una que no cita nada— y se guardan solo el nombre y el ícono. | 5 de 5 |
| 14/08/2026 | TB-15 | El PDF solo era una línea para bajarlo. Siguiendo a Outline no se creó un tipo nuevo: es el mismo adjunto, dibujado como documento cuando lo es, con el visor del propio navegador —que pasa páginas, guarda e imprime sin que haya que construirlo—. Tres cosas lo impedían: el servidor entregaba todo como algo que se guarda (ahora un documento viaja `inline`, y el resto sigue viajando para guardarse), el portal negaba con `X-Frame-Options: DENY` el marco que el visor necesita (ahora se permite solo para los adjuntos y solo desde el mismo origen), y el visor se comía el puntero, con lo que ni aparecía la manija del bloque (ahora no escucha hasta que el bloque se elige, como en Outline). Se agregó **Mostrar como** —documento o archivo— porque el mismo PDF es algo que se lee en una página y algo que se guarda en otra; la opción no se ofrece donde no puede cumplirse. De paso: subir algo con un bloque seleccionado lo reemplazaba —se perdía lo que había—, ahora se inserta debajo; y el menú del bloque se abría arriba del bloque, lejos de la manija que lo abrió y fuera de la pantalla en bloques altos: ahora abre a la altura de sus botones. | 3 de 3 |
| 14/08/2026 | TB-14 | Ni el video ni el audio existían: se agregaron al contrato (`video` y `audio`, ambos con ancho), al editor y al reparto de lo que se sube, y el servidor pasó a aceptar mp4, webm, mpeg, ogg y wav. Nada de esto se guardaba: a un bloque que no sostiene nada se le estaba escribiendo contenido vacío y el contrato lo rechazaba —el mismo tropiezo del separador, ahora con una prueba que lo fija. Los controles del navegador se reemplazaron por los propios (reproducir, punto de reproducción, tiempo, silencio, pantalla completa), dibujados con los colores y los trazos de la casa, sobre el mismo `<video>`/`<audio>` de siempre. Ninguno de los dos se podía saltar hacia adelante: el servidor entregaba el archivo entero y desoía la pregunta por un trozo, así que se implementó la respuesta por rangos y el portal la deja pasar. Un reproductor sin ancho propio toma la columna, pero un video nunca se estira más allá de su propia resolución; los dos se ajustan desde el borde, que ahora es el mismo arrastre que el de la imagen. Tampoco podían moverse dentro de su columna, siempre pegados a la izquierda: la alineación dejó de ser cosa de la imagen y pasó a ser de cualquier bloque que no sea escritura (`PAGE_BLOCK_ALIGNMENTS`), así que un video o una grabación se paran a la izquierda, al centro, a la derecha o a lo ancho, y se guarda con la página. Queda sin marcar pegar el enlace de un video externo: eso es incrustar, del TB-16. | 4 de 5 |
| 13/08/2026 | TB-13 | El bloque solo mostraba el nombre: se agregaron al contrato el tipo y el peso del archivo, que ya venían al subirlo, y ahora se leen como se los nombra (TXT, PDF) en vez de como se envían (`text/plain`). El enlace baja el archivo de un clic, con su nombre original. Quedan dos: **eliminar el bloque no lo quita de la lista de adjuntos** —hacerlo implica borrar el archivo del servidor al deshacer una edición, y esa decisión no la tomo solo—, y que quien no tiene acceso no pueda descargarlo, del que está probado que sin sesión responde 401 y que el servicio niega la descarga sin permiso, pero falta la prueba con un segundo usuario. | 3 de 5 |
| 13/08/2026 | TB-12 | Solo se podía subir por el clip, y la imagen no admitía nada más: se agregaron al contrato dónde se para y cuánto ocupa, la entrada «Imagen» en el menú `/`, y pegar desde el portapapeles. La línea escrita bajo la imagen es a la vez su leyenda y el texto que se lee a quien no la ve: pedir la misma frase dos veces es como una página termina con leyenda y sin texto alternativo. El ancho se arrastra desde el borde y se guarda como parte de la página, no en píxeles. Queda sin marcar solo la mitad de una casilla: sigue visible al recargar (probado), pero «para otra persona» depende de la colaboración en vivo, documento `06`. | 6 de 7 |
| 13/08/2026 | TB-11 | La tabla era una sola celda sin encabezados, `Tab` sacaba el foco de la página y no había forma de agregar ni quitar filas o columnas. Se adoptó `prosemirror-tables` (autorizado) y las decisiones de interacción de Outline: se inserta 3×3 con encabezado y el cursor en la primera celda, `Tab` recorre las celdas y en la última agrega fila, y la tabla se desplaza dentro de su propia caja sin arrastrar la página. El encabezado siempre es la primera fila, se abra el menú donde se abra. Falta que El-Vitas pruebe a mano el arrastre del borde de columna, y lo de convertir en colección, que es del documento `05`. | 5 de 7 |
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
