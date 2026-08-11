# 01 · Escritura y editor

Todo lo que debe poder hacerse dentro del cuerpo de una página.

> Leer `README.md` de esta carpeta antes de usar este documento. Se marca casilla por casilla probando en la interfaz, sin importar si algo parece estar hecho.

---

## ED-01 · Debe permitir escribir texto corrido

**Cómo probarlo:** abre cualquier página y escribe.

- [ ] Al abrir la página el cursor puede colocarse en el cuerpo con un clic
- [ ] Escribir muestra el texto sin retraso perceptible
- [ ] Enter crea un párrafo nuevo separado del anterior
- [ ] Shift+Enter hace un salto de línea dentro del mismo párrafo
- [ ] El texto sobrevive al recargar la página
- [ ] Al escribir no aparece ningún fondo, borde ni color que no se haya pedido
- [ ] Escribir mucho texto no hace que la página se sienta lenta
- [ ] Una página vacía sugiere cómo empezar y menciona el menú `/`
- [ ] Un bloque vacío indica que se puede escribir ahí, sin ensuciar la lectura

## ED-02 · Debe permitir encabezados de tres niveles

**Cómo probarlo:** escribe `#` + espacio al inicio de una línea. Luego `##`, luego `###`.

- [ ] `#` + espacio produce un encabezado de nivel 1
- [ ] `##` + espacio produce uno de nivel 2
- [ ] `###` + espacio produce uno de nivel 3
- [ ] Los tres se distinguen visualmente entre sí y del texto normal
- [ ] Desde el menú `/` se puede elegir explícitamente el nivel, no solo uno fijo
- [ ] Un encabezado se puede convertir en párrafo sin borrar el texto
- [ ] Borrar con retroceso al inicio del encabezado lo devuelve a párrafo

## ED-03 · Debe permitir listas con viñetas

- [ ] `-` + espacio inicia una lista con viñetas
- [ ] `*` + espacio también
- [ ] Enter crea el siguiente punto
- [ ] Tab indenta un punto y lo anida bajo el anterior
- [ ] Shift+Tab lo desanida
- [ ] Enter en un punto vacío sale de la lista
- [ ] Los niveles anidados se ven distintos entre sí

## ED-04 · Debe permitir listas numeradas

- [ ] `1.` + espacio inicia una lista numerada
- [ ] La numeración continúa sola al presionar Enter
- [ ] Empezar en un número distinto de 1 respeta ese inicio
- [ ] Se pueden anidar con Tab y la numeración interior reinicia
- [ ] Insertar un punto en el medio renumera lo que sigue

## ED-05 · Debe permitir listas de tareas con casillas

- [ ] `[]` + espacio convierte la línea en una casilla marcable
- [ ] Un clic sobre la casilla la marca; otro la desmarca
- [ ] El texto marcado se distingue visualmente del no marcado
- [ ] El estado marcado sobrevive al recargar
- [ ] Enter crea la siguiente tarea
- [ ] Se pueden anidar tareas dentro de tareas
- [ ] Si otra persona marca una casilla, se ve el cambio sin recargar

## ED-06 · Debe permitir bloques plegables

- [ ] Se puede insertar un bloque plegable desde el menú `/`
- [ ] El triángulo lo abre y lo cierra
- [ ] Se puede escribir el título del plegable
- [ ] Se puede escribir contenido **dentro** del plegable
- [ ] Dentro admite otros bloques, no solo texto plano
- [ ] Cerrado, oculta su contenido por completo
- [ ] El estado abierto/cerrado no se pierde de forma molesta al navegar

## ED-07 · Debe permitir citas

- [ ] Se puede insertar una cita desde el menú `/`
- [ ] `>` + espacio también la crea
- [ ] Se distingue visualmente del párrafo normal
- [ ] Se puede salir de la cita y seguir escribiendo texto normal

## ED-08 · Debe permitir separadores

- [ ] `---` crea una línea divisoria
- [ ] También se puede insertar desde el menú `/`
- [ ] Se puede eliminar con retroceso
- [ ] Ocupa su propia línea y no interrumpe la escritura siguiente

## ED-09 · Debe permitir bloques destacados (callout)

- [ ] Se puede insertar un bloque destacado desde el menú `/`
- [ ] Tiene un ícono a la izquierda
- [ ] El ícono se puede cambiar
- [ ] El color de fondo se puede cambiar
- [ ] Admite varias líneas y otros bloques dentro
- [ ] Se distingue claramente de una cita

## ED-10 · Debe permitir bloques de código

- [ ] Se puede insertar un bloque de código desde el menú `/`
- [ ] ` ``` ` + espacio también lo crea
- [ ] Se puede elegir el lenguaje
- [ ] El código se colorea según el lenguaje elegido
- [ ] Enter dentro del bloque hace salto de línea, no sale del bloque
- [ ] Tab dentro del bloque indenta en vez de mover el foco
- [ ] Hay un botón para copiar el contenido
- [ ] El texto no se reformatea ni se autocorrige dentro del bloque

## ED-11 · Debe permitir tablas

- [ ] Se puede insertar una tabla desde el menú `/`
- [ ] Se puede escribir en cada celda
- [ ] Tab avanza a la celda siguiente
- [ ] Se puede agregar una fila después de creada la tabla
- [ ] Se puede agregar una columna después de creada
- [ ] Se puede eliminar una fila y una columna
- [ ] La primera fila puede marcarse como encabezado
- [ ] Se puede ajustar el ancho de columna
- [ ] Una tabla ancha no rompe el ancho de la página: se desplaza dentro de sí misma
- [ ] Una tabla simple se puede convertir en colección conservando sus datos

## ED-12 · Debe permitir imágenes

- [ ] Se puede subir una imagen desde el menú `/`
- [ ] Se puede arrastrar un archivo de imagen dentro de la página
- [ ] Se puede pegar una imagen desde el portapapeles
- [ ] Mientras sube se ve un indicador de progreso
- [ ] Si la subida falla se explica por qué
- [ ] La imagen se puede redimensionar
- [ ] La imagen se puede eliminar
- [ ] La imagen sigue visible al recargar y para otra persona

## ED-13 · Debe permitir archivos adjuntos dentro del contenido

- [ ] Se puede insertar un archivo en el punto exacto del texto donde está el cursor
- [ ] Se muestra el nombre, el tipo y el peso del archivo
- [ ] Se puede descargar con un clic
- [ ] Se puede eliminar y desaparece de la página
- [ ] Un archivo eliminado del contenido deja de aparecer en la lista de adjuntos de la página
- [ ] Quien no tiene acceso a la página tampoco puede descargar el archivo

## ED-14 · Debe permitir incrustar contenido externo

- [ ] Se puede incrustar un video de YouTube y se reproduce dentro de la página
- [ ] Lo mismo con Vimeo, Loom y Figma
- [ ] Pegar un enlace ofrece elegir entre enlace simple o incrustado
- [ ] Un enlace cualquiera se puede mostrar como tarjeta con título e ícono
- [ ] Una URL no permitida se rechaza con un mensaje claro, no en silencio

## ED-15 · Debe permitir crear subpáginas desde el editor

- [ ] Desde el menú `/` se puede crear una página hija en el punto donde está el cursor
- [ ] La página hija aparece en el cuerpo como un enlace con su título
- [ ] Al hacer clic se abre esa página
- [ ] La página hija aparece anidada en el árbol lateral
- [ ] Cambiar el título de la hija actualiza cómo se ve en el padre
- [ ] Eliminar el bloque del padre no borra en silencio la página hija

## ED-16 · Debe permitir contenido en columnas

- [ ] Se puede dividir una zona de la página en dos columnas
- [ ] Se pueden agregar más columnas
- [ ] Se puede arrastrar un bloque de una columna a otra
- [ ] Se puede ajustar el ancho relativo de cada columna
- [ ] En pantalla angosta las columnas se apilan en vez de romperse

## ED-17 · Debe permitir fórmulas matemáticas

- [ ] Se puede insertar una fórmula como bloque
- [ ] Se puede insertar una fórmula dentro de una línea de texto
- [ ] La fórmula se renderiza, no queda como texto crudo
- [ ] Se puede volver a editar una fórmula ya insertada

## ED-18 · Debe permitir un índice de la página

- [ ] Se puede insertar un índice que liste los encabezados de la página
- [ ] El índice se actualiza solo al agregar o cambiar encabezados
- [ ] Al hacer clic en una entrada, la página se desplaza a ese encabezado
- [ ] Refleja la jerarquía de niveles con indentación

## ED-19 · Debe permitir bloques sincronizados

- [ ] Un mismo bloque puede aparecer en dos páginas distintas
- [ ] Editarlo en una página lo actualiza en la otra
- [ ] Se ve de alguna forma que ese bloque es sincronizado
- [ ] Se puede romper la sincronización y dejar una copia independiente

## ED-20 · Debe permitir mover bloques con el mouse

**Cómo probarlo:** pasa el cursor sobre cualquier bloque y busca el agarre a la izquierda.

- [ ] Al pasar el cursor sobre un bloque aparece un agarre a su izquierda
- [ ] Arrastrando el agarre, el bloque se mueve
- [ ] Mientras se arrastra se ve una línea que indica dónde va a caer
- [ ] Se puede soltar arriba, abajo y entre otros bloques
- [ ] Se puede arrastrar un bloque dentro de un plegable o una columna
- [ ] Soltar fuera de un destino válido cancela sin dañar el contenido
- [ ] El movimiento se puede deshacer con Ctrl+Z
- [ ] Arrastrar funciona igual con imágenes, tablas y bloques de código
- [ ] Arrastrar manteniendo Alt deja una copia en vez de mover
- [ ] Al arrastrar cerca del borde superior o inferior, la página se desplaza sola

## ED-21 · Debe permitir operar sobre un bloque desde un menú

- [ ] Junto al agarre hay un menú de acciones del bloque
- [ ] Permite **convertir en** otro tipo de bloque conservando el texto
- [ ] Permite duplicar el bloque
- [ ] Permite eliminar el bloque
- [ ] Permite copiar un enlace directo a ese bloque
- [ ] Permite cambiar el color del texto o del fondo del bloque
- [ ] El menú se cierra con Escape

## ED-22 · Debe permitir seleccionar y mover varios bloques a la vez

- [ ] Arrastrando el mouse se pueden seleccionar varios bloques
- [ ] Shift+clic extiende la selección hasta otro bloque
- [ ] Shift+flechas extiende la selección con el teclado
- [ ] La selección se distingue visualmente
- [ ] Se pueden **arrastrar todos juntos** a otra posición
- [ ] Al arrastrar varios se ve cuántos se están moviendo
- [ ] Se pueden eliminar todos juntos
- [ ] Se pueden duplicar todos juntos
- [ ] Se pueden copiar y pegar todos juntos, conservando su formato
- [ ] Se pueden indentar y desindentar todos juntos
- [ ] Se les puede aplicar un color a todos juntos
- [ ] Se pueden convertir todos al mismo tipo de bloque
- [ ] Se pueden mover todos juntos a otra página
- [ ] Ctrl+A selecciona primero el bloque, luego toda la página
- [ ] Deshacer revierte la operación completa, no bloque por bloque

## ED-23 · Debe ofrecer un menú de inserción con `/`

- [ ] `/` al inicio de una línea vacía abre el menú
- [ ] Escribir después de `/` filtra las opciones
- [ ] El menú aparece **junto al cursor**, no en una esquina de la pantalla
- [ ] Las flechas mueven la selección y Enter la aplica
- [ ] Escape cierra el menú sin insertar nada
- [ ] Escribir `/` en medio de una frase **no** abre el menú
- [ ] Estando el menú cerrado, Enter nunca ejecuta un comando por accidente
- [ ] El menú ofrece solo inserción de bloques, no negrita ni deshacer
- [ ] Las opciones están agrupadas por tipo, no en una lista plana
- [ ] Cada opción tiene un ícono que la hace reconocible de un vistazo
- [ ] Si no hay coincidencias se dice, en vez de mostrar un menú vacío
- [ ] Las opciones usadas hace poco aparecen primero
- [ ] El menú se puede recorrer entero con el teclado sin tocar el mouse
- [ ] Los nombres funcionan en español y en inglés

## ED-24 · Debe ofrecer formato al seleccionar texto

- [ ] Al seleccionar texto aparece una barra flotante
- [ ] La barra aparece junto a la selección
- [ ] Ofrece negrita, cursiva, tachado, código y enlace
- [ ] Ofrece color de texto y de fondo
- [ ] Ofrece convertir el bloque en otro tipo
- [ ] Los botones reflejan el estado actual de la selección
- [ ] La barra desaparece al soltar la selección

## ED-25 · Debe permitir enlazar a un bloque específico

- [ ] Se puede copiar el enlace de un bloque concreto
- [ ] Al abrir ese enlace la página se desplaza hasta ese bloque
- [ ] El bloque se resalta un momento al llegar
- [ ] El enlace sigue funcionando después de editar otras partes de la página

## ED-26 · Debe pegar contenido externo conservando la estructura

- [ ] Pegar desde otra página de la app conserva bloques y formato
- [ ] Pegar Markdown lo convierte en bloques reales
- [ ] Pegar HTML de un sitio web conserva encabezados, listas y enlaces
- [ ] Pegar como texto plano está disponible con Ctrl+Shift+V
- [ ] Pegar una URL sobre texto seleccionado lo convierte en enlace
- [ ] Pegar contenido enorme no rompe ni congela el editor

## ED-27 · Debe permitir deshacer y rehacer

- [ ] Ctrl+Z deshace lo último escrito
- [ ] Ctrl+Shift+Z rehace
- [ ] Deshacer alcanza inserciones de bloques, no solo texto
- [ ] Deshacer no revierte los cambios que hizo otra persona en simultáneo

## ED-28 · Debe guardar sin que haya que pedirlo

- [ ] Los cambios se guardan solos, sin botón
- [ ] Se indica de alguna forma cuándo terminó de guardar
- [ ] Si se pierde la conexión se avisa
- [ ] Al volver la conexión los cambios pendientes se envían
- [ ] Cerrar la pestaña con cambios recientes no los pierde
- [ ] Nunca aparece un error de guardado sin explicación de qué hacer

## ED-29 · Debe permitir diagramas escritos como texto

**Cómo probarlo:** inserta un bloque de diagrama y pega un `flowchart` de Mermaid.

- [ ] Se puede insertar un bloque de diagrama desde el menú `/`
- [ ] Escribir código Mermaid lo dibuja
- [ ] Soporta diagrama de flujo
- [ ] Soporta diagrama de secuencia
- [ ] Soporta Gantt
- [ ] Soporta diagrama de clases y de estados
- [ ] Soporta entidad-relación
- [ ] Soporta mapa mental y gráfico de pastel
- [ ] Se puede alternar entre ver el código, ver el dibujo, y ver ambos lado a lado
- [ ] El dibujo se actualiza mientras se escribe, sin apretar nada
- [ ] Un error de sintaxis se explica indicando la línea, y no rompe la página
- [ ] El diagrama se puede ampliar a pantalla completa
- [ ] Se puede acercar y desplazar dentro del diagrama
- [ ] Se puede copiar el código fuente
- [ ] Se puede descargar el dibujo como imagen
- [ ] Un diagrama ancho se desplaza dentro de su bloque sin romper la página
- [ ] Se lee bien en modo claro y en modo oscuro
- [ ] Otra persona ve el mismo dibujo, no el código

## ED-30 · Debe permitir video y audio

- [ ] Se puede subir un video y se reproduce dentro de la página
- [ ] Se puede subir un audio y se reproduce dentro de la página
- [ ] Se puede pegar el enlace de un video externo
- [ ] Los controles de reproducción funcionan
- [ ] Se puede redimensionar el reproductor de video

## ED-31 · Debe permitir mostrar un PDF dentro de la página

- [ ] Se puede subir un PDF y se ve incrustado
- [ ] Se puede pasar de página dentro del visor
- [ ] Se puede descargar
- [ ] Se puede abrir a pantalla completa

## ED-32 · Debe permitir describir los medios insertados

- [ ] Se puede poner una leyenda a una imagen
- [ ] También a un archivo, un video, un PDF y un incrustado
- [ ] La leyenda se ve debajo del medio
- [ ] Se puede poner texto alternativo a una imagen para lectores de pantalla

## ED-33 · Debe permitir acomodar los medios

- [ ] Una imagen se puede alinear a la izquierda, al centro o a la derecha
- [ ] Se puede poner a ancho completo
- [ ] Se puede cambiar el tamaño arrastrando desde una esquina
- [ ] El tamaño elegido se conserva al recargar

## ED-34 · Debe permitir mover bloques con el teclado

- [ ] Hay un atajo para subir el bloque actual una posición
- [ ] Hay un atajo para bajarlo
- [ ] Funciona también con varios bloques seleccionados
- [ ] El atajo está anunciado en la lista de atajos

## ED-35 · Debe permitir llevar contenido a otra página

- [ ] Un bloque se puede mover a otra página desde su menú
- [ ] La página destino se busca escribiendo
- [ ] Funciona con varios bloques seleccionados
- [ ] El contenido desaparece del origen y aparece al final del destino
- [ ] Se ofrece ir a la página destino después de mover

## ED-36 · Debe permitir convertir un bloque en página propia

- [ ] Un bloque se puede convertir en una página hija
- [ ] El contenido del bloque pasa a ser el contenido de la página nueva
- [ ] En el lugar original queda un enlace a esa página
- [ ] Funciona con varios bloques seleccionados a la vez

## ED-37 · Debe permitir enlazar una página existente como bloque

- [ ] Desde `/` se puede insertar un enlace a una página que ya existe
- [ ] Se busca escribiendo el título
- [ ] Se ve con el ícono y el título de esa página
- [ ] Si la página cambia de título, el enlace lo refleja
- [ ] Se distingue de una subpágina creada desde aquí

## ED-38 · Debe permitir arrastrar cosas desde y hacia afuera del editor

- [ ] Arrastrar un archivo del computador dentro de la página lo sube donde se soltó
- [ ] Arrastrar varios archivos a la vez los sube todos
- [ ] Arrastrar una imagen desde otra pestaña del navegador la inserta
- [ ] Arrastrar una página desde el árbol lateral al contenido inserta un enlace a ella
- [ ] Arrastrar un bloque hacia el árbol lateral lo convierte en página
- [ ] Mientras se arrastra desde afuera se indica que se puede soltar

## ED-39 · Debe permitir buscar dentro de la página

- [ ] Un atajo abre buscar dentro de la página
- [ ] Resalta todas las coincidencias
- [ ] Permite saltar de una coincidencia a la siguiente
- [ ] Indica cuántas coincidencias hay
- [ ] Permite reemplazar una coincidencia
- [ ] Permite reemplazar todas
- [ ] Encuentra texto dentro de bloques plegados y los abre al llegar

## ED-40 · Debe permitir encabezados plegables

- [ ] Un encabezado se puede volver plegable
- [ ] Plegarlo oculta todo el contenido que va debajo hasta el siguiente encabezado del mismo nivel
- [ ] El estado plegado se conserva al navegar
- [ ] Al imprimir o exportar, el contenido plegado se incluye igual

## ED-41 · Debe mostrar la estructura de la página

- [ ] Existe un panel con los encabezados de la página
- [ ] Al hacer clic en uno, la página se desplaza hasta él
- [ ] Marca en qué encabezado se está mientras se lee
- [ ] Se puede ocultar
- [ ] Refleja la jerarquía de niveles

## ED-42 · Debe permitir crear desde `/` todo lo que el producto ofrece

**Cómo probarlo:** abre el menú `/` y revisa que cada cosa de esta lista se pueda crear desde ahí.

- [ ] Una subpágina
- [ ] Un enlace a una página existente
- [ ] Una colección con su tabla
- [ ] Una vista de tablero
- [ ] Una página a partir de una plantilla
- [ ] Una mención a otra página
- [ ] Una mención a una persona
- [ ] Una fecha
- [ ] Un diagrama
- [ ] Un bloque de código
- [ ] Una tabla
- [ ] Una imagen, un archivo, un video, un PDF
- [ ] Un incrustado externo
- [ ] Una fórmula
- [ ] Un índice de la página
- [ ] Un separador, una cita, un destacado, un plegable
- [ ] Todo lo insertado queda editable después, sin tener que borrarlo y rehacerlo

## ED-43 · Debe permitir anidar cualquier bloque dentro de otro

**Cómo probarlo:** escribe dos párrafos sueltos y presiona Tab en el segundo.

- [ ] Tab indenta el bloque actual y lo anida bajo el anterior
- [ ] Shift+Tab lo desanida
- [ ] Funciona con párrafos, no solo con listas
- [ ] Funciona con encabezados, citas, imágenes, tablas y código
- [ ] Un bloque anidado puede tener a su vez bloques anidados
- [ ] La indentación se ve claramente
- [ ] Mover el bloque padre arrastra a sus hijos
- [ ] Eliminar el padre pregunta o preserva a los hijos, pero no los borra en silencio
- [ ] Se puede indentar varios bloques seleccionados de una vez
- [ ] La anidación sobrevive al recargar y se exporta correctamente · Debe permitir formato dentro de la línea

- [ ] Ctrl+B pone negrita
- [ ] Ctrl+I pone cursiva
- [ ] Ctrl+E pone código en línea
- [ ] `**texto**` se convierte en negrita al terminar de escribirlo
- [ ] `*texto*` en cursiva
- [ ] `` `texto` `` en código
- [ ] Los formatos se pueden combinar sobre el mismo texto
- [ ] El formato se quita volviendo a aplicar el mismo atajo

## IN-02 · Debe permitir tachado

- [ ] Hay un atajo de teclado para tachar
- [ ] `~~texto~~` lo tacha al terminar de escribirlo
- [ ] Está disponible en la barra flotante de selección

## IN-03 · Debe permitir subrayado

- [ ] Ctrl+U subraya
- [ ] Está disponible en la barra flotante
- [ ] Se distingue visualmente de un enlace

## IN-04 · Debe permitir color y resaltado

- [ ] Se puede cambiar el color del texto seleccionado
- [ ] Se puede poner un color de fondo al texto seleccionado
- [ ] Hay una paleta acotada de colores, no un selector libre
- [ ] Los colores se leen bien en modo claro y en modo oscuro
- [ ] Se puede quitar el color y volver al predeterminado

## IN-05 · Debe permitir enlaces

- [ ] Ctrl+K sobre texto seleccionado abre el campo de enlace
- [ ] Se puede pegar una URL y queda enlazada
- [ ] Se puede buscar una página interna desde ese mismo campo
- [ ] Al pasar el cursor sobre el enlace se puede editar o quitar
- [ ] Los enlaces internos abren dentro de la app, sin recarga completa
- [ ] Un enlace roto o inválido se rechaza con un mensaje

## IN-06 · Debe permitir mencionar otra página

**Cómo probarlo:** escribe `@` después de un espacio, en medio de una frase.

- [ ] `@` abre el buscador de páginas
- [ ] Escribir filtra por título
- [ ] Funciona en medio de una frase, no solo al inicio de la línea
- [ ] Un correo como `juan@ejemplo.com` **no** dispara el menú
- [ ] La mención insertada muestra el título de la página, no su identificador
- [ ] Al hacer clic se navega a la página mencionada
- [ ] Si la página cambia de título, la mención lo refleja
- [ ] Quien no tiene acceso a la página destino no ve su título
- [ ] La mención aparece como retroenlace en la página destino
- [ ] El buscador ofrece crear una página nueva con lo escrito si no existe

## IN-07 · Debe permitir mencionar a una persona

- [ ] `@` ofrece también personas, no solo páginas
- [ ] Se distingue visualmente una persona de una página en la lista
- [ ] La mención muestra el nombre de la persona
- [ ] Solo aparecen personas con acceso al espacio
- [ ] Al pasar el cursor se ve algo de esa persona (correo, rol)
- [ ] La persona mencionada se entera de alguna forma

## IN-08 · Debe permitir mencionar fechas

- [ ] `@` permite insertar una fecha
- [ ] Hay atajos para hoy, mañana y ayer
- [ ] Se abre un calendario para elegir otra fecha
- [ ] La fecha se muestra en el formato e idioma del usuario
- [ ] Se puede editar una fecha ya insertada

## IN-09 · Debe permitir insertar emoji

- [ ] `:` seguido de letras abre el buscador de emoji
- [ ] Escribir filtra por nombre
- [ ] Enter inserta el emoji seleccionado
- [ ] Funciona igual en el título y en el cuerpo

## IN-10 · Debe permitir fórmulas dentro de la línea

- [ ] Se puede insertar una fórmula sin salir del párrafo
- [ ] Se renderiza junto al texto sin desalinear la línea
- [ ] Se puede volver a abrir para editarla

## IN-11 · Debe reconocer atajos de Markdown al escribir

- [ ] `#`, `##`, `###` para encabezados
- [ ] `-`, `*`, `+` para viñetas
- [ ] `1.` para lista numerada
- [ ] `[]` para tarea
- [ ] `>` para cita
- [ ] `---` para separador
- [ ] ` ``` ` para bloque de código
- [ ] `**`, `*`, `` ` ``, `~~` para formato en línea
- [ ] Ninguna de estas conversiones ocurre dentro de un bloque de código
- [ ] Ctrl+Z inmediatamente después revierte la conversión y deja el texto tal cual se escribió

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
