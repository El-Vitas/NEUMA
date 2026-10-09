# 04 · Páginas y navegación

Crear páginas, organizarlas, encontrarlas de nuevo.

> Leer `README.md` de esta carpeta antes de usar este documento.

---

## PG-01 · Debe permitir crear una página

- [x] Hay un botón visible para crear una página desde el espacio
- [x] Hay un botón para crear una página hija desde cualquier página del árbol — el «+» de la fila y «Crear subpágina» en los tres puntos
- [x] La página nueva se abre lista para escribir, con el cursor en el título
- [x] No obliga a completar un formulario antes de empezar a escribir — la página se crea vacía y uno cae dentro; el título se guarda solo (verificado contra PostgreSQL sin apretar nada)
- [x] Aparece de inmediato en el árbol lateral
- [x] Se puede crear con un atajo de teclado — `Ctrl`/`Cmd` + `Shift` + `N`, en el espacio donde uno esté; lleva Shift para no pelearse con el atajo del navegador, y calla mientras se escribe
- [ ] Al crearla se puede elegir una plantilla en vez de empezar en blanco

## PG-02 · Debe permitir anidar páginas sin límite

- [x] Una página puede contener páginas hijas
- [x] Una hija puede tener sus propias hijas, y así sucesivamente — se verificó con una nieta real
- [x] La jerarquía se ve en el árbol lateral con indentación
- [x] Cada rama se puede plegar y desplegar
- [x] El estado plegado se conserva al navegar entre páginas
- [x] Una rama profunda sigue siendo legible — la sangría deja de crecer a partir de la sexta generación, así que una rama honda conserva el ancho del nombre; los nombres largos se cortan con puntos suspensivos y se leen enteros al pasar el cursor

## PG-03 · Debe permitir titular la página

- [x] El título se escribe arriba del contenido, no en un campo aparte
- [x] Enter en el título baja al cuerpo — el cursor entra al editor y lo escrito cae ahí
- [x] El título se actualiza en el árbol lateral mientras se escribe
- [x] Una página sin título muestra un texto de marcador claro («Sin título»)
- [x] El título aparece en la pestaña del navegador — «Nombre de la página · Neuma», tanto en la carga del servidor como al renombrar en vivo

## PG-04 · Debe permitir ponerle un ícono a la página

**De dónde mirar la interacción:** `notion-clone-tutorial` resuelve bien el gesto —el botón aparece al pasar el cursor sobre la cabecera y no ocupa lugar cuando la página no tiene ícono. Ver `referencias-externas.md`.

- [x] Hay un botón para agregar un ícono sobre el título
- [x] Se puede elegir un emoji
- [x] Se puede subir una imagen como ícono
- [x] Hay una opción de ícono aleatorio — por pestaña: en Emojis sortea un emoji, en Íconos un símbolo
- [x] El ícono se ve en el árbol lateral, al mismo tamaño que la marca por omisión
- [x] El ícono se ve en los resultados de búsqueda y en las menciones
- [x] Se puede quitar

**Además de lo pedido:** hay 1910 íconos de la biblioteca en una segunda pestaña, buscables por nombre y por
significado en español e inglés, con un color a elegir. El ícono también se cambia y la página se renombra desde
el menú de los tres puntos del árbol, sin abrirla.

**Los espacios también llevan ícono** (misma ventana, sin la opción de imagen: a ese tamaño una foto no se lee) y
se renombran desde el mismo menú. Se ve tanto en el árbol como en la barra plegada.

## PG-05 · Debe permitir una imagen de portada

**Retirada el 17/08/2026 y reconstruida el 18/08/2026 a pedido de El-Vitas** —"que funcione bien dado que no
estaba funcionando"—. Lo que estorbaba y ya no: el botón ocupaba una fila propia sobre el título en **toda**
página sin portada; la imagen entera era un control deslizante que se movía y guardaba con cualquier arrastre; y
el `touch-none` estaba puesto siempre, así que en táctil el dedo no desplazaba la página sobre la banda.

**De dónde mirar la interacción:** misma referencia que PG-04.

- [x] Hay un botón para agregar una portada — vive entre los controles de la derecha, junto a información y tipografía; no reserva espacio propio
- [x] Se puede subir una imagen propia — verificado con una foto real de 6000×3375 (7,6 MB)
- [x] Se puede reposicionar verticalmente — es un modo que se entra y se sale; con flechas y arrastre, y **no guarda hasta que se pide**
- [x] Se puede cambiar y quitar — verificado contra PostgreSQL y contra el disco: la imagen anterior se borra
- [x] No empuja el contenido de forma que estorbe al escribir — sin portada, el primer elemento es la cabecera: cero espacio reservado

## PG-06 · Debe mostrar dónde está uno parado

- [x] Arriba de la página se ve la ruta desde el espacio hasta esta página
- [x] Cada tramo de la ruta es navegable con un clic — el tramo actual no es enlace, como corresponde
- [x] Una ruta muy profunda se acorta sin perder el último tramo — con nueve tramos se muestran el espacio, los dos últimos ancestros y la página; los intermedios se despliegan desde «…»
- [x] La ruta se actualiza al mover la página — verificado moviendo a nieta y de vuelta a raíz

## PG-07 · Debe permitir mover una página

- [x] Se puede mover a otro padre — desde «Ubicación» en el panel de la página
- [x] Se puede mover a otro espacio — verificado contra PostgreSQL, de ida y de vuelta
- [x] Se puede convertir en página raíz del espacio
- [x] El destino se busca escribiendo, no en un desplegable interminable — lista agrupada por espacio que se reduce al escribir
- [x] Las páginas hijas se mueven junto con la madre — verificado con una hija real: cambió de espacio con su madre, y el índice recibió su propio aviso
- [x] No se puede mover una página dentro de sí misma ni de sus descendientes — su propia rama no aparece entre los destinos, no solo se rechaza después
- [x] Después de mover, los enlaces y menciones existentes siguen funcionando — una dirección con el espacio viejo lleva a la página en su espacio nuevo
- [x] Al moverla a un espacio donde alguien pierde acceso, se advierte antes — dice cuántas personas y pide confirmación; si nadie pierde acceso el traslado ocurre sin ningún paso extra

## PG-08 · Debe permitir duplicar una página

- [x] Hay una opción de duplicar
- [x] La copia conserva el contenido, las propiedades y el ícono
- [x] Se indica en el título que es una copia
- [x] Se puede elegir si se duplican también las páginas hijas
- [x] La copia queda junto a la original en el árbol

## PG-09 · Debe permitir enviar una página a la papelera

- [x] Hay una opción de eliminar accesible desde la página y desde el árbol
- [x] Pide confirmación antes de eliminar
- [x] La página desaparece del árbol y de los resultados de búsqueda
- [x] Las hijas se van a la papelera con ella
- [x] Se avisa cuántas páginas hijas se van a eliminar
- [x] Las menciones a esa página en otras páginas indican que fue eliminada — se tachan, dicen «eliminada» y explican al posar el cursor; una mención a una página que la pantalla no tiene en la mano se dibuja normal, porque no saber no es saber que se eliminó

## PG-10 · Debe permitir ver y recuperar lo eliminado

- [x] Existe una pantalla que lista las páginas en la papelera
- [x] Se ve cuándo se eliminó cada una y quién lo hizo
- [x] Se puede buscar dentro de la papelera
- [x] Se puede restaurar una página y vuelve a su lugar original
- [x] Si su padre ya no existe, la restauración explica dónde quedó — dice si volvió bajo su madre o a la raíz del espacio. Queda fuera el caso de la madre eliminada **para siempre**: `parentId` tiene `ON DELETE SET NULL`, así que al borrarla el vínculo se pierde en ese instante y al restaurar ya no hay nada que distinga a esa hija de una que siempre vivió en la raíz
- [x] Restaurar una madre ofrece restaurar también sus hijas

## PG-11 · Debe permitir eliminar definitivamente

- [x] Desde la papelera se puede eliminar una página para siempre
- [x] La confirmación deja claro que no tiene vuelta atrás
- [x] Se puede vaciar la papelera completa
- [x] Los archivos adjuntos de esa página también se eliminan — verificado contra el disco: el archivo desapareció de `uploads/file-assets`, y la confirmación lo advierte

## PG-12 · Debe permitir marcar páginas como favoritas

- [x] Hay una estrella o similar en la página
- [x] Las favoritas aparecen en una sección propia arriba del árbol
- [x] Se pueden reordenar las favoritas
- [x] Se puede quitar de favoritas desde ambos lugares

## PG-13 · Debe permitir volver a lo reciente

- [x] Existe una lista de páginas visitadas recientemente
- [x] Está a un clic o un atajo de distancia
- [x] Muestra el espacio al que pertenece cada una («En Engineering»)
- [x] No repite la misma página varias veces — visitada varias veces, aparece una sola

## PG-14 · Debe mostrar los datos de la página sin estorbar

- [x] Las propiedades se ven arriba del contenido, compactas — comprobado con una fila real de la colección «Tasks»: estado, responsable, prioridad, fecha y descripción, por encima del editor
- [x] Una página sin propiedades no muestra un panel vacío — ya no se anuncia el vacío, y el botón dejó de llamar «propiedades» a la ubicación y a los adjuntos, que no lo son
- [x] Cada propiedad se edita en el mismo lugar donde se ve, sin abrir otra pantalla — editado en el campo y persistido en base sin abrir nada
- [x] Con muchas propiedades se pliegan y hay un "mostrar más" — probado con «Mostrar 2 propiedades más»
- [x] La ubicación y los adjuntos se ven ahí mismo, no en un panel aparte
- [x] El bloque no empuja el contenido tan abajo que haya que desplazarse para escribir — plegado por omisión
- [x] En pantalla angosta sigue siendo usable — recorrido a 320 px sin desbordes

## PG-15 · Debe permitir adjuntar archivos a la página

- [x] Se pueden subir archivos a la página
- [x] Se ve nombre, tipo, peso y quién lo subió
- [x] Se pueden descargar — descarga real ejecutada
- [x] Se pueden eliminar — con confirmación
- [x] Se avisa si el archivo excede el tamaño permitido — con 11 MB: «El archivo pesa más de 10 MB y no se puede subir.»
- [x] Se ve el progreso de subida — una barra sin porcentaje, a propósito: el sistema no conoce uno y no lo inventa
- [x] Un archivo insertado en el contenido aparece también en esta lista — comprobado soltando un archivo sobre el editor: queda en el contenido y en la lista. No estaba roto; estaba sin probar

## PG-16 · Debe informar sobre la página

- [x] Se puede ver quién la creó y cuándo
- [x] Se puede ver quién la editó por última vez y cuándo
- [x] Se puede ver el conteo de palabras
- [x] Esta información no ocupa espacio permanente en pantalla

## PG-17 · Debe permitir ajustar cómo se ve la página

- [~] Se puede pasar la página a ancho completo — ya no se elige: toda página es ancho completo desde el 18/08/2026, porque la alternativa no aportaba nada
- [x] Se puede reducir el tamaño del texto
- [x] Se puede elegir la tipografía entre unas pocas opciones — Del sistema / Con remates / De ancho fijo, aplicada sin recargar
- [x] La elección se guarda por página, no de forma global
- [x] El cambio se aplica sin recargar

## PG-18 · Debe permitir bloquear una página

- [x] Una página se puede bloquear contra ediciones accidentales
- [x] Bloqueada, el contenido se lee pero no se edita
- [x] Se ve claramente que está bloqueada
- [x] Quien tiene permiso la puede desbloquear
- [x] El bloqueo aplica también a las propiedades

## PG-19 · Debe permitir actuar sobre varias páginas a la vez

- [x] Se pueden seleccionar varias páginas en una lista — modo selección explícito en el árbol
- [x] Se pueden mover todas juntas a otro padre o espacio
- [x] Se pueden enviar todas juntas a la papelera — seleccionar una madre y una hija no actúa dos veces: la cascada de la madre ya la cubre
- [x] Se pueden exportar todas juntas — salen comprimidas, con sus adjuntos y las carpetas donde vivían
- [x] Se ve cuántas hay seleccionadas — a la vista y anunciado por `aria-live`
- [x] La acción se puede cancelar antes de aplicarse

## PG-20 · Debe permitir saber si una página es confiable

> Aquí se revisa **si** una página es confiable. Lo que eso obliga —que una
> página verificada con responsables deje de aceptar edición directa y sus
> cambios pasen por aprobación— se revisa en
> `14-revision-y-aprobacion-de-cambios.md`.

- [x] Una página se puede marcar como verificada
- [x] Se ve quién la verificó y cuándo
- [x] Se puede definir una fecha en que la verificación caduca — el día elegido cuenta entero, no caduca a medianoche
- [ ] Al caducar, la página lo indica y avisa a quien la mantiene — la página **sí** lo indica («Verificada · caducada»), verificado moviendo la fecha al pasado sin tocar la página. El aviso a quien la mantiene no se construyó: no existen notificaciones ni tareas programadas en el sistema
- [x] Se puede asignar una persona responsable de la página
- [x] Se puede filtrar la búsqueda por páginas verificadas — el filtro se resuelve contra `now()` en el momento de la consulta, así que una página que caduca deja de aparecer sin que nadie la reescriba

## PG-21 · Debe informar del uso de la página

- [x] Se puede ver cuántas veces se ha visto la página — una misma persona no cuenta dos veces dentro de media hora
- [x] Se puede ver quiénes la vieron y cuándo
- [x] Quien no tiene permiso de administrar no ve esta información — no se le dibuja el control, y el servidor además rechaza a quien lo pida por su cuenta
- [x] Se puede desactivar este registro — apagado deja de **guardar**, no solo de mostrar: comprobado visitando páginas con el registro apagado y viendo que la cuenta no se movía

## PG-22 · Debe permitir que una página sea algo más que un documento

> Una página no cambia de naturaleza según cómo se muestre. Es la misma página,
> con el mismo nombre, el mismo lugar en el árbol y los mismos permisos, y lo
> único que cambia es qué ocupa la pantalla al abrirla. Por eso pasar de una
> presentación a otra no puede perder nada.
>
> Lo que se ve **dentro** de una página que se presenta como colección se revisa
> en `05-colecciones-propiedades-vistas.md`.

- [ ] Al crear una página se elige qué será: documento, colección o lienzo
- [ ] Una página existente se puede pasar de documento a colección
- [ ] Una página existente vuelve de colección a documento sin perder las filas ni sus valores
- [ ] Se advierte qué queda fuera de vista antes de cambiar de presentación
- [ ] El árbol lateral distingue por su ícono qué es cada página
- [ ] Una página que no es documento conserva nombre, ícono, portada, permisos y papelera igual que cualquier otra
- [ ] Se puede escribir un texto de entrada arriba, sea cual sea la presentación
- [ ] Abrir una fila o una tarjeta lleva a una página normal, con su cuerpo editable
- [ ] Una mención a una página muestra qué es antes de abrirla

## PG-23 · Debe ofrecer una página como lienzo

> El lienzo es la misma página mirada de otra manera, no un archivo aparte. Lo
> que se escribió como documento sigue estando cuando se mira como lienzo.

- [ ] Una página se puede ver como lienzo de espacio libre
- [ ] Se alterna entre documento y lienzo sin perder contenido
- [ ] Se elige cuál de las dos es la forma principal de esa página
- [ ] En el lienzo se coloca texto, imágenes y formas donde uno quiera
- [ ] Se puede acercar, alejar y encuadrar todo lo que hay
- [ ] Se conectan dos elementos con una flecha que los sigue al moverlos
- [ ] Se puede traer otra página al lienzo y verla dentro
- [ ] Se puede traer una vista de colección al lienzo
- [ ] Lo que se hace en el lienzo se guarda solo, igual que el documento
- [ ] Dos personas en el mismo lienzo se ven trabajar

---

## NV-01 · Debe ofrecer un árbol lateral con toda la estructura

- [x] El árbol muestra los espacios y, dentro, las páginas anidadas
- [x] Hay un solo árbol, no varias listas compitiendo
- [x] La página abierta se resalta en el árbol
- [x] Al abrir una página profunda el árbol se despliega hasta ella — recargando directo en una nieta, aparece visible y resaltada
- [~] El árbol se puede ocultar para ganar ancho de lectura — el control propio se retiró el 18/08/2026 por duplicar el plegado de la barra; plegar la barra es el gesto
- [x] El ancho del árbol se puede ajustar arrastrando
- [x] Un árbol con muchas páginas se desplaza sin ponerse lento — 600 páginas desplegadas: 145 fps de media, peor cuadro 9 ms

## NV-02 · Debe agrupar el contenido en espacios

- [x] Se puede crear un espacio
- [x] Se le puede poner nombre y descripción — ambos en la configuración del espacio; la descripción se lee en su entrada, y borrarla devuelve al espacio a no decir nada
- [x] Se ven solo los espacios a los que se tiene acceso — un espacio restringido no aparece para quien no es miembro, ni en el árbol ni en el filtro de la búsqueda
- [x] Se puede cambiar de espacio sin perder el contexto de navegación — el árbol conserva su estado
- [x] Un espacio vacío explica cómo empezar en vez de mostrar una pantalla en blanco

## NV-03 · Debe permitir reordenar el árbol con el mouse

- [x] Se puede arrastrar una página para cambiarla de posición entre sus hermanas — el borde de una fila la deja al lado, el centro la mete dentro; la marca dice cuál de las dos va a pasar, y el orden aguanta la recarga
- [x] Se puede arrastrar una página dentro de otra para anidarla
- [x] Se puede arrastrar una página a otro espacio
- [x] Mientras se arrastra se ve dónde va a caer
- [x] Al soltar, el orden se conserva al recargar
- [x] Arrastrar una madre lleva consigo a sus hijas
- [x] No se permite soltar una página dentro de su propia descendencia

## NV-04 · Debe permitir buscar contenido

- [x] Se busca por título y por contenido del cuerpo
- [x] Los resultados muestran un fragmento con el término resaltado
- [x] Se ve a qué espacio y a qué página madre pertenece cada resultado
- [x] Solo aparecen páginas a las que se tiene acceso — su contenido no se encuentra, y su dirección directa responde «Esta dirección no existe» sin delatar que existe
- [x] El texto de las menciones también es encontrable
- [x] Una búsqueda sin resultados lo dice claramente
- [x] Los resultados aparecen rápido y no bloquean la escritura

## NV-05 · Debe ofrecer un buscador rápido por teclado

- [x] Un atajo abre el buscador desde cualquier pantalla
- [x] Encuentra páginas escribiendo parte del título
- [x] Se navega con flechas y se abre con Enter
- [x] Escape lo cierra
- [x] Ofrece también acciones, no solo páginas (crear página, ir a un espacio)
- [x] Muestra las páginas recientes antes de escribir nada («Vistas recientemente»)

## NV-06 · Debe permitir afinar la búsqueda

- [x] Se puede filtrar por espacio
- [x] Se puede filtrar por autor
- [x] Se puede filtrar por fecha de edición
- [x] Se pueden combinar filtros
- [x] Los filtros aplicados se ven y se pueden quitar de a uno

## NV-07 · Debe permitir moverse como en cualquier sitio web

- [x] El botón atrás del navegador funciona
- [x] Cada página tiene su propia dirección compartible
- [x] Abrir un enlace en pestaña nueva funciona — el árbol usa enlaces reales
- [x] Recargar mantiene la posición de lectura
- [x] Una dirección inexistente muestra un error claro, no una pantalla rota — «Esta dirección no existe», con salida al inicio

## NV-08 · Debe ofrecer una entrada al espacio

- [x] Cada espacio tiene una pantalla de inicio
- [x] Muestra sus páginas principales
- [x] Muestra su actividad reciente
- [x] Desde ahí se accede a los miembros y a la configuración del espacio — los miembros se ven en la propia entrada, y «Configuración» lleva a donde se nombra y se describe el espacio

## NV-09 · Debe permitir asomarse a una página sin abrirla

**Cómo probarlo:** pasa el cursor sobre una mención, y después ábrela sin salir de la página actual.

- [x] Al pasar el cursor sobre una mención se ve una vista previa con su título y un fragmento
- [x] Lo mismo al pasar el cursor sobre un enlace interno
- [x] La vista previa muestra el ícono y las propiedades principales — el ícono es el de la página, no un emoji leído del título
- [x] Aparece con un pequeño retraso, no al rozarla sin querer — al rozar 200 ms no aparece; al descansar sí
- [x] Desaparece al alejar el cursor
- [x] La vista previa no aparece si uno no tiene acceso a esa página — dice «no tienes acceso» sin filtrar ni el título ni un fragmento; comprobado con el control en los dos sentidos, un enlace alcanzable y otro no

## NV-10 · Debe permitir abrir una página al costado

**Cómo probarlo:** abre una fila de una colección y comprueba que la colección sigue detrás.

- [x] Se puede abrir una página en un panel lateral sin perder la que se está leyendo — la dirección lo recuerda (`?panel=`), así que un enlace compartido o una recarga reabren lo mismo
- [x] La página de atrás sigue visible y mantiene su posición de lectura — dos editores montados a la vez, cada uno con su propia caja de lectura
- [x] Dentro del panel se puede editar con normalidad
- [x] Dentro del panel se ven y se editan las propiedades
- [x] Desde el panel se puede pasar a página completa
- [x] Se puede ampliar el ancho del panel — de 480 a 952 px, y el ancho se recuerda
- [x] Se puede navegar dentro del panel a otra página y volver atrás — dentro del mismo espacio; una página de otro espacio no abre el panel (límite conocido)
- [x] Al abrir una fila de una colección se abre así por defecto
- [x] Se puede elegir abrir en página completa en vez de al costado
- [x] El panel se cierra con Escape y con un clic afuera — sin atrapar el foco: no es un diálogo modal, la página de atrás se sigue leyendo
- [x] Al cerrarlo, los cambios ya quedaron guardados — escrito y cerrado con Escape de inmediato; el cambio estaba en la base
- [x] Lo editado en el panel se refleja de inmediato en la vista de atrás — la tabla de la colección de atrás mostró el cambio
- [x] En pantalla angosta el panel ocupa la pantalla completa en vez de encogerse — a 320 px ocupa los 320 sin desbordar

## NV-11 · Debe ofrecer un punto de partida personal

- [x] Existe una pantalla de inicio propia de cada persona
- [x] Muestra las páginas visitadas recientemente
- [x] Muestra lo que tiene asignado
- [ ] Muestra las novedades pendientes — no existe noción de leído/no leído en el sistema
- [x] Se puede llegar a ella desde cualquier parte

## NV-12 · Debe separar lo privado de lo compartido

- [x] Cada persona tiene un área privada que nadie más ve — se crea sola la primera vez que alguien mira sus espacios; ni siquiera un administrador ve la ajena
- [x] Una página privada se puede compartir después — solo su dueña, desde el inicio del propio espacio; quien la recibe no puede volver a compartirla
- [x] Existe una sección con lo que otras personas compartieron con uno — «Compartido contigo», aparte de los espacios propios y solo cuando hay algo dentro
- [x] Se distingue en el árbol qué es privado, qué es del espacio y qué es compartido — con marca y con palabra, no solo con un ícono
- [x] Una página privada no aparece en las búsquedas de nadie más — comprobado en los dos sentidos: invisible para quien no es de la casa, encontrable para su dueña

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 2026-08-17 | PG-10/11/12/13/16/17, NV-04/05 | La UI comprobó listado, búsqueda, restauración, eliminación permanente, vaciado, estrella, orden, información, apariencia, recientes, búsqueda y acciones. Se corrigió y volvió a probar quitar favoritas desde el portal; el filtro `sourceType=inventado` se ignora y el buscador rápido no mostró recientes al abrirse. No se ejecutaron los bloques restantes. | Parcial: una falla registrada |
| 2026-08-17 | PG-09, PG-10, NV-09 | Cascada al enviar a la papelera y restauración con hijas **verificadas contra PostgreSQL** (madre + 3 hijas, ida y vuelta); la confirmación dice el conteo real de hijas. La vista previa al pasar el cursor muestra título y fragmento, y se va al alejarse. Falta: que la página desaparezca del árbol (corregido en consolidación, sin volver a probar), que las menciones digan que fue eliminada, que se pueda eliminar desde el encabezado, y que la restauración explique dónde quedó si el padre ya no existe. | Parcial |
| 2026-08-17 | NV-05 (corrección de la fila anterior) | El buscador rápido **sí** muestra las recientes: tras visitar una página, Ctrl+K abre el grupo «Vistas recientemente» con ella dentro. La observación anterior se debió al perfil del navegador —las recientes viven en `localStorage` bajo `portal.recent-pages`— y no a un defecto. | Correcto |
| 2026-08-18 | PG-04, NV-01, NV-02 | Ícono de página y **de espacio** verificados en el navegador contra PostgreSQL: 1929 símbolos buscables por significado, color, azar por pestaña, cambio y renombrado desde los tres puntos del árbol sin abrir la página. El ícono del espacio se ve también con la barra plegada. Falta que el ícono aparezca en resultados de búsqueda y menciones. Se retiró la portada (PG-05) y el botón de ocultar el árbol: decía lo mismo que plegar la barra y usaba su mismo símbolo. | Parcial: una casilla pendiente |
| 2026-08-18 | Transversal (responsivo) | Recorrido a 320 px de inicio, espacios, espacio, página nueva, página, búsqueda, papelera, usuarios, cuenta y documentación. Corregido: el editor ganó 40 px de escritura (el carril de las manijas responde al ratón y en táctil no aparece), la papelera ya no desborda, el nombre del espacio pasó de 74 a 256 px, las tablas de la documentación se desplazan dentro de su caja, el título en Recientes pasó de 126 a 218 px, el panel móvil ya no deja una franja con la X flotando y esa X pasó de 16 a 44 px. Falta medir el inicio de sesión sin sesión activa. | Parcial: una pantalla sin medir |
| 2026-08-18 | PG-01/02/03/06/07/11/13/14/15/17, NV-01/02/05/07 | Recorrido de verificación en el navegador con una página QA real: creada, movida a nieta y a raíz (la ruta se actualizó), con adjunto subido, descargado, rechazado por 11 MB, eliminado, y al final página y archivo borrados para siempre —el archivo desapareció del disco—. Tipografía probada en vivo; buscador rápido con flechas, Enter y Escape; 404 claro; plegado del árbol persistente. **Hallazgos abiertos:** Enter en el título no baja al cuerpo; la pestaña del navegador nunca dice el título; crear exige título+botón antes de escribir; el destino de mover es un desplegable (no se busca escribiendo) y no cruza espacios; los resultados de búsqueda no dicen espacio ni madre; NV-06 sin interfaz de filtros; el título duplica `id="page-title"` en un nodo oculto. | Parcial: hallazgos anotados |
| 2026-08-18 | PG-01, PG-03, PG-05, PG-07 | Recorrido con página real, todo contrastado contra PostgreSQL y contra el disco. **Crear** ya no pide formulario: la página se crea vacía y uno cae en el título, que se guarda solo. **Enter** en el título baja al cuerpo. La **pestaña** dice el nombre de la página. La **portada** volvió y se verificó entera con una foto de 7,6 MB —subir, cambiar, reposicionar sin guardar hasta que se pide, quitar (borra el archivo)—, y sin portada no reserva espacio. **Mover** llega a otro espacio, se busca escribiendo, arrastra la descendencia y deja funcionando las direcciones viejas. Se reprodujo y corrigió el `id` duplicado del título: el enrutador mantiene montada la página anterior, así que dos campos compartían nombre. **Tres defectos nuevos encontrados y corregidos:** las acciones de servidor aceptaban 1 MB cuando la interfaz promete 10 (reventaba cualquier adjunto mediano, no solo la portada); las imágenes privadas daban 401 al pasar por el optimizador de Next, que las pide sin sesión (afectaba también a los íconos de imagen); y mover entre espacios dejaba a la persona en un «Esta dirección no existe». | Correcto |
| 2026-08-18 | NV-04, NV-06 | Se comprobó **en el código** que ya están construidos (los resultados muestran espacio y madre; hay filtros de espacio, tipo, etiquetas, autor y fecha, combinables y con chips). El recorrido de QA anterior los dio por ausentes contra un servidor de desarrollo viejo. **No se marcan**: falta verlos en el navegador. | Pendiente de verificar |
| 2026-08-18 | PG-08, PG-18, NV-03, NV-08, NV-11 | **Construido, sin verificar en el navegador.** Duplicar una página (con o sin su descendencia; la copia queda junto a la original). Bloquear una página: el backend **rechaza** escribir y renombrar una bloqueada, no solo se atenúa la pantalla. Arrastrar una página a otro espacio, y **reordenar los espacios arrastrando** (columna `order` nueva; migración aplicada a mano porque una migración anterior fue modificada después de aplicarse y Prisma pedía resetear la base). Pantalla de inicio del espacio con páginas principales, actividad reciente y miembros. «Asignadas a ti» en el inicio personal, leyendo las propiedades que la colección llama persona. Falta de NV-11: las novedades pendientes, que no tienen dónde apoyarse todavía. Falta de NV-08: la configuración del espacio (los miembros sí se ven). | Pendiente de verificar |
| 2026-08-19 | PG-08, PG-12, PG-18, NV-03, NV-04, NV-06, NV-07, NV-08, NV-11 | Recorrido en el navegador contra PostgreSQL de todo lo construido el día anterior. **Duplicar** conserva contenido, propiedades e ícono, dice «(copia)», pregunta por las hijas solo si las hay y deja la copia pegada a la original. **Bloquear** apaga editor, título y propiedades, se ve, se revierte con el mismo botón, y el backend responde `PAGE_LOCKED` 409. **Filtros** de espacio, autor y fecha combinados, con chips que se quitan de a uno. Los resultados dicen espacio y madre. **Arrastrar** anida, avisa dónde cae, se anuncia por `aria-live`, rechaza soltar en la propia descendencia, cruza espacios y arrastra la descendencia; reordenar espacios persiste. Inicio del espacio y «Asignadas a ti» comprobados con tres personas. **Dos defectos encontrados y corregidos:** la estrella del encabezado no seguía al servidor —quitar la página desde la barra lateral la dejaba diciendo «Quitar de favoritas», y el siguiente clic pedía quitar algo que ya no estaba—; y la posición de lectura nunca se restauró porque se guardaba y pedía sobre `window`, cuando quien se desplaza es la caja de lectura dentro del viewport. **Falta:** orden entre hermanas con el mouse, configuración del espacio y novedades pendientes; ninguna de las tres existe todavía. | Correcto |
| 2026-08-19 | PG-02, PG-04, PG-06, NV-01, NV-02, NV-04, NV-09 | Verificado con volumen y con una segunda persona. Un espacio **restringido** no aparece para quien no es miembro —ni en el árbol, ni en el filtro de espacios, ni en los resultados—, y su dirección directa responde «Esta dirección no existe» sin delatar que existe. Una rama de **ocho niveles** y un árbol de **600 páginas** desplegadas: 145 fps de media, peor cuadro 9 ms. La ruta de nueve tramos se acorta con «…» y conserva el último. **Cuatro defectos encontrados y corregidos:** la sangría del árbol crecía sin tope y a ocho niveles dejaba 93 px para un título de 354, así que ahora deja de crecer en la sexta generación; **renombrar una página y cambiarle el ícono no avisaban al índice**, de modo que una página renombrada se seguía encontrando por su nombre viejo para siempre; borrar del índice pedía olvidar con `Number.MAX_SAFE_INTEGER` contra una columna `integer`, así que la consulta reventaba, el evento reintentaba sin fin y **una página en la papelera seguía apareciendo en los resultados**; y la vista previa se escapaba al bajar a leerla —entrar en ella no cancelaba el cierre y el hueco de 40 px era tierra de nadie—. La vista previa ahora se alcanza, lleva dentro un enlace a la página, y muestra el ícono de la página en vez de un emoji leído del título. El ícono viaja hasta los resultados de búsqueda y hasta las menciones, donde se dibuja vivo. Se reindexaron las 97 páginas: todas tienen ya espacio y madre. | Correcto |
| 2026-08-20 | PG-07, PG-09, PG-10, PG-15, NV-09 | Cinco bloques construidos en paralelo por cuatro agentes y verificados **uno a uno en el navegador contra PostgreSQL**. Enviar a la papelera desde la propia página (botón de 44×44 en el encabezado, reutiliza el diálogo que ya existía, saca a la persona de la página y persiste). Las menciones a una página en la papelera se tachan y dicen «eliminada»; una mención a una página que la pantalla no tiene en la mano se dibuja normal. Al restaurar se dice dónde quedó: «volvió bajo Demo ES-01 a ES-07» o «volvió a la raíz de Engineering». Un archivo soltado en el contenido aparece también en la lista de adjuntos. Al mover a un espacio más cerrado avisa con el número de personas y pide confirmación; si nadie pierde acceso, el traslado ocurre sin paso extra. **Hallazgo de fondo:** `Page.parentId` tiene `ON DELETE SET NULL`, así que eliminar la madre para siempre borra el vínculo en el acto y el caso «madre inexistente» no se puede explicar sin recordar de dónde salió la página. **Corregidos dos textos propios:** el plural del aviso de acceso dejaba el verbo en singular, y el aviso de restauración decía «ya no existe» de una madre que sigue en la papelera. **Sin verificar:** que la vista previa no aparezca sin acceso — no se logró un control fiable con la segunda persona, así que la casilla queda sin marcar. | Correcto |
| 2026-08-20 | PG-14 | El panel de propiedades verificado con una fila real de la colección «Tasks»: cinco propiedades compactas por encima del contenido, cada una editable donde se ve —escribí en la descripción y quedó en base sin abrir ninguna pantalla—. **Corregido:** el panel decía «Esta página no tiene propiedades» mientras seguía mostrando la ubicación y los adjuntos, y el botón de revelar contaba esas dos secciones como si fueran propiedades. Ahora no se anuncia ningún vacío y el botón solo dice cuántas cosas quedan por ver. | Correcto |
| 2026-08-20 | PG-19, PG-20 | Dos bloques construidos en paralelo y verificados en el navegador contra PostgreSQL. **Confiabilidad:** marcar como verificada guarda quién y cuándo, la insignia dice sin abrir nada si está vigente o caducada, y el filtro de búsqueda discrimina —comprobado en los dos sentidos, no solo el negativo—. El filtro se resuelve en SQL contra `now()`, no contra un booleano congelado al indexar: moví la caducidad al pasado directamente en la base y la insignia se puso al día sola, **sin reescribir la página**. Responsable asignado y persistido. **Acciones masivas:** modo selección explícito con 54 casillas, contador a la vista y anunciado por `aria-live`, y envío en lote que arrastró la cascada de una colección con quince descendientes. El controlador no actúa dos veces sobre una página que ya cubre la cascada de su madre, recorriendo la cadena real de padres. **Corregido durante la revisión:** una etiqueta de caché duplicada en dos módulos —si divergen, la invalidación se rompe en silencio— unificada en `shared/`; un `catch` que se tragaba los errores del lote sin dejar rastro; y el selector de responsable, que no ofrecía a nadie porque las personas solo se pedían cuando el esquema madre tenía una propiedad de tipo persona. **Sin construir, por falta de cimientos:** avisar a quien mantiene una página caducada (no hay notificaciones ni tareas programadas) y exportar (no existe exportación de ninguna clase). | Correcto |
| 2026-08-20 | NV-10, NV-12, PG-21 | Tres bloques construidos en paralelo y verificados en el navegador contra PostgreSQL. **Panel lateral:** abre al costado sin perder la de atrás, con la dirección como memoria (`?panel=`), se ensancha de 480 a 952 px, se cierra con Escape y con un clic afuera sin atrapar el foco, y lo escrito justo antes de cerrar estaba en la base. A 320 px ocupa la pantalla entera. **Privado:** el área de cada persona se crea sola; ni siquiera un administrador ve la ajena —comprobado en el árbol, en la búsqueda y por dirección directa, y con el control inverso de que su dueña sí la encuentra—. Compartirla la hace aparecer en «Compartido contigo», aparte de los espacios propios. **Uso:** cuenta las visitas con quién y cuándo, se apaga, y apagado **deja de guardar**, no solo de mostrar: se visitaron dos páginas con el registro apagado y la cuenta no se movió; al reactivarlo volvió a contar. Quien no administra no ve el control, y el servidor rechaza a quien lo pida por su cuenta. **Defecto de seguridad corregido:** el buscador no usaba el filtro de visibilidad común y evaluaba en TypeScript si un rol podía leer los espacios restringidos, interpolando el resultado como literal en el SQL — para un administrador la cláusula quedaba en `OR true`, anulando toda la guarda: veía páginas de cualquier espacio, y habría visto las áreas privadas ajenas. Reescrito atando cada rama a su visibilidad, con prueba que falla si alguien vuelve a dejar un `true` suelto. **Corregido también:** la dueña de un área privada no podía renombrarla, porque renombrar exigía permiso de crear espacios. | Correcto |
| 2026-08-21 | PG-19 (exportar) | Exportación a Markdown, verificada en el navegador contra PostgreSQL. Se elige cuánto sale: una página, una página con todo lo que cuelga de ella, o el espacio entero. A una página sin hijas no se le pregunta nada; a una con hijas se le pregunta, y las dos respuestas se comprobaron: «Tasks» sola salió con una sola marca de página, y con sus subpáginas salió con catorce, el número exacto que la base tiene bajo esa madre. El espacio entero de Engineering salió en un archivo de 42 KB con las páginas en el orden del árbol y cada una abierta por la ruta donde vivía. Lo que Markdown ya sabe decir se escribió con su propia sintaxis; lo que no —menciones, personas, fechas, fórmulas, destacados, columnas, colecciones, plegables, marcadores— salió como enlace con su destino o como cerca `:::tipo` con sus datos, incluido un bloque que el esquema no conoce, que se conservó en vez de perderse. **Acceso comprobado en los dos sentidos:** un Worker que no pertenece al espacio restringido «Direccion» recibe 403, y el mismo espacio —que tiene dos páginas, una con una palabra secreta— sale entero para quien sí puede leerlo. Sin sesión, 401; un alcance inventado o una página sin decir cuál, 400. **Defecto encontrado y corregido:** la fórmula salía vacía (`$$`) porque el escritor buscaba `attrs.expression` y el esquema guarda `attrs.latex`; la prueba que tenía escrita repetía el mismo error, así que solo se vio al abrir el archivo real. | Correcto |
| 2026-08-21 | PG-01, NV-02, NV-03, NV-08, NV-09 | Cinco casillas sueltas cerradas y verificadas en el navegador. **Atajo:** `Ctrl`/`Cmd` + `Shift` + `N` crea una página en el espacio donde uno esté; lleva Shift para no pisar el atajo del navegador, y calla mientras se escribe —comprobado el control—. **Configuración del espacio:** pantalla propia con nombre y descripción, enlazada desde la entrada del espacio; la descripción se lee ahí y borrarla devuelve al espacio a no decir nada. **Orden entre hermanas:** soltar en el borde de una fila deja la página al lado, soltar en el centro la mete dentro, y la marca dice cuál de las dos va a pasar antes de soltar; «Review portal content» pasó de tercera a primera y aguantó la recarga. **Vista previa sin acceso:** dice «no tienes acceso» sin filtrar título ni fragmento, comprobado con control en los dos sentidos —el enlace alcanzable sí muestra su contenido—. La decisión de qué significa soltar se sacó a una función pura, igual que la de recolocar en una lista, que ahora comparten páginas y espacios en vez de tenerla escrita dos veces. | Correcto |
| 2026-08-28 | PG-04 (íconos) | Al subir la biblioteca de íconos a su versión 1, los **19 símbolos de marcas** (GitHub, Slack, Figma, Twitter, YouTube y demás) dejaron de existir: quien los publica los retiró. Se quitaron del selector, que pasa de 1929 a 1910 símbolos. Ninguna página del ejemplo los usaba. Traerlos de otra biblioteca queda como decisión pendiente. | Correcto |
