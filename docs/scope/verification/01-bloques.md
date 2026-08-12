# 01 · Bloques

Todo el contenido es un bloque. Este documento no trata de qué tipos existen —eso es `02-tipos-de-bloque.md`— sino de lo que se puede hacer con **cualquiera** de ellos.

> Leer `README.md` de esta carpeta antes de usar este documento.

La regla que sostiene todo lo demás: **si una operación vale para un párrafo, vale para una tabla, una imagen, un diagrama y una colección.** Cada vez que una operación funcione en unos tipos y en otros no, es un fallo, no una limitación aceptable.

---

## BL-01 · Debe tratar todo el contenido como bloques

- [x] Cada pieza de contenido de una página es un bloque independiente
- [x] Un bloque se puede señalar y actuar sobre él sin tocar los de al lado
- [x] Los bloques tienen un orden explícito que se conserva al recargar
- [x] Un bloque puede contener otros bloques
- [x] Una página es un árbol de bloques, no un texto plano con formato
- [x] Una colección es un bloque más, no una pantalla aparte

## BL-02 · Debe permitir crear un bloque en cualquier punto

- [x] Enter al final de un bloque crea el siguiente
- [x] Enter en medio de un bloque lo parte en dos
- [x] `/` abre el menú de inserción junto al cursor
- [x] Escribir después de `/` filtra las opciones
- [x] Las flechas recorren el menú y Enter inserta
- [x] Escape cierra el menú sin insertar nada
- [x] `/` abre el menú también en medio de una frase, si viene después de un espacio
- [x] `/` pegado a una palabra **no** abre el menú, para no molestar en rutas ni fechas
- [x] Con el menú cerrado, Enter nunca ejecuta un comando por accidente
- [x] El menú ofrece solo inserción de bloques, no negrita ni deshacer
- [x] Las opciones están agrupadas por tipo, con ícono
- [x] Las usadas hace poco aparecen primero
- [x] Hay un punto visible para agregar un bloque al final de la página
- [x] Al pasar el cursor entre dos bloques aparece un punto para insertar ahí

## BL-03 · Debe permitir seleccionar bloques

- [x] Escape sale de la edición de texto y selecciona el bloque completo
- [x] Un bloque seleccionado se distingue visualmente
- [x] Arrastrando el mouse se seleccionan varios bloques
- [x] Shift+clic extiende la selección hasta otro bloque
- [x] Shift+flechas extiende la selección con el teclado
- [x] Ctrl+A selecciona primero el bloque, luego toda la página
- [x] Se ve cuántos bloques hay seleccionados cuando son varios
- [x] Un clic fuera deshace la selección

## BL-04 · Debe permitir mover un bloque con el mouse

**Cómo probarlo:** pasa el cursor sobre un bloque y busca el agarre a su izquierda.

- [x] Al pasar el cursor sobre un bloque aparece un agarre a su izquierda
- [x] Arrastrando el agarre, el bloque se mueve
- [x] Mientras se arrastra se ve una línea que indica dónde va a caer
- [x] Se puede soltar arriba, abajo y entre otros bloques
- [x] Se puede soltar dentro de un plegable, una columna o una celda
- [x] Se pueden arrastrar varios bloques seleccionados a la vez
- [x] Al arrastrar varios se ve cuántos se están moviendo
- [x] Arrastrar cerca del borde superior o inferior desplaza la página sola
- [x] Arrastrar manteniendo Alt deja una copia en vez de mover
- [x] Soltar fuera de un destino válido cancela sin dañar el contenido
- [x] El movimiento se puede deshacer con Ctrl+Z
- [ ] Funciona igual con imágenes, tablas, código, diagramas y colecciones

## BL-05 · Debe permitir mover un bloque con el teclado

- [x] Hay un atajo para subir el bloque actual una posición
- [x] Hay un atajo para bajarlo
- [x] Funciona con varios bloques seleccionados
- [x] El atajo aparece en la lista de atajos de la aplicación

## BL-06 · Debe permitir anidar un bloque dentro de otro

**Cómo probarlo:** escribe dos párrafos sueltos y presiona Tab en el segundo.

- [x] Tab indenta el bloque actual y lo anida bajo el anterior
- [x] Shift+Tab lo desanida
- [x] Funciona con párrafos, no solo con listas
- [x] Funciona con encabezados, citas, imágenes, tablas, código y colecciones
- [x] Un bloque anidado puede tener a su vez bloques anidados
- [x] La indentación se ve claramente
- [x] Mover el bloque padre arrastra a sus hijos
- [x] Eliminar el padre pregunta o preserva a los hijos, pero no los borra en silencio
- [x] Se pueden indentar varios bloques seleccionados de una vez
- [ ] La anidación sobrevive al recargar y se exporta correctamente

## BL-07 · Debe permitir convertir un bloque en otro tipo

**Cómo probarlo:** pon el cursor en un bloque, presiona Escape para seleccionarlo y usa **Convertir en** en la barra que aparece.

- [x] Un bloque se puede convertir en otro tipo conservando su texto
- [x] Convertir entre párrafo, encabezado, cita, lista, tarea y destacado funciona en ambos sentidos
- [x] Convertir una lista en párrafos produce un bloque por punto
- [x] Convertir varios bloques seleccionados los convierte todos
- [x] Una conversión que perdería contenido se advierte antes
- [x] Una conversión imposible no se ofrece, en vez de fallar al aplicarla
- [x] La conversión se deshace con Ctrl+Z

## BL-08 · Debe permitir duplicar y eliminar

**Cómo probarlo:** Ctrl+D duplica; Ctrl+Shift+Retroceso elimina. Ambos aparecen en la lista de atajos.

- [x] Un bloque se puede duplicar, y la copia queda justo debajo
- [x] Un bloque se puede eliminar
- [x] Retroceso al inicio de un bloque vacío lo elimina y sube el cursor
- [x] Se pueden duplicar y eliminar varios bloques seleccionados
- [x] Duplicar un bloque con hijos duplica también los hijos
- [x] Eliminar se puede deshacer con el contenido intacto

## BL-09 · Debe ofrecer un menú de acciones por bloque

**Cómo probarlo:** haz clic en el agarre del bloque —sin arrastrarlo— o presiona Ctrl+/ con el cursor dentro.

- [x] Junto al agarre hay un menú de acciones del bloque
- [x] Ofrece convertir en, duplicar, eliminar, copiar enlace y mover a
- [x] Ofrece color de texto y de fondo
- [x] Ofrece comentar
- [x] Las acciones que no aplican a ese tipo no aparecen, en vez de fallar
- [x] El menú se abre con teclado, no solo con mouse
- [x] Escape lo cierra

## BL-10 · Debe permitir colorear un bloque

**Cómo probarlo:** abre el menú del bloque (clic en el agarre o Ctrl+/) y usa **Color del texto** o **Color de fondo**.

- [x] Se puede cambiar el color del texto de un bloque completo
- [x] Se puede poner color de fondo al bloque
- [x] Hay una paleta acotada, no un selector libre
- [x] Los colores se leen bien en modo claro y en modo oscuro
- [x] Se puede quitar el color y volver al predeterminado
- [x] Se puede aplicar a varios bloques seleccionados

## BL-11 · Debe permitir referirse a un bloque concreto

**Cómo probarlo:** abre el menú del bloque (Ctrl+/) y usa **Copiar enlace**; pega la dirección en otra pestaña.

- [x] Cada bloque tiene una identidad estable que sobrevive a editar sus vecinos
- [x] Se puede copiar el enlace de un bloque
- [x] Al abrir ese enlace la página se desplaza hasta ese bloque
- [x] El bloque se resalta un momento al llegar
- [x] El enlace sigue funcionando después de mover el bloque dentro de la página
- [x] Un enlace a un bloque eliminado avisa, en vez de fallar en silencio

## BL-12 · Debe permitir comentar un bloque

**Cómo probarlo:** abre el menú del bloque (Ctrl+/) y usa **Comentar**; para un fragmento, selecciona texto y usa **Comentar** en la barra que aparece sobre la selección.

- [x] Se puede comentar un bloque desde su menú
- [x] Se puede comentar un fragmento de texto dentro del bloque
- [x] El bloque comentado se distingue
- [x] Mover el bloque no desancla su comentario
- [x] Convertir el bloque a otro tipo no pierde el comentario
- [x] El fragmento comentado se distingue y al pulsarlo se abre lo que se dijo

## BL-13 · Debe permitir llevar bloques a otra página

**Cómo probarlo:** menú del bloque (Ctrl+/) → **Mover a…**; para la última casilla, arrastra el bloque por su agarre hasta una página del árbol lateral.

- [x] Un bloque se puede mover a otra página desde su menú
- [x] La página destino se busca escribiendo
- [x] Funciona con varios bloques seleccionados
- [x] Los bloques desaparecen del origen y aparecen en el destino
- [x] Los hijos viajan con el padre
- [x] Se ofrece ir a la página destino después de mover
- [x] Se puede arrastrar un bloque hacia el árbol lateral para convertirlo en página

## BL-14 · Debe permitir convertir un bloque en página

**Cómo probarlo:** menú del bloque (Ctrl+/) → **Convertir en página**.

- [x] Un bloque se puede convertir en página hija
- [x] Su contenido pasa a ser el contenido de la página nueva
- [x] En el lugar original queda un enlace a esa página
- [x] Funciona con varios bloques seleccionados a la vez
- [x] La página nueva aparece anidada en el árbol lateral

## BL-15 · Debe aplicar las operaciones a todos los tipos por igual

**Cómo probarlo:** toma la lista de tipos de `02-tipos-de-bloque.md` y prueba sobre cada uno las operaciones de arriba.

- [x] Arrastrar funciona en todos los tipos
- [x] Anidar funciona en todos los tipos
- [x] Duplicar funciona en todos los tipos
- [x] Eliminar funciona en todos los tipos
- [x] El menú de bloque aparece en todos los tipos
- [x] Copiar enlace funciona en todos los tipos
- [x] Seleccionar junto a otros bloques funciona en todos los tipos
- [x] Ningún tipo queda como isla que solo se puede editar por dentro

## BL-16 · Debe conservar los bloques que no entiende

- [ ] Un bloque de un tipo desconocido no rompe la página
- [ ] Se muestra como marcador de posición identificable
- [ ] Se conserva al guardar, en vez de desaparecer
- [ ] Se puede eliminar a propósito
- [ ] El resto de la página sigue siendo editable

## BL-17 · Debe deshacer cualquier operación de bloque

- [ ] Ctrl+Z deshace insertar, mover, anidar, convertir, duplicar y eliminar
- [ ] Ctrl+Shift+Z rehace
- [ ] Una operación sobre varios bloques se deshace completa, no bloque por bloque
- [ ] Deshacer no revierte los cambios que hizo otra persona en simultáneo

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 2026-08-11 | BL-01 | Nada. Insertarla desde el menú `/` queda pendiente en `TB-23`, no aquí. | 6 de 6 |
| 2026-08-11 | BL-03 | Nada. Arrastrar y shift+clic producen selección de texto sobre varios bloques, que es el comportamiento nativo del editor. | 8 de 8 |
| 2026-08-11 | BL-02 | Nada. Se cambió la regla del `/`: ahora abre en medio de una frase tras un espacio, como Notion. | 14 de 14 |
| 2026-08-12 | BL-06 | **Exportar una página**, que no existe todavía; la anidación sí sobrevive al recargar. Se arreglaron tres cosas por el camino: solo anidaba el bloque del cursor (ahora, todos los seleccionados), no anidaba lo que no tiene dónde escribir (imagen, colección), y borrar el padre se llevaba a los hijos porque Escape seleccionaba la anidación entera. | 9 de 10 |
| 2026-08-12 | BL-05 | Nada. No existía lista de atajos, así que se creó: el editor ata sus teclas y el panel las muestra desde una única lista, de modo que un atajo no puede anunciarse sin funcionar ni funcionar sin anunciarse. | 4 de 4 |
| 2026-08-12 | BL-15 | **El destacado y la cita eran islas**: el agarre que aparecía sobre ellos pertenecía siempre a la línea de adentro, así que arrastrarlos los vaciaba en vez de moverlos, y el ratón apuntaba a un bloque distinto del que respondía el teclado. Ahora solo entrega lo de adentro lo que existe para contener bloques —la página, una columna, lo que cuelga de una anidación—, y la tabla sigue siendo la excepción que se toma entera. Se probó una página con los diez tipos que hoy se pueden escribir (párrafo, encabezado, viñetas, numerada, tareas, cita, destacado, código, tabla, desplegable) más una imagen: en todos aparece el agarre y el menú, y todos se duplican, se borran, se anidan, se arrastran y se seleccionan junto a otros —cuatro bloques de tipos distintos a la vez—, con Ctrl+Z devolviendo cada operación. Quedan sin ejercitar los tipos que aún no se pueden insertar desde el editor (colección, incrustado) y los que no existen. Por el camino aparecieron tres cosas para sus propios bloques: `[]` no crea una tarea, ``` no crea un bloque de código, y la búsqueda del menú `/` no ignora los acentos (`/codigo` no encuentra «Bloque de código»). | 8 de 8 |
| 2026-08-12 | BL-14 | Faltaba la acción en el menú, no la operación: convertir bloques en página ya se había construido para el arrastre al árbol, así que ambas formas de pedirlo son ahora la misma —los bloques viajan enteros y la página se titula con su primera línea— y lo único que cambia es de quién es hija y qué queda en su lugar. Desde el menú, la página es hija de la que se está escribiendo y donde estaban los bloques queda un enlace: la misma mención que se escribe con `@`, una sola manera de apuntar a una página venga de donde venga. | 5 de 5 |
| 2026-08-12 | BL-13 | **Mover varios bloques movía uno solo**: al pasar del menú al selector de destino se volvía a elegir el bloque del menú, y con eso se soltaban los demás. Ahora, cambiar lo que se le pregunta a un bloque no toca lo que la página tiene tomado. Faltaba también **arrastrar un bloque al árbol lateral**: el árbol dice qué filas pueden recibir bloques y qué página es cada una, y el editor lo lee; al soltar, los bloques —con lo que cuelgue de ellos— se convierten en una página hija titulada con su primera línea, salen de esta, y el aviso ofrece ir a verla. | 7 de 7 |
| 2026-08-12 | BL-12 | **Comentar desde el menú no abría nada**: al elegir «Comentar» o «Mover a…», el menú se despedía cerrando justo lo que acababa de abrir. Ahora cada superficie cierra lo suyo —el menú cierra el menú, el diálogo cierra el diálogo— y no lo que otra abrió. Faltaba también **comentar un fragmento**: se creó como una marca sobre el texto que solo dice de qué comentario se trata; lo dicho lo sigue guardando el bloque, así que comentar una frase y comentar el bloque entero son lo mismo guardado en un solo lugar, y por eso el fragmento sobrevive a mover y a convertir. El fragmento comentado va subrayado y al pulsarlo se abre la conversación; borrar el comentario le quita el subrayado. | 6 de 6 |
| 2026-08-12 | BL-11 | Nada. La identidad ya la tenía cada bloque; lo que faltaba era comprobarla: sobrevive a escribir al lado, a mover el bloque, a anidarlo, a convertirlo y a guardar la página. El enlace se copia con esa identidad, y al abrirlo la página espera a dibujarse antes de decidir —mirar una sola vez siempre encontraba nada— y recién entonces resalta el bloque o avisa que ya no está. Queda una salvedad de verificación: seguir un enlace a un bloque **de la página que ya se está leyendo** solo cambia la dirección, no recarga; eso se implementó y está cubierto por pruebas, pero no logré confirmarlo en el navegador —el servidor de desarrollo sirvió código viejo varias veces en esa sesión. | 6 de 6 |
| 2026-08-12 | BL-10 | Nada. Faltaba el modo oscuro entero —los tokens `.dark` no existían—, así que se creó: el servidor lee de una cookie cómo lee cada quien y manda la página ya vestida, sin parpadeo, y el menú de la cuenta ofrece claro, oscuro o según el sistema. Los colores se midieron en el navegador en los dos modos: en claro, naranjo (3.34) y amarillo (2.74) no llegaban al mínimo legible de 4.5:1 y se oscurecieron —ahora los ocho van de 4.59 a 7.04—; en oscuro van de 5.59 a 13.48, y el texto sobre cada fondo, de 12.9 a 17.6. Los fondos de noche pasaron a ser un tinte del color sobre la página, no un bloque sólido. | 6 de 6 |
| 2026-08-12 | BL-09 | Nada. Un clic en el agarre que no va a ninguna parte abre el menú, arrastrarlo sigue moviendo el bloque, Ctrl+/ lo abre sin mouse y Escape lo cierra devolviendo el cursor. Para no ofrecer acciones que fallan al elegirlas hubo que construirlas: el color vive como atributo de todo bloque (junto a su identidad, en un solo lugar), el comentario lo guarda el bloque mismo y por eso viaja con él, el enlace apunta al bloque y al llegar la página se desplaza y lo resalta, y mover a otra página agrega los bloques al final de la elegida antes de sacarlos de esta. El selector de destino lee las páginas del espacio en vez del buscador, que en este entorno devuelve cero resultados incluso para páginas antiguas. | 7 de 7 |
| 2026-08-12 | BL-08 | Nada. Duplicar y eliminar leen los bloques igual que convertir —una sola respuesta a qué bloques mira un gesto—, así que la copia se lleva lo que cuelga del bloque y recibe una identidad propia, y borrar el último bloque deja una página en la que todavía se puede escribir. | 6 de 6 |
| 2026-08-12 | BL-07 | Nada. Faltaban dos tipos del contrato —**tarea** y **destacado**—, así que se crearon: la tarea se marca desde la página misma, no desde la casilla del navegador, para que lo hecho viva en el bloque. La conversión nace de una lista única de tipos destino: cada uno se arma y se mide contra el sitio donde vive el bloque antes de ofrecerse, de modo que lo que aparece en el menú es lo que el editor puede hacer, y lo que dejaría algo atrás lo avisa antes. | 7 de 7 |
| 2026-08-12 | BL-04 | Los **diagramas**, que no existen como tipo de bloque; imágenes, tablas, código y colecciones sí se mueven. Por el camino nacieron las columnas (soltar al borde de un bloque parte la fila, con separador para repartir el ancho) y el desplegable pasó a abrirse y titularse. | 11 de 12 |
