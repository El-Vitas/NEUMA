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

- [x] Lista los encabezados de la página
- [x] Se actualiza solo al cambiarlos
- [x] Al hacer clic, la página se desplaza a ese encabezado
- [x] Refleja la jerarquía con indentación

## TB-20 · Columnas

- [x] Se puede dividir una zona en dos columnas y agregar más
- [x] Se puede arrastrar un bloque de una columna a otra
- [x] Se ajusta el ancho relativo de cada columna
- [x] En pantalla angosta las columnas se apilan

## TB-21 · Subpágina

- [x] Desde `/` se crea una página hija en el punto del cursor
- [x] Aparece en el cuerpo como enlace con su título
- [x] Al hacer clic se abre esa página
- [x] Aparece anidada en el árbol lateral
- [x] Cambiar su título actualiza cómo se ve en el padre
- [x] Eliminar el bloque no borra la página hija en silencio

## TB-22 · Enlace a una página existente

- [x] Desde `/` se inserta un enlace a una página que ya existe
- [x] Se busca escribiendo el título
- [x] Se ve con el ícono y el título de esa página
- [x] Si la página cambia de título, el enlace lo refleja
- [x] Se distingue de una subpágina creada aquí

## TB-23 · Colección

Una colección es un bloque más. Su comportamiento interno —propiedades, vistas, filtros— está en `05-colecciones-propiedades-vistas.md`.

- [x] Se inserta una colección desde el menú `/` en medio del contenido
- [x] Convive con texto arriba y abajo
- [x] Se puede arrastrar como cualquier otro bloque
- [x] Se puede anidar dentro de un plegable o una columna
- [x] Se puede insertar una vista de una colección que vive en otra parte
- [x] Se puede convertir entre colección incrustada y página completa
- [x] Se puede duplicar y eliminar como cualquier bloque

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
| 14/08/2026 | TB-23 | El contrato conocía la colección incrustada y el editor sabía dibujarla, pero no había forma de poner una: se agregaron dos entradas al menú `/`, «Colección» y «Colección de otra parte». Una colección es una página con forma, así que se crea igual que una página —de un tirón, página y forma juntas, porque una página que iba a ser colección y quedó sin forma es indistinguible de una cualquiera— y empieza con lo mínimo: el nombre, que es el título de la página que cada fila es, y una columna propia. Nada de columnas adivinadas. La otra entrada muestra una colección que vive en otra parte: se elige la página de una lista y, si esa página no es una colección, se dice en vez de dejar un hueco. Se agregó también cambiar entre las dos formas de nombrar una página —mantener la colección a la vista o dejar solo el enlace— desde el menú del bloque, y volver a la colección pregunta si la página sigue siéndolo, porque una forma se puede quitar mucho después de escrito el bloque. Probado en el navegador lo siete: insertada en medio del texto y conservada al recargar, con texto arriba y abajo, arrastrada como cualquier bloque, metida en una columna y después dentro de un plegable, la de otra parte —«Tasks»— mostrada con sus columnas reales, ida y vuelta entre colección y enlace, y duplicada y eliminada. Tres cosas aparecieron al probarlo. Una del guardado: lo que se inserta queda seleccionado, así que la primera tecla lo reemplazaba y el bloque se perdía en silencio; ahora se deja dónde seguir escribiendo debajo, como ya hacía el separador. Otra de la pantalla: dos colecciones iguales en una página —o una sola, por un instante, mientras se arrastra— se dibujaban con el mismo nombre, y el navegador se quejaba de dos cosas llamadas igual; ahora cada sitio donde se dibuja una colección tiene nombre propio. Y dos de lectura: la colección incrustada repetía el encabezado «Filas» que una colección lleva en su propia página, cuando aquí la sección es la escritura alrededor —ahora dice de qué colección es y por qué vista se la está mirando, y lleva a ella—; y su tabla salía con las columnas encimadas, porque las reglas de la tabla de la página —columnas de ancho fijo, arrastrables— caían sobre cualquier tabla dibujada dentro de la escritura: ahora esas reglas son de la tabla de la página y la de una colección se acomoda a lo que tiene. | 7 de 7 |
| 14/08/2026 | TB-22 | Nombrar una página ya escrita existía a medias: se hacía con `@` en medio de la frase, se veía como un enlace cualquiera —sin decir que lo enlazado es una página— y decía el nombre copiado el día en que se insertó, de modo que renombrar la página dejaba el enlace mintiendo. Ahora guarda solo qué página es y pregunta el nombre cada vez, igual que la subpágina; el nombre viejo queda de respaldo para una página que no se pueda leer desde aquí, por ejemplo la de otro espacio. Se le puso delante la marca de una página, que es lo que dice qué clase de cosa se está nombrando. Se agregó al menú `/`, que es donde la gente busca todo lo demás: elegirlo escribe el `@` y abre la misma búsqueda, para no tener dos maneras distintas de buscar lo mismo. De paso quedó claro que la búsqueda no encontraba nada porque el proyector del índice de búsqueda es un proceso aparte que no estaba corriendo; con él andando, buscar por título encuentra. Los dos quedan bien distintos: el enlace vive dentro de la frase, subrayado y en el color de los enlaces; la subpágina ocupa su línea y se lee como parte de la página, sin subrayado hasta que se le pasa el puntero —para eso hubo que sacarla de la regla que subraya todo enlace escrito entre las palabras, junto a la tarjeta y el documento, que también se dibujan solos. | 5 de 5 |
| 14/08/2026 | TB-21 | La subpágina no existía: no había forma de crear una página hija desde la escritura. Se agregó como bloque propio (`subpage`), y no como una mención dentro de un párrafo, precisamente para que se distinga de un enlace a una página que ya existe: la que se crea aquí ocupa su propia línea, con la marca de una página delante. Lo que el bloque guarda es qué página es; el nombre se pregunta cada vez que se dibuja, de modo que renombrar la hija —que se hace en la hija, como en cualquier página— cambia lo que el padre muestra. El nombre escrito al insertarla queda solo de respaldo, para una hija que ya no se puede leer desde aquí. Una página no se puede escribir, hay que hacerla primero, así que el menú `/` pide una hija de la misma manera en que pide una imagen: la escritura no sabe crear páginas, solo la página sabe, y lo que vuelve es la línea que lleva a ella. Al crearla el árbol lateral se refresca, y la hija aparece colgando de su madre. Borrar el bloque no toca la página: sigue en el árbol y sigue abriéndose. Probado en el navegador: creada desde `/`, abierta con un clic, renombrada a «Hija con nombre» y el padre pasó a decir eso, borrado el bloque y la hija quedó donde estaba. | 6 de 6 |
| 14/08/2026 | TB-20 | Las columnas ya estaban hechas y las cuatro casillas se cumplieron en el navegador, sin tocar nada de lo que hacen. Se arrastra un bloque contra el costado de otro y esa zona queda partida en dos; repetir el gesto contra una columna —o contra el margen que sigue a la fila entera— agrega una tercera, y así hasta las que se quieran. Un bloque se lleva de una columna a otra, y la columna que queda sin nada se retira sola en lugar de dejar un hueco. El ancho se reparte arrastrando la separación entre dos columnas: no se guarda en píxeles sino como la parte que le toca a cada una, de modo que la misma página se lee igual en una pantalla más chica; probado que sobrevive a la recarga. Bajo los 640 píxeles las columnas se apilan en el orden en que se leen, cada una toma todo el ancho, la separación desaparece —no hay ancho que repartir— y nada se sale de la pantalla. Lo único que hubo que corregir fue lo que la separación dice de sí misma: se anunciaba como «seleccionar el bloque», que es otra cosa, y siendo un `div` cualquiera no la anunciaba nadie; ahora dice que reparte el ancho entre esas dos columnas y se presenta como lo que es, una separación vertical. | 4 de 4 |
| 14/08/2026 | TB-19 | El índice no existía. Se agregó como bloque propio (`table_of_contents`) que no guarda nada: la página guarda que hay un índice, y lo que el índice dice se lee de los encabezados en cada visita. Guardar la lista sería guardar dos veces lo mismo y quedaría vieja al primer título que se corrija. Se actualiza mientras se escribe porque el índice no se entera solo —un bloque que no sostiene nada no se redibuja cuando cambia otro bloque—, así que un vigilante recorre los encabezados en cada cambio y le avisa cuando la lista dejó de ser la que era. Cada línea es un botón de verdad: se alcanza con el tabulador, se activa con Enter, y al usarlo el cursor queda en ese encabezado y la página se desplaza hasta él —quien llega al encabezado suele querer escribir ahí. La jerarquía se dibuja con sangría, tres cuartos de línea por nivel, y el índice de una página sin encabezados lo dice en vez de quedarse en blanco. Probado en el navegador: insertado desde el menú `/`, los tres niveles listados y sangrados, un título corregido cambió la línea al instante, el clic desplazó hasta el encabezado, sobrevivió a la recarga, y el índice vacío se pobló al escribir el primer encabezado. Después se agregó el índice que no hay que insertar: toda página lo muestra al costado, se arma solo con lo que hay escrito, marca el encabezado que se está leyendo y aparece únicamente donde sobra ancho —en pantalla angosta la página se queda con todo—. Al hacerlo aparecieron dos cosas. Una de lectura: marcar lo que se lee mirando si un encabezado cruza una franja angosta de la pantalla deja la marca pegada donde estaba cuando ninguno la cruza, así que ahora se marca el último encabezado que pasó la línea de lectura, que es como se hace en todas partes; eso corrigió también el índice de la documentación, que tenía el mismo defecto. La otra, del salto: el primer clic después de abrir una página movía el cursor pero no desplazaba nada, porque el navegador todavía no tenía la escritura tomada y el motor no sabía qué caja desplazar; ahora se toma la escritura antes de mover, y con eso quedó arreglado también el primer clic del bloque. | 4 de 4 |
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
