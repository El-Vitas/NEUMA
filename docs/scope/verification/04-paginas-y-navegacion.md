# 02 · Páginas y navegación

Crear páginas, organizarlas, encontrarlas de nuevo.

> Leer `README.md` de esta carpeta antes de usar este documento.

---

## PG-01 · Debe permitir crear una página

- [ ] Hay un botón visible para crear una página desde el espacio
- [ ] Hay un botón para crear una página hija desde cualquier página del árbol
- [ ] La página nueva se abre lista para escribir, con el cursor en el título
- [ ] No obliga a completar un formulario antes de empezar a escribir
- [ ] Aparece de inmediato en el árbol lateral
- [ ] Se puede crear con un atajo de teclado
- [ ] Al crearla se puede elegir una plantilla en vez de empezar en blanco

## PG-02 · Debe permitir anidar páginas sin límite

- [ ] Una página puede contener páginas hijas
- [ ] Una hija puede tener sus propias hijas, y así sucesivamente
- [ ] La jerarquía se ve en el árbol lateral con indentación
- [ ] Cada rama se puede plegar y desplegar
- [ ] El estado plegado se conserva al navegar entre páginas
- [ ] Una rama profunda sigue siendo legible, no se corta el texto

## PG-03 · Debe permitir titular la página

- [ ] El título se escribe arriba del contenido, no en un campo aparte
- [ ] Enter en el título baja al cuerpo
- [ ] El título se actualiza en el árbol lateral mientras se escribe
- [ ] Una página sin título muestra un texto de marcador claro
- [ ] El título aparece en la pestaña del navegador

## PG-04 · Debe permitir ponerle un ícono a la página

**De dónde mirar la interacción:** `notion-clone-tutorial` resuelve bien el gesto —el botón aparece al pasar el cursor sobre la cabecera y no ocupa lugar cuando la página no tiene ícono. Ver `referencias-externas.md`.

- [ ] Hay un botón para agregar un ícono sobre el título
- [ ] Se puede elegir un emoji
- [ ] Se puede subir una imagen como ícono
- [ ] Hay una opción de ícono aleatorio
- [ ] El ícono se ve en el árbol lateral
- [ ] El ícono se ve en los resultados de búsqueda y en las menciones
- [ ] Se puede quitar

## PG-05 · Debe permitir una imagen de portada

**De dónde mirar la interacción:** misma referencia que PG-04 —la portada se cambia y se quita desde botones que solo aparecen sobre ella, y el contenido no salta al ponerla.

- [ ] Hay un botón para agregar una portada
- [ ] Se puede subir una imagen propia
- [ ] Se puede reposicionar verticalmente
- [ ] Se puede cambiar y quitar
- [ ] No empuja el contenido de forma que estorbe al escribir

## PG-06 · Debe mostrar dónde está uno parado

- [ ] Arriba de la página se ve la ruta desde el espacio hasta esta página
- [ ] Cada tramo de la ruta es navegable con un clic
- [ ] Una ruta muy profunda se acorta sin perder el último tramo
- [ ] La ruta se actualiza al mover la página

## PG-07 · Debe permitir mover una página

- [ ] Se puede mover a otro padre
- [ ] Se puede mover a otro espacio
- [ ] Se puede convertir en página raíz del espacio
- [ ] El destino se busca escribiendo, no en un desplegable interminable
- [ ] Las páginas hijas se mueven junto con la madre
- [ ] No se puede mover una página dentro de sí misma ni de sus descendientes
- [ ] Después de mover, los enlaces y menciones existentes siguen funcionando
- [ ] Al moverla a un espacio donde alguien pierde acceso, se advierte antes

## PG-08 · Debe permitir duplicar una página

- [ ] Hay una opción de duplicar
- [ ] La copia conserva el contenido, las propiedades y el ícono
- [ ] Se indica en el título que es una copia
- [ ] Se puede elegir si se duplican también las páginas hijas
- [ ] La copia queda junto a la original en el árbol

## PG-09 · Debe permitir enviar una página a la papelera

- [ ] Hay una opción de eliminar accesible desde la página y desde el árbol
- [ ] Pide confirmación antes de eliminar
- [ ] La página desaparece del árbol y de los resultados de búsqueda
- [ ] Las hijas se van a la papelera con ella
- [ ] Se avisa cuántas páginas hijas se van a eliminar
- [ ] Las menciones a esa página en otras páginas indican que fue eliminada

## PG-10 · Debe permitir ver y recuperar lo eliminado

- [ ] Existe una pantalla que lista las páginas en la papelera
- [ ] Se ve cuándo se eliminó cada una y quién lo hizo
- [ ] Se puede buscar dentro de la papelera
- [ ] Se puede restaurar una página y vuelve a su lugar original
- [ ] Si su padre ya no existe, la restauración explica dónde quedó
- [ ] Restaurar una madre ofrece restaurar también sus hijas

## PG-11 · Debe permitir eliminar definitivamente

- [ ] Desde la papelera se puede eliminar una página para siempre
- [ ] La confirmación deja claro que no tiene vuelta atrás
- [ ] Se puede vaciar la papelera completa
- [ ] Los archivos adjuntos de esa página también se eliminan

## PG-12 · Debe permitir marcar páginas como favoritas

- [ ] Hay una estrella o similar en la página
- [ ] Las favoritas aparecen en una sección propia arriba del árbol
- [ ] Se pueden reordenar las favoritas
- [ ] Se puede quitar de favoritas desde ambos lugares

## PG-13 · Debe permitir volver a lo reciente

- [ ] Existe una lista de páginas visitadas recientemente
- [ ] Está a un clic o un atajo de distancia
- [ ] Muestra el espacio al que pertenece cada una
- [ ] No repite la misma página varias veces

## PG-14 · Debe mostrar los datos de la página sin estorbar

- [ ] Las propiedades se ven arriba del contenido, compactas
- [ ] Una página sin propiedades no muestra un panel vacío
- [ ] Cada propiedad se edita en el mismo lugar donde se ve, sin abrir otra pantalla
- [ ] Con muchas propiedades se pliegan y hay un "mostrar más"
- [ ] La ubicación y los adjuntos se ven ahí mismo, no en un panel aparte
- [ ] El bloque no empuja el contenido tan abajo que haya que desplazarse para escribir
- [ ] En pantalla angosta sigue siendo usable

## PG-15 · Debe permitir adjuntar archivos a la página

- [ ] Se pueden subir archivos a la página
- [ ] Se ve nombre, tipo, peso y quién lo subió
- [ ] Se pueden descargar
- [ ] Se pueden eliminar
- [ ] Se avisa si el archivo excede el tamaño permitido
- [ ] Se ve el progreso de subida
- [ ] Un archivo insertado en el contenido aparece también en esta lista

## PG-16 · Debe informar sobre la página

- [ ] Se puede ver quién la creó y cuándo
- [ ] Se puede ver quién la editó por última vez y cuándo
- [ ] Se puede ver el conteo de palabras
- [ ] Esta información no ocupa espacio permanente en pantalla

## PG-17 · Debe permitir ajustar cómo se ve la página

- [ ] Se puede pasar la página a ancho completo
- [ ] Se puede reducir el tamaño del texto
- [ ] Se puede elegir la tipografía entre unas pocas opciones
- [ ] La elección se guarda por página, no de forma global
- [ ] El cambio se aplica sin recargar

## PG-18 · Debe permitir bloquear una página

- [ ] Una página se puede bloquear contra ediciones accidentales
- [ ] Bloqueada, el contenido se lee pero no se edita
- [ ] Se ve claramente que está bloqueada
- [ ] Quien tiene permiso la puede desbloquear
- [ ] El bloqueo aplica también a las propiedades

## PG-19 · Debe permitir actuar sobre varias páginas a la vez

- [ ] Se pueden seleccionar varias páginas en una lista
- [ ] Se pueden mover todas juntas a otro padre o espacio
- [ ] Se pueden enviar todas juntas a la papelera
- [ ] Se pueden exportar todas juntas
- [ ] Se ve cuántas hay seleccionadas
- [ ] La acción se puede cancelar antes de aplicarse

## PG-20 · Debe permitir saber si una página es confiable

- [ ] Una página se puede marcar como verificada
- [ ] Se ve quién la verificó y cuándo
- [ ] Se puede definir una fecha en que la verificación caduca
- [ ] Al caducar, la página lo indica y avisa a quien la mantiene
- [ ] Se puede asignar una persona responsable de la página
- [ ] Se puede filtrar la búsqueda por páginas verificadas

## PG-21 · Debe informar del uso de la página

- [ ] Se puede ver cuántas veces se ha visto la página
- [ ] Se puede ver quiénes la vieron y cuándo
- [ ] Quien no tiene permiso de administrar no ve esta información
- [ ] Se puede desactivar este registro

---

## NV-01 · Debe ofrecer un árbol lateral con toda la estructura

- [ ] El árbol muestra los espacios y, dentro, las páginas anidadas
- [ ] Hay un solo árbol, no varias listas compitiendo
- [ ] La página abierta se resalta en el árbol
- [ ] Al abrir una página profunda el árbol se despliega hasta ella
- [ ] El árbol se puede ocultar para ganar ancho de lectura
- [ ] El ancho del árbol se puede ajustar arrastrando
- [ ] Un árbol con muchas páginas se desplaza sin ponerse lento

## NV-02 · Debe agrupar el contenido en espacios

- [ ] Se puede crear un espacio
- [ ] Se le puede poner nombre y descripción
- [ ] Se ven solo los espacios a los que se tiene acceso
- [ ] Se puede cambiar de espacio sin perder el contexto de navegación
- [ ] Un espacio vacío explica cómo empezar en vez de mostrar una pantalla en blanco

## NV-03 · Debe permitir reordenar el árbol con el mouse

- [ ] Se puede arrastrar una página para cambiarla de posición entre sus hermanas
- [ ] Se puede arrastrar una página dentro de otra para anidarla
- [ ] Se puede arrastrar una página a otro espacio
- [ ] Mientras se arrastra se ve dónde va a caer
- [ ] Al soltar, el orden se conserva al recargar
- [ ] Arrastrar una madre lleva consigo a sus hijas
- [ ] No se permite soltar una página dentro de su propia descendencia

## NV-04 · Debe permitir buscar contenido

- [ ] Se busca por título y por contenido del cuerpo
- [ ] Los resultados muestran un fragmento con el término resaltado
- [ ] Se ve a qué espacio y a qué página madre pertenece cada resultado
- [ ] Solo aparecen páginas a las que se tiene acceso
- [ ] El texto de las menciones también es encontrable
- [ ] Una búsqueda sin resultados lo dice claramente
- [ ] Los resultados aparecen rápido y no bloquean la escritura

## NV-05 · Debe ofrecer un buscador rápido por teclado

- [ ] Un atajo abre el buscador desde cualquier pantalla
- [ ] Encuentra páginas escribiendo parte del título
- [ ] Se navega con flechas y se abre con Enter
- [ ] Escape lo cierra
- [ ] Ofrece también acciones, no solo páginas (crear página, ir a un espacio)
- [ ] Muestra las páginas recientes antes de escribir nada

## NV-06 · Debe permitir afinar la búsqueda

- [ ] Se puede filtrar por espacio
- [ ] Se puede filtrar por autor
- [ ] Se puede filtrar por fecha de edición
- [ ] Se pueden combinar filtros
- [ ] Los filtros aplicados se ven y se pueden quitar de a uno

## NV-07 · Debe permitir moverse como en cualquier sitio web

- [ ] El botón atrás del navegador funciona
- [ ] Cada página tiene su propia dirección compartible
- [ ] Abrir un enlace en pestaña nueva funciona
- [ ] Recargar mantiene la posición de lectura
- [ ] Una dirección inexistente muestra un error claro, no una pantalla rota

## NV-08 · Debe ofrecer una entrada al espacio

- [ ] Cada espacio tiene una pantalla de inicio
- [ ] Muestra sus páginas principales
- [ ] Muestra su actividad reciente
- [ ] Desde ahí se accede a los miembros y a la configuración del espacio

## NV-09 · Debe permitir asomarse a una página sin abrirla

**Cómo probarlo:** pasa el cursor sobre una mención, y después ábrela sin salir de la página actual.

- [ ] Al pasar el cursor sobre una mención se ve una vista previa con su título y un fragmento
- [ ] Lo mismo al pasar el cursor sobre un enlace interno
- [ ] La vista previa muestra el ícono y las propiedades principales
- [ ] Aparece con un pequeño retraso, no al rozarla sin querer
- [ ] Desaparece al alejar el cursor
- [ ] La vista previa no aparece si uno no tiene acceso a esa página

## NV-10 · Debe permitir abrir una página al costado

**Cómo probarlo:** abre una fila de una colección y comprueba que la colección sigue detrás.

- [ ] Se puede abrir una página en un panel lateral sin perder la que se está leyendo
- [ ] La página de atrás sigue visible y mantiene su posición de lectura
- [ ] Dentro del panel se puede editar con normalidad
- [ ] Dentro del panel se ven y se editan las propiedades
- [ ] Desde el panel se puede pasar a página completa
- [ ] Se puede ampliar el ancho del panel
- [ ] Se puede navegar dentro del panel a otra página y volver atrás
- [ ] Al abrir una fila de una colección se abre así por defecto
- [ ] Se puede elegir abrir en página completa en vez de al costado
- [ ] El panel se cierra con Escape y con un clic afuera
- [ ] Al cerrarlo, los cambios ya quedaron guardados
- [ ] Lo editado en el panel se refleja de inmediato en la vista de atrás
- [ ] En pantalla angosta el panel ocupa la pantalla completa en vez de encogerse

## NV-11 · Debe ofrecer un punto de partida personal

- [ ] Existe una pantalla de inicio propia de cada persona
- [ ] Muestra las páginas visitadas recientemente
- [ ] Muestra lo que tiene asignado
- [ ] Muestra las novedades pendientes
- [ ] Se puede llegar a ella desde cualquier parte

## NV-12 · Debe separar lo privado de lo compartido

- [ ] Cada persona tiene un área privada que nadie más ve
- [ ] Una página privada se puede compartir después
- [ ] Existe una sección con lo que otras personas compartieron con uno
- [ ] Se distingue en el árbol qué es privado, qué es del espacio y qué es compartido
- [ ] Una página privada no aparece en las búsquedas de nadie más

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| | | | |
