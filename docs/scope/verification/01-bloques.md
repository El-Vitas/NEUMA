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

- [ ] Cada bloque tiene una identidad estable que sobrevive a editar sus vecinos
- [ ] Se puede copiar el enlace de un bloque
- [ ] Al abrir ese enlace la página se desplaza hasta ese bloque
- [ ] El bloque se resalta un momento al llegar
- [ ] El enlace sigue funcionando después de mover el bloque dentro de la página
- [ ] Un enlace a un bloque eliminado avisa, en vez de fallar en silencio

## BL-12 · Debe permitir comentar un bloque

- [ ] Se puede comentar un bloque desde su menú
- [ ] Se puede comentar un fragmento de texto dentro del bloque
- [ ] El bloque comentado se distingue
- [ ] Mover el bloque no desancla su comentario
- [ ] Convertir el bloque a otro tipo no pierde el comentario

## BL-13 · Debe permitir llevar bloques a otra página

- [ ] Un bloque se puede mover a otra página desde su menú
- [ ] La página destino se busca escribiendo
- [ ] Funciona con varios bloques seleccionados
- [ ] Los bloques desaparecen del origen y aparecen en el destino
- [ ] Los hijos viajan con el padre
- [ ] Se ofrece ir a la página destino después de mover
- [ ] Se puede arrastrar un bloque hacia el árbol lateral para convertirlo en página

## BL-14 · Debe permitir convertir un bloque en página

- [ ] Un bloque se puede convertir en página hija
- [ ] Su contenido pasa a ser el contenido de la página nueva
- [ ] En el lugar original queda un enlace a esa página
- [ ] Funciona con varios bloques seleccionados a la vez
- [ ] La página nueva aparece anidada en el árbol lateral

## BL-15 · Debe aplicar las operaciones a todos los tipos por igual

**Cómo probarlo:** toma la lista de tipos de `02-tipos-de-bloque.md` y prueba sobre cada uno las operaciones de arriba.

- [ ] Arrastrar funciona en todos los tipos
- [ ] Anidar funciona en todos los tipos
- [ ] Duplicar funciona en todos los tipos
- [ ] Eliminar funciona en todos los tipos
- [ ] El menú de bloque aparece en todos los tipos
- [ ] Copiar enlace funciona en todos los tipos
- [ ] Seleccionar junto a otros bloques funciona en todos los tipos
- [ ] Ningún tipo queda como isla que solo se puede editar por dentro

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
| 2026-08-12 | BL-10 | Nada. Faltaba el modo oscuro entero —los tokens `.dark` no existían—, así que se creó: el servidor lee de una cookie cómo lee cada quien y manda la página ya vestida, sin parpadeo, y el menú de la cuenta ofrece claro, oscuro o según el sistema. Los colores se midieron en el navegador en los dos modos: en claro, naranjo (3.34) y amarillo (2.74) no llegaban al mínimo legible de 4.5:1 y se oscurecieron —ahora los ocho van de 4.59 a 7.04—; en oscuro van de 5.59 a 13.48, y el texto sobre cada fondo, de 12.9 a 17.6. Los fondos de noche pasaron a ser un tinte del color sobre la página, no un bloque sólido. | 6 de 6 |
| 2026-08-12 | BL-09 | Nada. Un clic en el agarre que no va a ninguna parte abre el menú, arrastrarlo sigue moviendo el bloque, Ctrl+/ lo abre sin mouse y Escape lo cierra devolviendo el cursor. Para no ofrecer acciones que fallan al elegirlas hubo que construirlas: el color vive como atributo de todo bloque (junto a su identidad, en un solo lugar), el comentario lo guarda el bloque mismo y por eso viaja con él, el enlace apunta al bloque y al llegar la página se desplaza y lo resalta, y mover a otra página agrega los bloques al final de la elegida antes de sacarlos de esta. El selector de destino lee las páginas del espacio en vez del buscador, que en este entorno devuelve cero resultados incluso para páginas antiguas. | 7 de 7 |
| 2026-08-12 | BL-08 | Nada. Duplicar y eliminar leen los bloques igual que convertir —una sola respuesta a qué bloques mira un gesto—, así que la copia se lleva lo que cuelga del bloque y recibe una identidad propia, y borrar el último bloque deja una página en la que todavía se puede escribir. | 6 de 6 |
| 2026-08-12 | BL-07 | Nada. Faltaban dos tipos del contrato —**tarea** y **destacado**—, así que se crearon: la tarea se marca desde la página misma, no desde la casilla del navegador, para que lo hecho viva en el bloque. La conversión nace de una lista única de tipos destino: cada uno se arma y se mide contra el sitio donde vive el bloque antes de ofrecerse, de modo que lo que aparece en el menú es lo que el editor puede hacer, y lo que dejaría algo atrás lo avisa antes. | 7 de 7 |
| 2026-08-12 | BL-04 | Los **diagramas**, que no existen como tipo de bloque; imágenes, tablas, código y colecciones sí se mueven. Por el camino nacieron las columnas (soltar al borde de un bloque parte la fila, con separador para repartir el ancho) y el desplegable pasó a abrirse y titularse. | 11 de 12 |
