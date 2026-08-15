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

- [ ] Se cambia el color del texto seleccionado
- [ ] Se pone color de fondo al texto seleccionado
- [ ] Hay una paleta acotada, no un selector libre
- [ ] Los colores se leen bien en modo claro y en oscuro
- [ ] Se puede quitar el color y volver al predeterminado

## ES-05 · Debe ofrecer formato al seleccionar texto

- [ ] Al seleccionar aparece una barra flotante junto a la selección
- [ ] Ofrece negrita, cursiva, tachado, código y enlace
- [ ] Ofrece color de texto y de fondo
- [ ] Ofrece convertir el bloque en otro tipo
- [ ] Los botones reflejan el estado actual de la selección
- [ ] La barra desaparece al soltar la selección

## ES-06 · Debe permitir enlaces

- [ ] Ctrl+K sobre texto seleccionado abre el campo de enlace
- [ ] Se puede pegar una URL y queda enlazada
- [ ] Se puede buscar una página interna desde el mismo campo
- [ ] Al pasar el cursor sobre el enlace se puede editar o quitar
- [ ] Los enlaces internos abren dentro de la app, sin recarga completa
- [ ] Un enlace inválido se rechaza con un mensaje

## ES-07 · Debe permitir mencionar otra página

**Cómo probarlo:** escribe `@` después de un espacio, en medio de una frase.

- [ ] `@` abre el buscador de páginas
- [ ] Escribir filtra por título
- [ ] Funciona en medio de una frase, no solo al inicio de la línea
- [ ] Un correo como `juan@ejemplo.com` **no** dispara el menú
- [ ] La mención muestra el título de la página, no su identificador
- [ ] Al hacer clic se navega a la página mencionada
- [ ] Si la página cambia de título, la mención lo refleja
- [ ] Quien no tiene acceso al destino no ve su título
- [ ] La mención aparece como retroenlace en la página destino
- [ ] El buscador ofrece crear una página nueva con lo escrito si no existe

## ES-08 · Debe permitir mencionar a una persona

- [ ] `@` ofrece también personas, no solo páginas
- [ ] Se distingue visualmente una persona de una página
- [ ] La mención muestra el nombre de la persona
- [ ] Solo aparecen personas con acceso al espacio
- [ ] Al pasar el cursor se ve algo de esa persona
- [ ] La persona mencionada se entera

## ES-09 · Debe permitir mencionar fechas

- [ ] `@` permite insertar una fecha
- [ ] Hay atajos para hoy, mañana y ayer
- [ ] Se abre un calendario para elegir otra
- [ ] Se muestra en el formato e idioma del usuario
- [ ] Se puede editar una fecha ya insertada

## ES-10 · Debe permitir emoji y fórmulas en línea

- [ ] `:` seguido de letras abre el buscador de emoji
- [ ] Escribir filtra por nombre y Enter inserta
- [ ] Funciona igual en el título y en el cuerpo
- [ ] Se puede insertar una fórmula sin salir del párrafo
- [ ] La fórmula se renderiza junto al texto sin desalinear la línea

## ES-11 · Debe pegar contenido externo conservando la estructura

- [ ] Pegar desde otra página de la app conserva bloques y formato
- [ ] Pegar Markdown lo convierte en bloques reales
- [ ] Pegar HTML de un sitio conserva encabezados, listas y enlaces
- [ ] Ctrl+Shift+V pega como texto plano
- [ ] Pegar una URL sobre texto seleccionado lo convierte en enlace
- [ ] Pegar contenido enorme no rompe ni congela el editor

## ES-12 · Debe permitir buscar dentro de la página

- [ ] Un atajo abre buscar dentro de la página
- [ ] Resalta todas las coincidencias e indica cuántas hay
- [ ] Permite saltar de una a la siguiente
- [ ] Permite reemplazar una y reemplazar todas
- [ ] Encuentra texto dentro de bloques plegados y los abre al llegar

## ES-13 · Debe mostrar la estructura de la página

- [ ] Existe un panel con los encabezados de la página
- [ ] Al hacer clic se desplaza hasta él
- [ ] Marca en qué encabezado se está mientras se lee
- [ ] Refleja la jerarquía de niveles
- [ ] Se puede ocultar

## ES-14 · Debe guardar sin que haya que pedirlo

- [ ] Los cambios se guardan solos, sin botón
- [ ] Se indica cuándo terminó de guardar
- [ ] Si se pierde la conexión se avisa
- [ ] Al volver la conexión los cambios pendientes se envían
- [ ] Cerrar la pestaña con cambios recientes no los pierde
- [ ] Nunca aparece un error de guardado sin explicación de qué hacer

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 14/08/2026 | ES-03 | Faltaba casi todo: ninguna marca respondía al teclado —ni negrita, ni cursiva, ni código— y ni el subrayado ni el tachado existían en el contrato, así que no había nada que aplicar. Se agregaron las dos marcas y los cinco atajos, y quedaron en la misma lista que el editor obedece y el panel de atajos muestra, de modo que un atajo no puede estar puesto sin estar dicho ni dicho sin funcionar. Las marcas se combinan sobre el mismo texto y se quitan repitiendo el atajo. El subrayado se dibuja en el color de la escritura y no en el de un enlace: en una página donde todo enlace va subrayado, lo único que queda para distinguirlos es que uno de los dos no es un enlace. Probado en el navegador, incluida la comparación de un subrayado y un enlace en la misma pantalla. | 5 de 5 |
| 14/08/2026 | ES-02 | Los atajos de bloque ya andaban —los seis— pero el formato en línea no existía: `**negrita**` se quedaba tal cual. Se agregaron las cuatro reglas (`**`, `*`, `` ` ``, `~~`), que se llevan los signos con ellas, porque dejar los asteriscos sería responder a medias lo que se pidió. Dentro de un bloque de código no ocurre ninguna conversión: lo que se escribe ahí es lo que se quiso decir, signo por signo. Y aparecieron dos cosas al probar el deshacer. La primera: deshacer justo después de una conversión se llevaba también la línea entera, porque lo que la biblioteca recuerda para devolver el signo escrito se borra con cualquier cambio posterior, y repartir identidades a los bloques nuevos es un cambio; ahora ese reparto lleva consigo lo que la página acaba de recordar. La segunda, de paso: convertir una línea en encabezado le cambiaba la identidad —le daba un bloque nuevo—, cuando escribir `# ` delante de una línea cambia su forma y no cuál línea es; ahora conserva quién es, sus colores y lo que se comentó sobre ella, igual que cuando se convierte a mano desde el menú. | 10 de 10 |
| 14/08/2026 | ES-01 | No faltó nada. El cursor entra con un clic, la página vacía dice cómo empezar y nombra el menú `/`, lo escrito sobrevive a recargar, y escribir no arrastra: cuarenta y cuatro letras en 268 ms sobre una página vacía y cuarenta y dos en 214 ms sobre una de doscientos bloques, es decir cinco milisegundos por tecla en ambas. | 5 de 5 |
