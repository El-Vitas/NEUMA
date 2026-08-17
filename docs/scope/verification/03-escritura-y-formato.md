# 03 · Escritura y formato

Lo que ocurre **dentro** de un bloque: escribir, dar formato, mencionar, buscar y guardar.

> Leer `README.md` de esta carpeta antes de usar este documento.
>
> Crear, mover y anidar bloques está en `01-bloques.md`. Qué tipos existen, en `02-tipos-de-bloque.md`.

---

## ES-01 · Debe permitir escribir con fluidez

**Cómo probarlo:** abre cualquier página y escribe.

- [x] El cursor se coloca en el cuerpo con un clic
- [x] Escribir muestra el texto sin retraso perceptible
- [x] El texto sobrevive al recargar la página
- [x] Escribir mucho texto no hace que la página se sienta lenta
- [x] Una página vacía sugiere cómo empezar y menciona el menú `/`

## ES-02 · Debe reconocer atajos de Markdown al escribir

- [x] `#`, `##`, `###` para encabezados
- [x] `-`, `*`, `+` para viñetas
- [x] `1.` para lista numerada
- [x] `[]` para tarea
- [x] `>` para cita
- [x] `---` para separador
- [x] ` ``` ` para bloque de código
- [x] `**`, `*`, `` ` ``, `~~` para formato en línea
- [x] Ninguna conversión ocurre dentro de un bloque de código
- [x] Ctrl+Z inmediatamente después revierte la conversión y deja el texto tal cual

## ES-03 · Debe permitir formato dentro de la línea

- [x] Ctrl+B negrita, Ctrl+I cursiva, Ctrl+E código
- [x] Ctrl+U subrayado, y hay atajo para tachado
- [x] Los formatos se combinan sobre el mismo texto
- [x] Se quitan volviendo a aplicar el mismo atajo
- [x] El subrayado se distingue visualmente de un enlace

## ES-04 · Debe permitir color y resaltado del texto

- [x] Se cambia el color del texto seleccionado
- [x] Se pone color de fondo al texto seleccionado
- [x] Hay una paleta acotada, no un selector libre
- [x] Los colores se leen bien en modo claro y en oscuro
- [x] Se puede quitar el color y volver al predeterminado

## ES-05 · Debe ofrecer formato al seleccionar texto

- [x] Al seleccionar aparece una barra flotante junto a la selección
- [x] Ofrece negrita, cursiva, tachado, código y enlace
- [x] Ofrece color de texto y de fondo
- [x] Ofrece convertir el bloque en otro tipo
- [x] Los botones reflejan el estado actual de la selección
- [x] La barra desaparece al soltar la selección

## ES-06 · Debe permitir enlaces

- [x] Ctrl+K sobre texto seleccionado abre el campo de enlace
- [x] Se puede pegar una URL y queda enlazada
- [x] Se puede buscar una página interna desde el mismo campo
- [x] Al pasar el cursor sobre el enlace se puede editar o quitar
- [x] Los enlaces internos abren dentro de la app, sin recarga completa
- [x] Un enlace inválido se rechaza con un mensaje

## ES-07 · Debe permitir mencionar otra página

**Cómo probarlo:** escribe `@` después de un espacio, en medio de una frase.

- [x] `@` abre el buscador de páginas
- [x] Escribir filtra por título
- [x] Funciona en medio de una frase, no solo al inicio de la línea
- [x] Un correo como `juan@ejemplo.com` **no** dispara el menú
- [x] La mención muestra el título de la página, no su identificador
- [x] Al hacer clic se navega a la página mencionada
- [x] Si la página cambia de título, la mención lo refleja
- [ ] Quien no tiene acceso al destino no ve su título
- [x] La mención aparece como retroenlace en la página destino
- [x] El buscador ofrece crear una página nueva con lo escrito si no existe

## ES-08 · Debe permitir mencionar a una persona

- [x] `@` ofrece también personas, no solo páginas
- [x] Se distingue visualmente una persona de una página
- [x] La mención muestra el nombre de la persona
- [x] Solo aparecen personas con acceso al espacio
- [x] Al pasar el cursor se ve algo de esa persona
- [ ] La persona mencionada se entera

## ES-09 · Debe permitir mencionar fechas

- [x] `@` permite insertar una fecha
- [x] Hay atajos para hoy, mañana y ayer
- [x] Se abre un calendario para elegir otra
- [x] Se muestra en el formato e idioma del usuario
- [x] Se puede editar una fecha ya insertada

## ES-10 · Debe permitir emoji y fórmulas en línea

- [x] `:` seguido de letras abre el buscador de emoji
- [x] Escribir filtra por nombre y Enter inserta
- [x] Funciona igual en el título y en el cuerpo
- [x] Se puede insertar una fórmula sin salir del párrafo
- [x] La fórmula se renderiza junto al texto sin desalinear la línea

## ES-11 · Debe pegar contenido externo conservando la estructura

- [x] Pegar desde otra página de la app conserva bloques y formato
- [x] Pegar Markdown lo convierte en bloques reales
- [x] Pegar HTML de un sitio conserva encabezados, listas y enlaces
- [x] Ctrl+Shift+V pega como texto plano
- [x] Pegar una URL sobre texto seleccionado lo convierte en enlace
- [x] Pegar contenido enorme no rompe ni congela el editor

## ES-12 · Debe permitir buscar dentro de la página

- [x] Un atajo abre buscar dentro de la página
- [x] Resalta todas las coincidencias e indica cuántas hay
- [x] Permite saltar de una a la siguiente
- [x] Permite reemplazar una y reemplazar todas
- [x] Encuentra texto dentro de bloques plegados y los abre al llegar

## ES-13 · Debe mostrar la estructura de la página

- [x] Existe un panel con los encabezados de la página
- [x] Al hacer clic se desplaza hasta él
- [x] Marca en qué encabezado se está mientras se lee
- [x] Refleja la jerarquía de niveles
- [x] Se puede ocultar

## ES-14 · Debe guardar sin que haya que pedirlo

- [x] Los cambios se guardan solos, sin botón
- [x] Se indica cuándo terminó de guardar
- [x] Si se pierde la conexión se avisa
- [x] Al volver la conexión los cambios pendientes se envían
- [x] Cerrar la pestaña con cambios recientes no los pierde
- [x] Nunca aparece un error de guardado sin explicación de qué hacer

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 16/08/2026 | ES-05 | Reabierto por uso: la barra se quedaba flotando sobre un texto que ya nadie tenía elegido. ProseMirror conserva su selección cuando pierde el foco —para devolvértela al volver—, y la barra se decidía mirando esa selección recordada, así que al pinchar en el título, en el menú lateral o en cualquier otro campo, la barra seguía ahí, encima de la escritura y estorbando. Ahora la barra pertenece al momento de elegir: se va en cuanto quien lee se marcha a otra parte de la página. No se va, en cambio, porque se haya metido en el menú de la propia barra —eso sigue siendo la barra— ni porque se haya salido de la ventana entera, que no es irse a otro sitio sino apartarse. Comprobado en el navegador los cuatro casos: con la selección viva está; al pinchar el título se va; con su menú abierto se queda; y al colapsar la selección con las flechas se va. | 6 de 6 |
| 16/08/2026 | ES-09 | No existía. Ahora `@` ofrece los días junto a las páginas y las personas, en la misma lista y ordenados por lo escrito: hoy, mañana, ayer y elegir otro. El día se calcula en el huso del lector y no en UTC, que es como «mañana» termina siendo hoy: probado en el navegador a las 22:05 del 15 en Santiago, `@hoy` escribió el 15 y «Mañana» el 16, mientras en UTC ya era 16. Se muestra en el idioma y el formato del lector. Para elegir otro día o cambiar uno ya escrito se abre el calendario del propio navegador —un calendario de verdad, con teclado, en el idioma del lector y sin agregar ninguna dependencia—, y lo elegido se escribe en una sola transacción, rechazando un día que no existe como el 30 de febrero. Al probarlo apareció que una fecha nombrada estiraba su línea de 27 a 44 píxeles: se le había puesto el tamaño mínimo de un objetivo táctil, que es una regla para controles que un dedo debe acertar y no para una palabra dentro de una frase. Ahora la fecha mide lo que mide la línea. | 5 de 5 |
| 16/08/2026 | ES-08 | Se agregó nombrar a una persona con `@`. La misma lista ofrece páginas, personas y días, ordenada por cercanía a lo escrito y no agrupada por tipo, porque quien escribe `@ana` no está pensando «voy a mencionar una persona»: está buscando a Ana. Solo aparecen los miembros del espacio de esa página, con el mismo control de acceso que el resto. Una persona se distingue de una página por su propio icono, y al pasar el cursor se ve su nombre y, cuando el dato está a mano, la dirección con que se la alcanza. Al probarlo apareció que decía «Alguien que ya no está» sobre una persona recién elegida: el dato se buscaba en una lista que casi siempre llega vacía y el «no la encuentro» se contaba como «se fue». Se quitó ese mensaje entero, porque con lo que el editor tiene no hay forma honesta de distinguir una cosa de la otra. Queda sin marcar que la persona se entere: no existe ningún sistema de notificaciones en el producto —ni un módulo en el backend—, y fingirlo sería peor que no tenerlo. | 5 de 6 |
| 16/08/2026 | ES-10 | Se completó lo que faltaba. La fórmula en línea se inserta desde el menú `/` sin salir del párrafo, se escribe y se reescribe en un campo que abre la propia fórmula al pulsarla, y se guarda en una sola transacción. La dibuja katex, que ya era dependencia; una fórmula que katex no entiende se muestra tal como fue escrita, diciendo por qué, en vez de romper la página o dejar un hueco. Y no desalinea la línea: medido en la app, un párrafo con fórmula y otro sin ella dan la misma altura, incluso con una fracción y una raíz, que son lo más alto que katex dibuja. El buscador de emoji funciona ya también en el título, que es un campo de texto llano y no el editor: se anuncia como campo de texto y solo pasa a ser lista desplegable mientras de verdad ofrece algo. Queda anotado un borde: insertar una fórmula desde el menú deja el hueco escrito pero no abre solo su campo, así que hay que pulsarla. | 5 de 5 |
| 15/08/2026 | ES-12 | No existía nada: no se podía buscar dentro de una página. Se agregó, con Ctrl+F y con el mismo mecanismo con que la página ya se pide cosas a sí misma. Resalta todas las coincidencias y dice cuántas son, salta de una a la siguiente dando la vuelta, y reemplaza una o todas en un solo paso deshacible. Lo que estaba plegado se abre al llegar: un encabezado cerrado que esconde una coincidencia se abre solo, y solo ese —la primera versión abría de paso los pliegues vecinos, y quien había cerrado una sección la encontraba abierta sin haberla tocado—. Buscar no ensucia el historial: deshacer no debe devolverte una búsqueda en vez de tu última frase. Aparecieron dos cosas al probarlo en el navegador que ninguna prueba veía: el plegado de mayúsculas y acentos suponía que doblar una letra nunca cambia el largo del texto, y con una letra que sí lo cambia todas las posiciones se corrían —el resaltado caía sobre las letras equivocadas y el reemplazo habría cortado donde no era—; y la búsqueda se moría en silencio cuando el editor cambiaba de estado al conectar la edición colaborativa: el panel seguía abierto, con la palabra escrita, contando «Sin coincidencias». | 5 de 5 |
| 15/08/2026 | ES-11 | Solo se manejaba un archivo pegado y una dirección suelta. Ahora un pegado se decide antes de tocar la página: lo que viene de esta misma app lo restaura el editor tal cual; lo que trae HTML de un sitio conserva encabezados, listas y enlaces; el Markdown se lee y se convierte en los mismos bloques que se escriben a mano, con sus marcas; Ctrl+Shift+V pega sin formato; y una dirección sobre texto elegido enlaza ese texto en vez de reemplazarlo. Lo enorme no cuelga el editor: por encima de un límite se pega como texto y se dice por qué. Dos cosas salieron probando y no de leer. La primera: pegar como texto plano metía todo en un solo bloque, y como la página rechaza un bloque más largo de lo que acepta, cuanto más grande el pegado más seguro era que no se pudiera guardar; ahora lo pegado se une a la escritura donde cae y solo lo del medio es bloque propio. Copiar un encabezado y una lista de una página de la app y pegarlos en otra los deja tal cual, comprobado en el navegador. La segunda, y peor: al meter el traductor en las dependencias del pegado, cada render creaba una función nueva y el editor entero se reconstruía con cada tecla —la letra se perdía y el foco moría—; la etiqueta vive ahora en un ref, como el resto del módulo, y hay una prueba de que esa función no cambia entre renders. | 6 de 6 |
| 15/08/2026 | ES-14 | Guardarse solo ya lo hacía; faltaba todo lo que rodea a eso. Ahora la página dice en qué está: guardando, guardado a tal hora, o que hay algo sin guardar, en un solo lugar —el encabezado— y no en dos, que era lo que quedaba al agregarlo sin mirar lo que ya había. Cerrar la pestaña con algo sin guardar avisa, y solo entonces. Un error de guardado nunca aparece solo: siempre dice qué hacer. Y apareció el fallo más grave de la noche, que ninguna prueba podía ver: el estado de la conexión se leía durante el primer dibujo de la página, y como Node define un `navigator` sin `onLine`, el servidor decidía que estaba sin conexión y el navegador que sí; React rehacía ese trozo del árbol y el editor quedaba agarrado a un nodo que ya no estaba en la página, de modo que no se podía escribir en ninguna parte de la aplicación. Nada que dependa del navegador se lee ya durante el primer dibujo. Los dos puntos de la conexión quedaron comprobados en el navegador, de punta a punta: se quita la conexión y la página dice «Sin conexión. Lo escrito se guarda en cuanto vuelva.»; se escribe y no sale ni una petición —comprobado antes que el detector de peticiones sí veía una cuando había conexión, para no confiar en un cero que pudiera ser del método—; y al devolverla dice «Volvió la conexión: se está guardando lo pendiente.» y enseguida «Guardado a las 21:08», con una sola petición. Queda anotado un borde: en una página recién creada, mientras la lista de páginas sigue siendo la de antes, el aviso de guardado no aparece —se guarda igual, comprobado contra la base de datos: lo escrito segundos después de crearla estaba almacenado— pero quien escribe no ve que se guardó hasta recargar. | 6 de 6 |
| 15/08/2026 | ES-13 | Cuatro de cinco ya estaban del riel que se construyó con el índice de TB-19: el panel existe, lleva a cada encabezado, marca en cuál se está mientras se baja —comprobado bajando hasta el final de una página larga— y refleja la jerarquía con la sangría de cada nivel (0, 12 y 24 píxeles para H1, H2 y H3). Y ahora se puede ocultar: un botón junto al título del índice lo cierra dejando en su lugar con qué traerlo de vuelta, dice con `aria-expanded` en qué estado está, y la elección se recuerda al recargar del mismo modo que la del menú lateral —leída después de montar, nunca durante el primer dibujo—. | 5 de 5 |
| 15/08/2026 | ES-10 | La mitad: el buscador de emoji. `:` seguido de letras lo abre —nunca un `:` solo, ni dentro de `12:30`, ni en `http://`— y filtra por nombre en español y en inglés, sin importar acentos ni mayúsculas, de modo que `:corazon` y `:heart` llegan al mismo sitio. Enter escribe el carácter, que es texto y no un bloque nuevo. La lista está escrita a mano, sin agregar ninguna dependencia. Queda para la ola siguiente lo que necesita contrato nuevo: la fórmula en línea, cuyo nodo ya está en el contrato compartido, y que el buscador funcione también en el título, que hoy es un campo de texto llano y no el editor. | 2 de 5 |
| 15/08/2026 | ES-07 | Faltaba una cosa de las diez: el buscador no ofrecía crear la página nombrada, se limitaba a desaparecer. Nombrar una página que todavía no existe es como suele empezar una página —primero el pensamiento y después la página—, así que ahora, cuando ninguna se llama así, la última entrada del buscador es hacerla: se crea colgando de la página donde se escribió y queda mencionada en el mismo lugar. Al probar el resto aparecieron dos cosas. Una, arreglada: seguir una mención recargaba el navegador entero, porque lo que responde al clic estaba puesto en el nodo y una mención se dibuja con su propia vista; ahora responde el editor, y una página nombrada en medio de una frase se sigue igual que un enlace. La otra, no arreglada y anotada aparte: dos proyecciones —la búsqueda y los retroenlaces— leen la misma bandeja de eventos y la primera que toma uno lo marca como hecho, así que con las dos corriendo cada guardado llega solo a una. Con la proyección de enlaces corriendo, el retroenlace aparece. Queda sin marcar que quien no tiene acceso al destino no vea su título: hoy la mención guarda el nombre con que se insertó y lo muestra cuando no puede leer la página, de modo que el título se filtra; distinguir «no tienes acceso» de «está en otro espacio» exige que el servidor lo diga. | 9 de 10 |
| 14/08/2026 | ES-06 | Faltaba todo el enlace hecho a mano: existía la marca en el contrato y la regla de Markdown `[texto](url)`, pero no había forma de poner un enlace sobre algo ya escrito. Se agregó un campo que se abre con Ctrl+K o desde la barra, y que hace una sola pregunta —a dónde va esto— porque desde donde uno está, una dirección y el nombre de una página responden lo mismo: si lo escrito es una dirección se enlaza, y si no, se busca entre las páginas y se elige una. Lo que no es ningún sitio se rechaza diciéndolo, en vez de quedar escrito como un enlace roto. Un enlace ya escrito se alcanza dejando el puntero encima: aparece una burbuja con a dónde va y las dos únicas cosas que se le pueden hacer, cambiarlo o quitarlo, porque meter el cursor dentro de un enlace es también la forma de seguirlo. Y seguir un enlace a una página de la propia app ya no recarga el navegador entero. Al probarlo apareció que el contrato solo aceptaba direcciones absolutas, así que una página interna no se podía guardar; ahora un enlace puede llevar también a un sitio de esta app, y esa verdad quedó en el paquete compartido en lugar de estar escrita dos veces. | 6 de 6 |
| 14/08/2026 | ES-05 | La barra ya aparecía y ya reflejaba el estado de lo elegido, pero le faltaban dos cosas de las que la lista pide: el enlace y —lo mismo, visto de otro lado— que el botón de enlace dijera que lo elegido ya es un enlace. Se agregó a la fila principal, junto a negrita, cursiva, subrayado, tachado y código, y se le dio la marca que lo hace responder como los demás. Además, la barra y la burbuja de un enlace ya no se pisan: sobre las mismas palabras solo puede haber una cosa flotando, y mientras el puntero descansa en un enlace manda la burbuja. | 6 de 6 |
| 14/08/2026 | ES-04 | El color en línea no existía: solo se podía pintar un bloque entero, cuando quien elige cuatro palabras y busca un color quiere esas cuatro. Se agregaron las dos marcas —color de la escritura y color de fondo— con la misma paleta acotada de ocho colores que ya usan los bloques, más «sin color» para volver al predeterminado; no hay selector libre, de modo que nada puede quedar ilegible sobre el papel de la página. Cada color tiene su lectura de día y de noche, y se comprobaron ambas sobre el mismo texto: el fondo es un tinte, no un bloque sólido. Los dos colores se combinan sobre las mismas palabras y sobreviven a recargar. | 5 de 5 |
| 14/08/2026 | ES-03 | Faltaba casi todo: ninguna marca respondía al teclado —ni negrita, ni cursiva, ni código— y ni el subrayado ni el tachado existían en el contrato, así que no había nada que aplicar. Se agregaron las dos marcas y los cinco atajos, y quedaron en la misma lista que el editor obedece y el panel de atajos muestra, de modo que un atajo no puede estar puesto sin estar dicho ni dicho sin funcionar. Las marcas se combinan sobre el mismo texto y se quitan repitiendo el atajo. El subrayado se dibuja en el color de la escritura y no en el de un enlace: en una página donde todo enlace va subrayado, lo único que queda para distinguirlos es que uno de los dos no es un enlace. Probado en el navegador, incluida la comparación de un subrayado y un enlace en la misma pantalla. | 5 de 5 |
| 14/08/2026 | ES-02 | Los atajos de bloque ya andaban —los seis— pero el formato en línea no existía: `**negrita**` se quedaba tal cual. Se agregaron las cuatro reglas (`**`, `*`, `` ` ``, `~~`), que se llevan los signos con ellas, porque dejar los asteriscos sería responder a medias lo que se pidió. Dentro de un bloque de código no ocurre ninguna conversión: lo que se escribe ahí es lo que se quiso decir, signo por signo. Y aparecieron dos cosas al probar el deshacer. La primera: deshacer justo después de una conversión se llevaba también la línea entera, porque lo que la biblioteca recuerda para devolver el signo escrito se borra con cualquier cambio posterior, y repartir identidades a los bloques nuevos es un cambio; ahora ese reparto lleva consigo lo que la página acaba de recordar. La segunda, de paso: convertir una línea en encabezado le cambiaba la identidad —le daba un bloque nuevo—, cuando escribir `# ` delante de una línea cambia su forma y no cuál línea es; ahora conserva quién es, sus colores y lo que se comentó sobre ella, igual que cuando se convierte a mano desde el menú. | 10 de 10 |
| 14/08/2026 | ES-01 | No faltó nada. El cursor entra con un clic, la página vacía dice cómo empezar y nombra el menú `/`, lo escrito sobrevive a recargar, y escribir no arrastra: cuarenta y cuatro letras en 268 ms sobre una página vacía y cuarenta y dos en 214 ms sobre una de doscientos bloques, es decir cinco milisegundos por tecla en ambas. | 5 de 5 |
