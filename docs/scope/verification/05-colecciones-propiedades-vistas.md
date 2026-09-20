# 05 · Colecciones, propiedades y vistas

La parte estructurada. Una colección es **un bloque que lleva un esquema**: propiedades tipadas y vistas sobre un conjunto de filas, donde cada fila es una página completa.

> Leer `README.md` de esta carpeta antes de usar este documento.
>
> Que la colección se comporte como cualquier otro bloque —arrastrarla, anidarla, duplicarla, insertarla en medio de un texto— se revisa en `01-bloques.md` y `02-tipos-de-bloque.md` (`TB-23`). Aquí se revisa lo que ocurre **dentro** de ella.

## Cómo está construido hoy

Una colección **no es una entidad aparte**: es una página que lleva un esquema,
y sus filas son sus páginas hijas. Las propiedades de cada fila viven en la
página misma. Por eso una fila se abre, se mueve y se enlaza como cualquier
página — porque lo es.

Existen ocho tipos de propiedad (título, texto, selección simple, selección
múltiple, persona, fecha, casilla y número) y dos vistas (tabla y tablero).

El servidor ya sabe filtrar, ordenar y agrupar. Cada opción de una selección
lleva su nombre y su color. La forma de una colección se cambia después de
crearla, desde el botón junto a las pestañas de vistas: agregar propiedades
propias, renombrarlas, quitarlas, y decidir qué opciones ofrece una selección y
de qué color es cada una.

Un tablero se mueve: una tarjeta arrastrada a otra columna cambia el valor que
esa columna representa, y lo mismo se hace con el teclado. Por qué propiedad
agrupa el tablero se elige desde esa misma configuración, y el tablero escribe
la propiedad que le toca, sea cual sea. Cada vista decide además qué propiedades
enseña, y esa elección es suya y no de la colección.

Sobre las filas hay una barra con dos botones: qué deja pasar la vista y en qué
orden salen. Cada uno dice cuántas condiciones lleva puestas sin abrirlo, y lo
que se elige se guarda en la vista, no en quien mira.

Un tablero además puede agrupar por dos propiedades a la vez: la segunda dibuja
**bandas que cruzan** el tablero, y cada banda repite todas las columnas para
que se lean alineadas. Agrupa por lo que sea —también por una fecha o un
número, que no declaran opciones—, derivando los grupos de lo que las filas
tienen puesto.

En la tabla, una celda se responde donde está: se vuelve su propio campo al
tocarla y solo manda la propiedad que se tocó. Y cada columna puede decir al pie
lo que quiera de todas sus filas juntas —contarlas, sumarlas, promediarlas—,
siempre sobre las que la vista dejó pasar.

Desde el tablero se manda sobre las columnas: se agrega una, se renombra —y el
nombre nuevo se escribe también en cada fila que llevaba el viejo, en la misma
operación—, se pinta, y se quita avisando a cuántas filas deja sin valor. Una
columna **es** un valor de la propiedad, así que lo que se le hace se ve en
todas las vistas, no solo en la que está delante.

Cada vista guarda además cómo la está mirando quien la mira: qué columnas tiene
plegadas, qué tope le puso a cada una, y si esconde la de las filas sin valor.
Eso no cambia lo que las filas guardan, así que no se ve desde las otras vistas.

La tabla también manda sobre sus columnas: el ancho se arrastra del borde, el
sitio se cambia tomándolas del asa, y se puede dejar quietas las primeras al
desplazarse a lo ancho. Eso es de la vista, no de la colección.

Una tabla también agrupa si se lo piden: cada grupo abre con una franja que dice
de qué es y cuántas filas lleva, se pliega, y cierra con la misma cuenta que
eligió la vista aplicada a lo suyo. Cruzar en bandas sigue siendo del tablero,
que es quien dibuja dos dimensiones.

La lista y la galería ya existen: leen las mismas filas que la tabla, una tras
otra o en grupos, y lo que cambia es cuánto sitio le dan a cada una. El
calendario también: pone cada fila en el día que dice.

**Lo que falta ahora** es la línea de tiempo, y del calendario, los rangos: eso
sí depende de que una fecha pueda ser un desde-hasta y no un solo día.

Nada de eso cuenta como verificado: está escrito aquí para saber por dónde
empezar a probar, no para ahorrarse la prueba.

## Lo que queda para una segunda etapa

Estas cuatro capacidades —`PR-10` relaciones, `PR-11` cálculos, `PR-12`
fórmulas y `VW-07` línea de tiempo— **no se miden todavía**.

Las tres primeras no son más propiedades: necesitan un grafo de dependencias
entre colecciones y recálculo cuando algo cambia, que es construir medio motor
de base de datos. La línea de tiempo dibuja barras entre dos fechas, así que
depende de que una fecha pueda ser un desde-hasta.

`VW-06` salió de aquí el 2026-09-14: el calendario resultó no depender de nada
de eso, porque colocar por un día solo pide la fecha que ya existe.

Están escritas aquí para no perderlas, pero cuentan aparte: mientras esta
sección exista, el documento se da por completo sin ellas.

---

## CO-01 · Debe permitir convertir una página en colección

- [ ] Desde una página cualquiera se puede agregar un esquema y volverla colección
- [ ] La acción es encontrable sin saber de antemano dónde está
- [ ] Al hacerlo se ofrece partir de una plantilla o desde cero
- [x] La colección sigue teniendo cuerpo de página: se puede escribir arriba de la tabla
- [ ] Se puede quitar el esquema y volver a ser página normal
- [ ] Al quitarlo se advierte qué pasa con las filas existentes

## CO-02 · Debe tratar cada fila como una página completa

- [ ] Al hacer clic en una fila se abre como página, con su cuerpo editable
- [ ] Se puede abrir de lado sin perder la vista de la colección
- [ ] Dentro de la fila abierta se ven y se editan sus propiedades
- [ ] Una fila puede tener contenido largo, adjuntos y subpáginas
- [ ] Las filas aparecen anidadas bajo la colección en el árbol lateral
- [ ] Se puede elegir por colección cómo se abren sus filas: al costado, al centro o a página completa
- [ ] En la fila abierta se pueden ocultar las propiedades sin valor
- [ ] Al editar una fila, la vista de la colección se actualiza sin recargar
- [ ] Si otra persona edita una fila, el cambio se ve en la vista abierta

## CO-03 · Debe permitir agregar filas desde la vista

- [ ] Hay un botón para agregar una fila al final
- [ ] Se puede agregar una fila dentro de un grupo y hereda el valor de ese grupo
- [ ] Se puede escribir el título de la fila nueva sin salir de la vista
- [ ] La fila nueva aparece de inmediato, sin recargar
- [ ] Se puede crear una fila a partir de una plantilla de la colección

## CO-04 · Debe permitir organizar la colección como cualquier página

- [ ] Aparece en el árbol lateral como una página más
- [ ] Se puede mover a otro espacio
- [ ] Se puede duplicar, y la copia conserva el esquema y las vistas
- [ ] Se puede enviar a la papelera, y se advierte que arrastra sus filas
- [ ] No existe una sección separada de "bases de datos" fuera del árbol

## CO-05 · Debe permitir jerarquía dentro de una colección

- [ ] Una fila puede tener subfilas dentro de la misma colección
- [ ] La vista de tabla permite plegar y desplegar las subfilas
- [ ] Se puede convertir una fila en subfila de otra

## CO-06 · Debe permitir mover contenido dentro y fuera de la colección

- [ ] Se puede arrastrar una página existente dentro de la colección y pasa a ser una fila
- [ ] Al entrar, se le asignan las propiedades del esquema vacías, sin perder su contenido
- [ ] Se puede sacar una fila de la colección y vuelve a ser página normal
- [ ] Al salir se advierte que se pierden los valores de las propiedades
- [ ] Se pueden mover varias filas a la vez
- [ ] Se puede mover una fila a otra colección con el mismo esquema

## CO-07 · Debe verse igual esté donde esté

Una colección se puede mirar en dos sitios: ocupando su propia página, o metida
dentro de otra página como un bloque más. Es el mismo dato con distinto marco,
así que lo que se hace en uno se ve en el otro. Que la página en sí pueda ser la
colección se revisa en `04-paginas-y-navegacion.md` (`PG-22`).

- [ ] Una colección ocupa su propia página, con la barra de vistas arriba
- [ ] La misma colección se puede insertar dentro de otra página
- [ ] Editar desde cualquiera de los dos sitios cambia el mismo dato
- [ ] Los dos sitios ofrecen las mismas acciones sobre las filas
- [ ] Se pasa de un sitio al otro sin perder vistas, filtros ni valores
- [ ] Una vista insertada en otra página puede llevar filtro y orden propios, sin tocar los de la colección
- [ ] Se puede insertar la vista de una colección que vive en otro espacio, si se tiene permiso
- [ ] Quien no puede leer la colección no ve sus datos donde esté insertada

---

## PR-01 · Debe permitir definir las propiedades de la colección

> Se llega desde el botón junto a las pestañas de vistas, y solo lo ve quien
> puede escribir la página. Nada viaja hasta que se guarda. Comprobado en el
> navegador el 2026-08-25.
>
> El ciclo entero se rehízo el 2026-08-28 contra PostgreSQL: se agregó «Área»
> —cuya clave quedó `area`, derivada de un nombre con tilde—, se le dio la
> opción «Backend» en verde, se asignó ese valor a una fila desde el panel, y
> después se quitó la propiedad; el esquema volvió a sus seis propiedades sin
> dejar la fila trabada.

- [x] Se puede agregar una propiedad — de cualquier tipo salvo título, con la clave derivada del nombre
- [x] Se puede renombrar — cambia la etiqueta, no la clave bajo la que las filas guardaron
- [x] Se puede cambiar su tipo, y se advierte qué pasa con los datos existentes — se dice que lo ya guardado se queda como está y hay que volver a responderlo
- [ ] Al cambiar de selección a texto, los valores quedan como texto legible
- [ ] Al cambiar de texto a selección, los valores existentes se convierten en opciones
- [ ] Al cambiar a número, lo que no es número queda vacío y se avisa cuántas filas se pierden
- [ ] Un cambio de tipo sin conversión posible se rechaza en vez de vaciar la columna en silencio
- [ ] El cambio de tipo se puede deshacer
- [ ] Se puede eliminar, con confirmación — se elimina, pero sin preguntar antes
- [ ] Se puede reordenar arrastrando
- [ ] Se puede marcar como obligatoria
- [ ] Se puede duplicar una propiedad con su configuración
- [x] Existe siempre una propiedad de título, y es la que abre la página
- [x] La propiedad de título no se puede eliminar ni duplicar — el panel no lo ofrece y el servidor lo rechazaría
- [x] La propiedad de título se puede renombrar
- [ ] Cambiar el título de la fila cambia el título de la página, y al revés

## PR-02 · Debe ofrecer texto y número

- [ ] Texto: admite varias líneas y no se corta al perder el foco — una sola línea
- [x] Número: rechaza letras — el campo es numérico y no las admite
- [ ] Número: permite elegir formato (entero, decimal, moneda, porcentaje)
- [ ] Número: se puede mostrar como barra de progreso
- [x] Ambos se editan directamente en la celda de la tabla

## PR-03 · Debe ofrecer selección simple y múltiple

> Una opción se guarda con su nombre y su color, de un conjunto cerrado de
> nueve. El color nunca dice nada por sí solo: el nombre viaja siempre al lado.
> Registrado en `docs/business-rules/fea-clc.yaml`.

- [x] Se pueden definir las opciones disponibles — desde la configuración de la colección, agregando y quitando
- [x] Cada opción tiene un color — se elige de una paleta de nueve, con todos a la vista
- [ ] Se puede crear una opción nueva escribiéndola desde la celda — desde la configuración, y como columna desde el tablero
- [x] Se pueden reordenar y renombrar las opciones — las dos cosas desde su columna en el tablero, que es lo que una opción es ahí
- [x] Renombrar una opción actualiza todas las filas que la usan — la forma y las filas se reescriben en la misma operación
- [x] Selección múltiple permite quitar valores de a uno
- [x] Las opciones se ven como etiquetas de color, no como texto plano

## PR-04 · Debe ofrecer estado con fases

- [ ] Existe un tipo estado, distinto de selección
- [ ] Las opciones se agrupan en fases (pendiente, en curso, terminado)
- [ ] El tablero puede agrupar por estas fases
- [ ] Se ve el avance de forma visual

## PR-05 · Debe ofrecer personas

- [ ] Se asigna buscando por nombre — se elige de una lista, sin escribir para filtrar
- [x] Se muestra el **nombre** de la persona, nunca su identificador
- [x] Se ve el nombre correcto tanto en la tabla como en el panel de propiedades
- [ ] Solo aparecen personas con acceso al espacio
- [ ] Se pueden asignar varias personas
- [ ] Se puede quitar una asignación
- [ ] La persona asignada se entera de alguna forma

> Comprobado en el navegador el 2026-08-28, y corregido ahí mismo. La tabla y las
> tarjetas mostraban el identificador crudo de la persona —`019fd484-862c-…`—
> mientras el panel lateral sí decía su nombre: solo el panel recibía el
> directorio del espacio. Ahora lo reciben también la tabla y el tablero, y las
> tres dicen «Worker User». A quien el directorio ya no reconoce se le nombra
> como miembro desconocido, en palabras; mientras el directorio no ha llegado no
> se dice nada, porque enseñar el identificador es lo único que no puede pasar.

## PR-06 · Debe ofrecer fechas

- [ ] Se elige desde un calendario
- [ ] Se puede escribir la fecha a mano
- [ ] Admite rango de fechas (inicio y fin)
- [ ] Admite incluir la hora
- [ ] Se muestra en el formato e idioma del usuario
- [ ] Se puede limpiar el valor
- [ ] Se puede poner un recordatorio

## PR-07 · Debe ofrecer casilla de verificación

- [x] Se marca y desmarca con un clic en la celda
- [x] El valor se refleja de inmediato — se dibuja antes de que el servidor conteste, y vuelve solo si contesta que no
- [ ] Se puede agrupar y filtrar por marcado / no marcado — agrupar sí, comprobado; filtrar está construido pero sin probar

## PR-08 · Debe ofrecer enlace, correo y teléfono

- [ ] Enlace: se abre en pestaña nueva al hacer clic
- [ ] Correo: abre el cliente de correo
- [ ] Teléfono: permite llamar desde móvil
- [ ] Los tres validan el formato y avisan si está mal

## PR-09 · Debe ofrecer archivos como propiedad

- [ ] Se pueden subir archivos a una celda
- [ ] Se ve una miniatura si es imagen
- [ ] Se pueden descargar y eliminar
- [ ] Admite varios archivos en la misma celda

## PR-10 · Debe ofrecer relaciones entre colecciones

- [ ] Se puede crear una propiedad que apunta a filas de otra colección
- [ ] Se busca la fila destino escribiendo
- [ ] Se pueden relacionar varias filas
- [ ] La colección destino muestra la relación inversa
- [ ] Se puede navegar a la fila relacionada con un clic
- [ ] Eliminar una fila relacionada no deja una referencia rota visible

## PR-11 · Debe ofrecer cálculos sobre las relaciones

- [ ] Se puede traer un valor desde las filas relacionadas
- [ ] Se puede sumar, contar, promediar, y tomar mínimo y máximo
- [ ] El valor se recalcula solo cuando cambia el origen

## PR-12 · Debe ofrecer fórmulas

- [ ] Se puede escribir una fórmula que use otras propiedades
- [ ] Hay ayuda de las funciones disponibles al escribir
- [ ] Los errores de fórmula se explican en vez de mostrar un valor vacío
- [ ] El resultado se recalcula al cambiar los datos de origen

## PR-13 · Debe ofrecer los datos automáticos de la página

- [ ] Creado por
- [ ] Fecha de creación
- [ ] Última edición por
- [ ] Fecha de última edición
- [ ] Estos valores no se pueden editar a mano
- [ ] Se pueden usar para filtrar y ordenar

## PR-14 · Debe entender lo que se escribe o se pega en una celda

**Cómo probarlo:** copia una fecha desde una hoja de cálculo y pégala en una celda de tipo fecha.

- [ ] Escribir texto en una celda de fecha lo interpreta como fecha
- [ ] Escribir texto en una celda de número lo interpreta como número
- [ ] Escribir en una celda de selección elige la opción, o la crea si no existe
- [ ] Escribir varios valores separados por coma en una celda de selección múltiple los asigna todos
- [ ] Lo que no se puede interpretar se rechaza avisando, sin borrar lo que había
- [ ] Copiar una celda entrega un texto legible, no un identificador
- [ ] Se puede copiar un rango de celdas y pegarlo en otra parte
- [ ] Se puede pegar una columna entera desde una hoja de cálculo

---

## VW-01 · Debe ofrecer una vista de tabla

- [x] Las filas se ven con sus propiedades en columnas
- [x] Se puede editar una celda sin abrir la fila — la celda se vuelve su propio campo, y solo viaja lo que se tocó
- [x] Se puede ajustar el ancho de las columnas — arrastrando su borde, y también con Alt y las flechas
- [x] Se pueden reordenar las columnas arrastrando — de su asa, y también con Alt y las flechas
- [x] Se pueden congelar las primeras columnas al desplazarse — desde el menú de la columna hasta la que se diga
- [x] Se puede mostrar un cálculo al pie de cada columna — se elige ahí mismo y se guarda en la vista
- [x] Los cálculos incluyen contar, contar vacías y contar con valor
- [x] En columnas numéricas incluyen suma, promedio, mínimo, máximo y mediana
- [x] En columnas de casilla incluyen el porcentaje marcado
- [x] El cálculo respeta el filtro aplicado
- [x] Con agrupación, cada grupo muestra su propio cálculo — el mismo que eligió la vista, sobre las filas de ese grupo
- [x] Una tabla ancha se desplaza dentro de sí misma sin romper la página — mide lo que suman sus columnas y se desplaza en su marco

## VW-02 · Debe ofrecer un tablero y permitir mover tarjetas con el mouse

**Cómo probarlo:** abre una colección en vista tablero y arrastra una tarjeta de una columna a otra.

- [x] Las filas se ven como tarjetas agrupadas en columnas
- [x] Se elige por qué propiedad se agrupa — desde la configuración, y solo ofrece las que se pueden agrupar
- [x] Se puede arrastrar una tarjeta de una columna a otra
- [x] Al soltarla, el valor de la propiedad cambia solo
- [x] El cambio persiste al recargar — comprobado contra la base, no solo en pantalla
- [x] Se puede reordenar una tarjeta dentro de su misma columna
- [x] Mientras se arrastra se ve dónde va a caer — se marca el hueco entre las dos tarjetas donde caería
- [ ] Otra persona viendo el mismo tablero ve el movimiento — no hay tiempo real en las colecciones
- [x] Se puede crear una tarjeta directamente en una columna — nace con el valor de esa columna puesto
- [x] Se elige qué propiedades se muestran en la tarjeta — y la propiedad por la que agrupa no se repite en ella
- [x] Se pueden ocultar columnas vacías — se pide en la vista, y mientras se arrastra una tarjeta vuelven a aparecer
- [x] Se ve el conteo de tarjetas por columna
- [x] Cada columna se ve con el color de la opción que representa
- [x] Si no hay propiedad de agrupación configurada, se explica qué hacer
- [x] Una tarjeta se puede mover sin ratón, solo con el teclado — con Alt y las flechas
- [x] Al moverla con el teclado se anuncia dónde quedó
- [x] Arrastrar hacia el borde desplaza el tablero solo

> Comprobado en el navegador el 2026-08-25. Una tarjeta arrastrada de `todo` a
> `in_progress` cambió el valor en la base, y el tablero se rehízo sin recargar.
> Lo mismo con el teclado, anunciado por `aria-live`. Soltar una tarjeta en su
> propia columna no escribe nada. A quien solo puede leer no se le deja arrastrar,
> y el servidor rechaza el intento hecho por fuera con 403.
>
> Ampliado el 2026-08-28. La agrupación se cambia desde la configuración: la
> vista pasó de agrupar por `Status` a agrupar por `Priority`, el tablero se
> rehízo en columnas `low`, `medium`, `high` y sin asignar, y `groupBy` quedó
> guardado en la base. **El tablero escribe la propiedad por la que agrupa, sea
> cual sea:** con esa agrupación, mover una tarjeta cambió su `priority` y dejó
> intacto su `status`. Qué muestra una tarjeta también se elige ahí: quitar
> `Description` la sacó de las tarjetas y del registro guardado, y la propiedad
> por la que se agrupa nunca se repite dentro de la tarjeta que ya está en su
> columna.

## VW-03 · Debe permitir manejar las columnas del tablero

Arrastrar tarjetas es la mitad de un tablero; la otra mitad es mandar sobre las
columnas. Una columna **es** un valor de la propiedad por la que se agrupa, así
que tocarla aquí toca esa propiedad en toda la colección — y eso tiene que verse
venir antes de que pase.

**Cómo probarlo:** en una colección agrupada por estado, agrega una columna,
renómbrala, muévela de sitio y borra una que tenga tarjetas dentro.

- [x] Se puede agregar una columna desde el tablero, y aparece como valor nuevo de la propiedad
- [x] Se puede renombrar una columna, y el valor cambia en todas las filas que lo tenían
- [x] Se puede reordenar una columna arrastrándola, y el orden persiste — de su asa, y también con Alt y las flechas
- [x] Se puede pintar una columna de un color, y ese color viaja con el valor a las demás vistas
- [x] Se puede plegar una columna para dejarla como una franja angosta
- [x] Una columna plegada sigue diciendo cuántas tarjetas tiene — y cómo se llama
- [x] Al borrar una columna con tarjetas dentro se avisa cuántas quedarán sin valor
- [x] Las filas de una columna borrada quedan sin valor, no se borran
- [x] Hay una columna para las filas sin valor, y se puede ocultar — se oculta solo mientras esté vacía: esconder una columna nunca esconde filas
- [x] Se puede fijar un tope de tarjetas por columna
- [x] Pasado el tope, la columna lo dice sin impedir soltar
- [x] Se puede agrupar por una segunda propiedad y ver bandas que cruzan las columnas — cada banda repite todas las columnas, para que se lean alineadas
- [x] Lo que se cambia de las columnas es de la vista, y no altera lo que ven las otras vistas de la misma colección — plegarlas, sus topes y ocultar la de sin valor son de la vista; el nombre y el color son del valor y se ven en todas, y eso se dice antes de tocarlos

> Comprobado en el navegador el 2026-09-10 contra PostgreSQL. **Renombrar
> arrastra a las filas:** la opción se renombró en su sitio y con su color
> puesto, y la fila que decía el nombre viejo pasó a decir el nuevo en la misma
> operación. El nombre nuevo se ve también en la tabla, porque es del valor y no
> de la vista. **Quitar una columna** pregunta antes, diciendo cuántas filas deja
> sin valor, y al confirmar la fila conserva todo lo demás: pierde solo esa
> propiedad y cae en «sin asignar». **Dos columnas con el mismo nombre** no se
> dejan: se dice cuál es la que ya existe, sin llegar a preguntárselo al
> servidor. La columna de las filas sin valor no ofrece acciones, porque no es
> ningún valor que se pueda tocar.
>
> Ampliado el mismo día con lo que es de la vista y no del valor. **Plegada**,
> una columna queda en una franja de 44 px que sigue diciendo cómo se llama y
> cuántas lleva, y se despliega tocándola; queda guardado en la vista. **El
> tope** se escribe en la propia cabecera, la cuenta pasa a leerse «2/1», y al
> pasarse lo dice sin impedir soltar: se arrastró una tarjeta a una columna con
> tope 1 y entró igual, con el aviso puesto. **La columna de sin valor** se
> oculta y se vuelve a mostrar desde el tablero, y vuelve sola en cuanto alguna
> fila se queda sin valor: esconder una columna nunca esconde filas. **De
> sitio** se cambia tomándola de su asa y soltándola sobre la columna ante la
> cual debe quedar —o sobre «agregar columna» para dejarla al final—, y también
> con Alt y las flechas, porque arrastrar no puede ser la única manera. Ese
> orden es de la propiedad, así que es el mismo en todas las vistas.

## VW-04 · Debe ofrecer una vista de lista

- [x] Muestra las filas como lista simple, sin cuadrícula
- [x] Se elige qué propiedades acompañan a cada entrada
- [x] Es cómoda de leer para páginas de contenido, no solo de datos

## VW-05 · Debe ofrecer una vista de galería

- [x] Muestra las filas como tarjetas grandes
- [ ] Se elige el tamaño de las tarjetas
- [x] La tarjeta se lee sin imagen — las portadas se retiraron del alcance el 18/08/2026

## VW-06 · Debe ofrecer una vista de calendario

- [x] Las filas se ubican por una propiedad de fecha — se elige cuál en la configuración de la vista
- [x] Se navega entre meses — y sin viajar al servidor, porque las filas ya están todas en pantalla
- [x] Se puede arrastrar una entrada a otro día y la fecha cambia — y también con Alt y las flechas
- [x] Se puede crear una fila haciendo clic en un día — nace con esa fecha puesta
- [ ] Un rango de fechas se ve extendido sobre los días que abarca — una fecha es un día, no un desde-hasta (`PR-06`)

## VW-07 · Línea de tiempo — fuera de este pase

La declara `../future-scope.md`, y `../current-scope.md` dice que calendario y
línea de tiempo no entran en la ronda de completitud actual. El calendario se
adelantó porque la fecha ya existía y agrupaba; la línea de tiempo necesita
además que una fecha sea un desde-hasta (`PR-06`). Se revisará cuando se abra
como su propio trabajo, con sus casillas escritas entonces.

## VW-08 · Debe permitir filtrar

- [x] Se puede filtrar por cualquier propiedad
- [x] Cada tipo ofrece condiciones que le corresponden (contiene, es, está vacío, antes de)
- [x] Se pueden combinar varios filtros con "y" / "o"
- [x] Se pueden anidar grupos de condiciones — un grupo dentro del de arriba, que son los tres niveles que el contrato admite
- [x] Los filtros aplicados se ven arriba y se quitan de a uno — el botón dice cuántos hay puestos
- [x] El filtro se guarda con la vista
- [x] Se ve cuántas filas quedaron de cuántas — «0 de 3 filas», junto a los botones de filtrar y ordenar
- [x] Un filtro que no deja nada explica que hay filas ocultas — y dice cuántas son y qué hacer para volver a verlas

> Comprobado en el navegador el 2026-08-28 contra PostgreSQL. Una condición
> `Status es done` dejó 4 filas de 13, y el filtro quedó guardado en la vista.
> Los operadores que se ofrecen son los de esa clase de propiedad —una fecha no
> «contiene»—, y el campo del valor desaparece cuando el operador no pregunta
> por ninguno. Una selección ofrece sus opciones en vez de pedir que se
> escriban.
>
> **Defecto encontrado y corregido en el camino:** el filtro se guardaba pero no
> volvía. Al leer la configuración, el backend descartaba los `null`, y una
> condición sin valor —la que se acaba de crear, o cualquiera con «está
> vacío»— perdía su campo `value`; sin él la condición dejaba de validar y con
> ella el filtro entero, que volvía como si nadie hubiera filtrado.

## VW-09 · Debe permitir ordenar

- [x] Se puede ordenar por cualquier propiedad
- [x] Ascendente y descendente
- [x] Se puede ordenar por varias propiedades en cadena
- [x] El orden se guarda con la vista
- [x] Se puede volver al orden manual — quitando el orden, las filas vuelven al suyo

> Comprobado en el navegador el 2026-08-28. Ordenar por `Due date` puso las
> filas de la más antigua a la más nueva, invertirlo las dio vuelta, y ambas
> cosas quedaron guardadas en la vista. Una propiedad ya usada no se ofrece
> otra vez: ordenar dos veces por lo mismo no ordena más.

## VW-10 · Debe permitir agrupar

- [x] Se puede agrupar por una propiedad en cualquier vista — el tablero siempre, la tabla cuando se lo piden
- [x] Solo se ofrecen para agrupar las propiedades que tienen sentido agrupar
- [x] Agrupar por fecha permite elegir el tramo: día, semana, mes — se elige junto a por dónde agrupa, y solo aparece con una fecha puesta
- [x] Agrupar por casilla produce dos grupos, marcado y sin marcar
- [x] Agrupar por selección crea un grupo por opción, incluido "sin valor"
- [x] Cada grupo muestra su conteo
- [x] Los grupos se pliegan y despliegan — las columnas del tablero y las franjas de la tabla, y queda guardado en la vista
- [x] Se pueden reordenar los grupos — los del tablero arrastrando su columna, los de una tabla con las flechas de su franja
- [x] Se pueden ocultar los grupos vacíos — se pide en la vista, y vale igual para las franjas de una tabla y las columnas de un tablero
- [ ] Al arrastrar una fila entre grupos, el valor cambia solo si esa propiedad admite escritura — hoy todas la admiten: no hay ninguna que se calcule sola (`PR-11`, `PR-12`)
- [ ] Si no la admite (por ejemplo un cálculo), no se permite arrastrar y se explica por qué — no hay caso que probar hasta que existan las calculadas

## VW-11 · Debe permitir elegir qué se muestra

- [x] Se puede ocultar una propiedad en una vista sin borrarla
- [x] Cada vista guarda sus propias propiedades visibles
- [x] Se puede reordenar lo que se muestra — moviendo las columnas de la tabla, que es lo mismo dicho desde donde se ve

> Comprobado en el navegador el 2026-08-28. Quitar `Description` del tablero la
> sacó de las tarjetas y dejó la tabla intacta, con cada vista guardando su
> propia lista. Una vista que nunca eligió muestra todo, que es distinto de
> elegir no mostrar nada.

## VW-12 · Debe permitir varias vistas de la misma colección

- [x] Se pueden crear varias vistas sobre las mismas filas — desde la configuración, en cualquier momento
- [x] Se cambia entre ellas con pestañas — la vista abierta va en la dirección, así que un tablero se manda por enlace
- [x] Cada vista tiene nombre e ícono — un emoji, que acompaña al nombre en su pestaña
- [x] Cada vista conserva su propio filtro, orden y agrupación — y las tres se cambian desde la configuración de esa vista
- [x] Se puede duplicar, renombrar y eliminar una vista — la copia queda pegada a la original y nunca se lleva la delantera
- [x] Se puede definir cuál es la vista por defecto — es la que abre cuando la dirección no nombra ninguna
- [x] Se puede convertir una vista de tabla en tablero, y al revés — y a lista o galería, que son clases como las otras
- [x] Al convertir se conserva lo que sigue aplicando: filtros, orden y propiedades visibles
- [x] Lo que no aplica al tipo nuevo se descarta avisando
- [x] Convertir una vista no altera las filas

## VW-13 · Debe permitir buscar dentro de la colección

- [x] Hay un buscador propio de la colección — sobre la tabla, y responde al teclear
- [x] Busca en el título y en las propiedades de texto — sin acentos ni mayúsculas de por medio
- [x] Los resultados respetan los filtros aplicados — busca entre lo que el filtro dejó pasar, y dice cuántas encontró de cuántas

## VW-14 · Debe ofrecer gráficos sobre los datos de la colección

- [x] Se puede crear un gráfico a partir de una colección — es una clase de vista más, elegida al crearla
- [x] Se elige qué propiedad va en cada eje — la agrupación es el eje de abajo, y qué mide es el de al lado
- [x] Hay barras, líneas y pastel
- [x] Se puede agrupar por una propiedad — agrupa como cualquier vista, y por eso el eje es esa agrupación
- [x] El gráfico respeta los filtros de la vista
- [x] Se actualiza cuando cambian los datos
- [x] Se puede insertar dentro de otra página — eligiendo cuál de sus vistas va ahí
- [x] Se lee bien en modo oscuro — cada tono se aclara, y el pastel dice sus números al lado

## VW-15 · Debe permitir reordenar arrastrando en toda la colección

- [x] Se pueden reordenar las columnas de la tabla arrastrando
- [x] Se pueden reordenar las propiedades en el panel de configuración — con las flechas de cada línea; la del nombre no se mueve
- [x] Se pueden reordenar las opciones de una propiedad de selección — desde las columnas del tablero, que es lo que esas opciones son
- [x] Se pueden reordenar las vistas guardadas
- [x] Se pueden reordenar las columnas del tablero
- [x] Cada uno de estos órdenes sobrevive al recargar

## VW-16 · Debe permitir editar varias filas a la vez

- [x] Se pueden seleccionar varias filas con casillas — la casilla acompaña al nombre, sin columna propia
- [x] Se puede asignar el mismo valor de propiedad a todas las seleccionadas — con el mismo campo que responde una fila sola
- [x] Se pueden eliminar todas juntas — van a la papelera, que es de donde se vuelve
- [x] Se pueden duplicar todas juntas
- [x] Se ve cuántas hay seleccionadas
- [x] Seleccionar todo respeta el filtro aplicado — marca lo que se está viendo, no lo que la colección guarda
- [x] La operación se puede deshacer — desde el aviso, que se queda doce segundos por ser una vuelta atrás y no un aviso cualquiera

## VW-17 · Debe permitir ajustar cómo se ve la tabla

- [x] Se puede elegir la altura de las filas — corto, medio o alto
- [x] Se puede hacer que el texto largo se ajuste en varias líneas o se corte
- [x] Se puede alinear el contenido de una columna — desde el menú de esa columna
- [x] Estas preferencias se guardan con la vista

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 2026-08-28 | PR-01, PR-05, VW-02, VW-11 | Recorrido en el navegador contra PostgreSQL de lo que ya estaba construido y este documento daba por ausente. **Agrupación:** se cambió desde la configuración de `Status` a `Priority`, el tablero se rehízo y, con esa agrupación, mover una tarjeta escribió `priority` sin tocar `status` — el tablero escribe la propiedad por la que agrupa, no una fija. **Qué muestra cada vista:** quitar `Description` la sacó de las tarjetas y dejó la tabla intacta; la propiedad por la que se agrupa no se repite dentro de su columna. **Esquema:** se agregó «Área» (clave `area`, derivada de un nombre con tilde), con opción «Backend» en verde, se asignó a una fila y se quitó la propiedad, sin trabar la fila. **Defecto encontrado y corregido:** la tabla y las tarjetas mostraban el identificador de la persona asignada mientras el panel decía su nombre, porque solo el panel recibía el directorio del espacio; ahora lo reciben las tres, y a quien el directorio no reconoce se le nombra en palabras en vez de enseñar el identificador. **Sin construir:** manejar las columnas del tablero, y filtrar y ordenar desde la pantalla. | Correcto |
| 2026-08-28 | VW-08, VW-09 | Filtrar y ordenar desde la pantalla, verificado contra PostgreSQL. `Status es done` dejó 4 filas de 13; ordenar por `Due date` las puso de la más antigua a la más nueva e invertirlo las dio vuelta; ambas cosas quedaron guardadas en la vista y sobrevivieron a la recarga. Cada clase de propiedad ofrece los operadores que le corresponden, el campo del valor desaparece cuando el operador no pregunta por ninguno, y una selección ofrece sus opciones en vez de pedir que se escriban. **Defecto encontrado y corregido:** el filtro se guardaba pero no volvía —al leer, el backend descartaba los `null`, y una condición sin valor perdía el campo `value` que su contrato exige, con lo que el filtro entero dejaba de leerse—. **Falta de estos dos bloques:** anidar grupos de condiciones (el contrato admite tres niveles, la pantalla ofrece uno) y decir cuántas filas quedaron de cuántas. | Correcto |
| 2026-09-10 | VW-02, VW-03, VW-10, VW-12, VW-15 | Recorrido contra PostgreSQL de lo construido desde la última entrada, y marcado de lo que ya cumplía sin estar marcado. **Vistas:** se crean, se renombran, se borran, se ordenan y se elige cuál abre por defecto, todo desde la configuración y en cualquier momento; el orden dejó de ser alfabético del servidor y pasó a ser una columna propia, así que mover una vista se ve y sobrevive a la recarga. **Segunda agrupación:** un tablero puede agrupar por dos propiedades. Se resolvió como **bandas que cruzan** —cada banda repite todas las columnas— y no como franjas dentro de cada columna, para que las columnas queden alineadas de banda a banda; el texto del bloque se ajustó a lo que de verdad se construyó. Arrastrar entre bandas escribe las dos propiedades en una sola llamada. **Agrupar por lo que sea:** una propiedad sin opciones declaradas —fecha, número— ya agrupa, derivando los grupos de lo que las filas tienen; una casilla da siempre dos grupos. **Tablero:** reordenar una tarjeta dentro de su columna funciona, y mientras se arrastra se marca el hueco donde caería (comprobado por identificador de fila, no por título, porque las tarjetas de prueba se llamaban igual). Crear una tarjeta en una columna la deja con el valor de esa columna. **Defectos encontrados y corregidos:** el servidor exigía que una selección tuviera al menos una opción, lo que trababa agregar una propiedad nueva antes de poder darle opciones; un tablero recién creado se rechazaba por no traer agrupación, y ahora nace agrupado por la primera propiedad que sirva; y el botón de guardar quedaba fuera de la ventana visible porque el panel medía por el documento y no por lo que se ve. **Falta:** manejar las columnas del tablero, agrupar en la tabla, y los tramos (día, semana, mes) al agrupar por fecha. | Correcto |
| 2026-09-10 | VW-01, PR-01, PR-02, PR-07 | **La celda se responde donde está.** Una celda de la tabla se vuelve su propio campo al tocarla y vuelve a ser texto cuando la respuesta está dada; solo viaja la propiedad que se tocó, no la fila entera. Lo que se elige —una selección, una casilla— queda respondido en el mismo gesto; lo que se escribe se guarda al salir del campo o con Enter, y Escape se arrepiente sin escribir nada. Comprobado contra PostgreSQL sobre texto, fecha, selección, número y casilla, y comprobado también que Escape no deja rastro. **Cálculos al pie.** Cada columna dice lo que quiera de todas sus filas juntas: contar, contar con valor, contar vacías, y sobre números suma, promedio, mínimo, máximo y mediana; una casilla dice qué parte está marcada. Solo se ofrece lo que esa clase de propiedad admite —una fecha no suma—. Se cuenta sobre las filas que la vista dejó pasar: con `Status es done` el conteo bajó de 3 a 1. Lo elegido se guarda en la vista y sobrevive a la recarga. Comprobado con 3, 8 y 4: suma 15, mediana 4, y una de tres casillas marcada dio 33 %. **Cambiar el tipo de una propiedad** ya se ofrece, diciendo que lo que las filas guardaron se queda como está. **Defecto encontrado en el camino:** el backend en marcha servía una versión vieja de `shared` y rechazaba cualquier cambio de vista —también ordenar, que ya funcionaba—; se reinició la pila de desarrollo y con el contrato al día quedó todo guardando. **Falta de este bloque:** ancho de columnas, reordenarlas, congelarlas, y un cálculo por grupo, que necesita que la tabla agrupe. | Correcto |
| 2026-09-10 | VW-03, PR-03 | **Mandar sobre las columnas del tablero.** Se agrega una columna, se renombra, se pinta y se quita, desde la columna misma. Renombrar era lo que no se podía hacer sin romper nada: la forma sola no distingue un renombrado de un quitar y poner, así que se construyó como una operación que dice de qué nombre viene, y el servidor reescribe la forma y las filas en una transacción. Comprobado contra PostgreSQL: la opción se renombró en su sitio y con su color, la fila que decía el nombre viejo pasó a decir el nuevo, y el nombre nuevo se ve también en la tabla. **Quitar** una columna pregunta antes diciendo a cuántas filas deja sin valor; al confirmar, la fila pierde solo esa propiedad —conserva el resto y cae en «sin asignar»—, que es lo contrario de borrarla. **Casos de borde:** dos columnas no pueden llamarse igual, y se dice cuál es la que ya existe sin llegar a preguntárselo al servidor; la columna de las filas sin valor no ofrece acciones, porque no es un valor que se pueda tocar; y un tablero agrupado por fecha o número tampoco las ofrece, porque esas columnas salen de lo que las filas traen puesto y no de opciones declaradas. **De sitio** se cambia una columna del tablero tomándola de su asa y soltándola sobre la que debe quedar a su derecha, o sobre «agregar columna» para dejarla al final; y con Alt y las flechas, porque arrastrar no puede ser la única manera —el aviso de accesibilidad que saltó al hacerlo solo con arrastre se resolvió dándole asa propia y teclado, no silenciándolo—. Ese orden vive en la propiedad, así que vale para todas las vistas. Con eso queda completo `VW-03`. | Correcto |
| 2026-09-11 | VW-01, VW-15 | **Mandar sobre las columnas de una tabla**: ancho, sitio y cuáles se quedan quietas. Las tres son de la vista, no de la colección. El ancho se arrastra del borde derecho de la columna y sigue a la mano, guardándose al soltar —mandar uno por píxel recorrido sería una llamada por movimiento—; también se ajusta con Alt y las flechas. El orden se cambia tomando la columna de su asa, y es el de las propiedades que la vista dice mostrar: una vista que nunca eligió se escribe entera tal como se estaba viendo antes de mover nada. Fijar se pide desde el menú de la columna y vale hasta ella. **Tres defectos encontrados en el navegador y corregidos:** el asa del ancho quedaba medio fuera de su celda y la columna vecina la tapaba, así que no se podía tomar; el navegador estiraba la tabla hasta su marco y le regalaba el sobrante a la última columna, que entonces ignoraba el ancho que se le diera —ahora la tabla lleva escrito cuánto suman sus columnas y se desplaza dentro de su marco—; y el pie no se quedaba quieto con las demás, de modo que sus celdas pasaban por debajo y la columna fija quedaba con un agujero. **Defecto de entorno, no del código:** agregar claves al contrato de una vista hizo que el backend en marcha —con la versión vieja de `shared`— rechazara con 400 *cualquier* cambio de vista; se reinició la pila. **Falta de este bloque:** agrupar en la tabla, y con ello un cálculo por grupo. | Correcto |
| 2026-09-13 | VW-01, VW-10 | **Agrupar en la tabla.** Cómo llegan las filas dejó de decirlo solo la clase de vista: ahora lo dicen la clase y lo que la vista tiene puesto, así que una tabla lee sus filas una tras otra hasta que se le pide agrupar y entonces las lee en grupos, con la misma operación que arma un tablero. Cada grupo abre con una franja que cruza la tabla diciendo de qué es y cuántas filas lleva, y cierra con la misma cuenta que eligió la vista aplicada a lo suyo; abajo del todo sigue el total. Plegar un grupo se guarda en la vista, y vale igual para las columnas de un tablero —por eso lo guardado pasó a llamarse `collapsedGroups` y no `collapsedColumns`: es el mismo grupo mirado de otra manera—. **Dos cosas que hubo que corregir:** el servidor exigía que la vista *tuviera* que agrupar en vez de que *pudiera*, así que rechazaba a la tabla y la dejaba con el cartel de «falta la propiedad de agrupación»; y cruzar en bandas se limitó explícitamente a quien lee en grupos por lo que es, porque una tabla dibuja una sola dimensión. **Corregido tras probarlo El-Vitas:** plegar tardaba lo que tardara el viaje al servidor, porque no había nada dibujado antes de la respuesta; ahora se pliega al tocarlo —24 ms medidos— y lo que el servidor conteste reemplaza a eso. **Falta:** reordenar los grupos de una tabla, ocultar los vacíos, y los tramos (día, semana, mes) al agrupar por fecha. | Correcto |
| 2026-09-13 | VW-01, VW-10 | **Lo que una vista dice de sí misma dejó de costar la colección entera.** El-Vitas avisó de que plegar iba lento y de que al repetir el clic empeoraba. Medido: 400-600 ms por clic. Eran dos cosas encadenadas. La de fondo: guardar cualquier cosa de una vista —un filtro, un ancho, una franja doblada— mandaba la colección completa, y el servidor borraba y volvía a crear **cada propiedad y cada vista** para eso; además de caro, deja una ventana donde se pierde lo que otra persona acaba de cambiar. Ahora hay una operación que toca solo la configuración de esa vista. La de encima, y era un error mío: el plegado se reconciliaba con el servidor comparando contra lo último **tocado** en vez de contra lo último **dicho por el servidor**, así que cada render deshacía el gesto y la franja solo quedaba doblada cuando contestaba el viaje. Medido después: **8-17 ms** en diez clics seguidos, y tres franjas distintas dobladas con 50 ms entre medio quedan las tres como se dejaron. Se agregó además una guarda para no hacerle caso al servidor mientras hay viajes sin volver. | Correcto |
| 2026-09-13 | VW-04, VW-05 | **Dos maneras más de mirar las mismas filas: lista y galería.** Entraron como entra una clase de vista nueva desde que la forma dejó de ser del tipo: un valor en el enumerado de la base, una entrada en las definiciones que dice cómo lee sus filas, y un componente registrado. Nada de lo que filtra, ordena o agrupa tuvo que aprender sus nombres. Las dos leen sus filas una tras otra y también en grupos cuando se les pide, igual que la tabla. La **lista** pone cada fila en un renglón con su nombre arriba y lo que guarda en una sola línea debajo, en pequeño —apilar seis propiedades a lo alto convertía cada fila en un párrafo, así que la misma pieza que dibuja lo de una tarjeta ahora lo dibuja en columna o en línea según dónde esté—. La **galería** las pone como tarjetas que se acomodan al ancho que haya, sin número fijo por línea. Comprobado contra PostgreSQL: las dos vistas se crean desde la configuración con su clase, se guardan, se abren por su pestaña, y agrupar la lista por `Status` la parte en tramos con su color y su cuenta. De paso se juntó en un solo sitio el nombre de una fila con su enlace a la página entera, que estaba escrito tres veces. **Falta de estos dos bloques:** elegir imagen de portada y tamaño de las tarjetas, que necesitan que una fila pueda llevar una imagen. | Correcto |
| 2026-09-13 | VW-10 | **Los grupos vacíos y el orden de los grupos.** Esconder los grupos sin ninguna fila se pide desde la vista, junto a por dónde agrupa, y no desde el tablero: es lo mismo para las franjas de una tabla que para las columnas de un tablero, así que se dice una vez. En el tablero se paga con un sitio menos donde soltar una tarjeta, y por eso mientras hay una en el aire vuelven a aparecer todas —comprobado en el navegador: con la columna «Sin asignar» escondida, empezar a arrastrar la devuelve—. **Cambiar de sitio un grupo de una tabla** se hace con dos flechas en su propia franja, y no arrastrándola: una franja cruza la tabla de lado a lado, así que arrastrarla no apunta a ningún sitio, y además es lo que se toca para plegarla. Lo que se mueve es el valor, no la franja, de modo que ese orden es el mismo que el de las columnas del tablero y vale para todas las vistas; solo se ofrece donde el grupo es un valor declarado. Comprobado contra PostgreSQL: bajar «todo» un puesto dejó las opciones como `in_progress, todo, done` y la tabla se redibujó en ese orden. De paso, mandar la forma de la colección —lo que es del valor y no de la vista— dejó de estar escrito dos veces. **Defecto de entorno, otra vez:** agregar una clave al contrato de una vista hizo que el backend en marcha, con la versión anterior de `shared`, rechazara con 400 cualquier cambio de forma; se reinició la pila. **Falta:** los tramos (día, semana, mes) al agrupar por fecha, y decir por qué no se puede arrastrar entre grupos cuando la propiedad no admite escritura. | Correcto |
| 2026-09-13 | VW-10 | **Los tramos al agrupar por fecha.** Sin tramo, una fecha hace un grupo por cada día distinto que alguna fila nombró, y un año de trabajo son trescientos grupos de una fila. Ahora la vista dice cuánto cabe en cada grupo —día, semana o mes— y el selector aparece solo cuando la propiedad por la que agrupa es una fecha: nadie agrupa una selección «por meses». El tramo no toca lo que las filas guardan; solo cambia a qué grupo van. Cada grupo se nombra por su principio —el día, el lunes de esa semana, el año y el mes— porque así el nombre ordena solo: puestos en fila quedan en el orden en que pasó el tiempo, sin compararlos como fechas. La semana empieza en lunes. Comprobado contra PostgreSQL con `2026-08-10`, `2026-08-14` y `2026-08-21`: por mes, un solo grupo `2026-08` con las tres; por semana, `2026-08-10` con dos y `2026-08-17` con una. La cuenta del tramo vive en `shared` con sus propias pruebas, así que el servidor reparte y la pantalla elige sin que ninguno de los dos sepa hacer calendarios. | Correcto |
| 2026-09-13 | VW-12 | **Duplicar una vista, cambiarla de clase, y ponerle un emoji.** Con eso `VW-12` queda completo. **Duplicar** copia todo lo que la vista dice de sí misma —filtro, orden, qué enseña, por dónde agrupa—, porque quien duplica quiere partir de ahí y no de cero; la copia queda pegada a la original, con un nombre libre parecido (`Table (2)`), y nunca se lleva la delantera: abrir la colección lleva a un sitio y no a dos. **Cambiar de clase** dejó de ser un dato fijo y pasó a ser el mismo desplegable con el que se crea una vista: no toca las filas, son las mismas miradas de otra manera. Se queda todo lo que la clase nueva sigue entendiendo y se va lo que no —las bandas fuera de un tablero—, diciéndolo. Lo que la clase nueva simplemente ignora, como el ancho de las columnas en un tablero, se queda donde está: ir a tablero y volver no tiene por qué costar el trabajo hecho. Y lo que la clase nueva necesita y no había —la agrupación de un tablero— se rellena solo, porque una vista que no se puede dibujar tumbaría al guardar la colección entera. Comprobado contra PostgreSQL: duplicar la tabla dio `Table (2)` con su agrupación; convertirla en tablero la guardó como `BOARD` conservando `groupBy`; ponerle bandas y pasarla a lista avisó de que las bandas se quitaban y las quitó. **El emoji** es de la vista y acompaña al nombre en la pestaña, no lo sustituye: un emoji solo no dice cuál de tres tableros es. Solo emoji, con buscador, porque una pestaña mide lo que mide una línea de texto y ahí una imagen no se lee. De paso, el panel de la vista se partió: por dónde agrupa, el tramo y los grupos vacíos se leen juntos y ahora viven en su propia pieza. | Correcto |
| 2026-09-13 | VW-08 | **Cuántas filas se están viendo de cuántas hay.** Las dos cuentas van juntas porque solas no dicen nada: «3 filas» no distingue una colección de tres de otra de cuarenta con un filtro puesto. Vienen del servidor, que es donde están todas las filas —aquí solo llegan las que la vista dejó pasar—, así que la respuesta de una vista dejó de ser solo sus filas y pasó a ser sus filas y de cuántas salieron. **Y un filtro que no deja pasar nada se explica**: decir «aún no hay filas» manda a agregar una que ya está ahí, escondida detrás de una condición que nadie recuerda haber puesto; ahora dice cuántas hay y qué hacer para volver a verlas, y vale igual para las cuatro clases de vista porque se decide antes de dibujar ninguna. Comprobado contra PostgreSQL: sin filtro, «3 de 3 filas»; con una condición que no acierta ninguna, «0 de 3 filas» y el aviso en lugar de la tabla. | Correcto |
| 2026-09-13 | VW-03, VW-10 | **Defecto encontrado por El-Vitas y corregido: llevando una columna, el tablero ofrecía huecos entre tarjetas.** Al arrastrar una columna y pasar por encima de una tarjeta se encendía la raya que marca dónde caería una *tarjeta*, y la columna de destino dejaba de señalarse: parecía que una columna se podía soltar dentro de otra, entre dos tarjetas, que no es algo que exista. La causa: la tarjeta atendía el gesto sin mirar qué venía en la mano, y además lo detenía, de modo que la columna de debajo no llegaba a enterarse. Ahora, con una columna en la mano, la tarjeta se aparta sin tocar el gesto y contesta la columna. **Y una columna plegada volvió a ser un sitio donde soltar**: no lo era, así que una columna doblada partía el tablero en dos mitades entre las que no se podía pasar nada. Reproducido y comprobado en el navegador: llevando `done` sobre una tarjeta de `todo` ya no se enciende ninguna raya, se marca `todo`, y soltar deja `done` delante de ella; sobre una columna plegada, se marca igual. | Correcto |
| 2026-09-13 | VW-15 | **Reordenar las propiedades desde el panel**, con lo que `VW-15` queda completo. Con las flechas de cada línea y no arrastrando, igual que las franjas de una tabla: la lista del panel es también donde se entra en cada propiedad, y una fila que sirve para entrar y para arrastrar hace las dos cosas a medias. Este orden es el de la colección, así que manda en las vistas que no eligieron el suyo. La propiedad del nombre se queda donde está y ninguna se le pone delante: va siempre primera porque es la que abre cada fila. Comprobado contra PostgreSQL: subir `Priority` dejó el orden `title, status, priority, assignee…` guardado en la columna `order`, y la tabla se redibujó con `Priority` antes de `Assignee`. | Correcto |
| 2026-09-13 | VW-01, VW-03, VW-11 | **Defecto de rendimiento encontrado por El-Vitas y corregido: cada gesto rehacía la página dos veces.** Avisó de que la colección tardaba en actualizarse. Medido en el navegador: 1198 ms desde el clic hasta ver el cambio. El desglose dejó claro que no era cálculo —ni una sola tarea larga— sino espera: dos viajes seguidos de ~500 y ~370 ms. El backend contestaba en 34 ms; lo que costaba era el portal rehaciendo la página entera, y lo hacía **dos veces**: la acción de servidor invalida lo guardado y ya vuelve con la página rehecha, y encima se pedía un redibujado aparte. Quitado ese segundo viaje en los seis sitios donde estaba —guardar la configuración, mover una columna o un grupo, cambiar lo que una vista dice de sí misma, editar una celda, crear una fila y mover una tarjeta—, medido otra vez: guardar la configuración **835 ms** (de 1198), mover un grupo **702 ms**, filtrar **771 ms**, todos con un solo viaje; editar una celda cambia en **6 ms** y mover una tarjeta en **34 ms**, porque esos ya se dibujaban antes de preguntar. Comprobado además que cada gesto sigue quedando guardado en PostgreSQL. | Correcto |
| 2026-09-14 | VW-06 | **La vista de calendario.** El documento la daba por atada a «resolver las fechas primero», y eso ya no se sostenía: la propiedad de fecha existe, filtra y agrupa por día, semana o mes. Entró como entra cualquier clase de vista —un valor en el enumerado, una definición y un componente registrado—, y lo único que sabe hacer que nadie más sabía es contar los días de un mes: eso vive en `shared` con sus pruebas, en seis semanas enteras siempre, porque una rejilla que cambiara de alto movería todo lo que hay debajo al pasar de mes. **Por qué fecha coloca** se elige en la configuración de la vista, porque una colección puede guardar varias —cuándo empieza, cuándo vence— y el calendario enseña una cada vez; nace apuntando a la primera que haya. **Pasar de mes no viaja al servidor**: las filas que pasan el filtro ya están todas en pantalla, así que cambiar de mes es repartirlas de otra manera. **Arrastrar una entrada a otro día** le escribe esa fecha, y solo esa; se dibuja en el día nuevo antes de preguntar, y si el servidor dice que no, vuelve sola. Con Alt y las flechas hace lo mismo sin ratón: un día a los lados, una semana arriba y abajo. **Crear en un día** deja la fila con esa fecha puesta. Los días y los meses los nombra `Intl` en el idioma de quien mira, y la semana empieza en lunes. Lo que no dice ninguna fecha no cae en ningún día y se dice al pie, porque si no parecería borrado. **Defecto encontrado al probarlo y corregido:** crear desde un día fallaba con «Page property values are invalid» —la fila nacía solo con la fecha y la colección exigía respuesta a otra propiedad—; ahora una fila nace respondiendo también lo que la colección da por sentado, lo que además tapa el mismo agujero en el tablero. Comprobado contra PostgreSQL: las tres tareas caen en sus días de agosto, arrastrar una del 21 al 25 dejó `2026-08-25` guardado, y crear una el 18 la dejó con fecha y estado. **Falta:** que un rango se vea extendido sobre los días que abarca, que necesita que una fecha pueda ser un desde-hasta (`PR-06`). | Correcto |
| 2026-09-14 | VW-16 | **Editar varias filas a la vez.** La casilla de cada fila acompaña al nombre en vez de tener columna propia: una columna más movería todas las demás y pelearía con los anchos y con las que se quedan quietas. La de arriba marca **lo que se está viendo** —lo que el filtro dejó pasar, no lo que la colección guarda— y queda a medias cuando hay de las dos, porque llena diría que están todas y vacía que no hay ninguna. Con algo marcado aparece una barra que dice cuántas son y ofrece **asignar, duplicar y eliminar**; sin nada marcado no está, porque una barra que dice «ninguna» ocupa sitio para contar lo que ya se ve. **Asignar** usa el mismo campo con el que se responde una fila sola: primero qué propiedad y después con qué, porque el valor depende de la propiedad. **Eliminar** manda a la papelera y no pregunta antes: preguntar y además poder deshacer es pedir dos veces la misma decisión. **Todo se deshace** desde el aviso, y para eso cada operación se apunta lo que hace falta para volver —qué decía cada fila, o cuáles son las copias recién hechas—; el aviso dura doce segundos y no cuatro, porque ofrece una vuelta atrás y no cuenta algo. Comprobado contra PostgreSQL: asignar `Priority` a dos marcadas las escribió a las dos, duplicar creó las copias, eliminar dejó las filas en la papelera, y deshacer las devolvió a activas. La selección no se guarda: es de este rato y de quien mira. **Defecto de entorno corregido de paso:** la barra alcanza a las acciones de página, y cuatro pruebas cargaban el módulo real y reventaban al arrastrar código de servidor; se les añadió el mismo mock que ya usaban sus vecinas. | Correcto |
| 2026-09-14 | VW-17 | **Cómo se ve la tabla: alto de fila, texto partido y alineación.** El alto y el partido van juntos en un mando propio sobre la tabla, porque se deciden mirándola y no en la configuración de la colección; la alineación va en el menú de cada columna, que es donde se la está mirando. **Partir el texto sube el alto** cuando estaba en el más corto: partir sin dejar crecer la fila dejaría las líneas de más fuera de la vista. Dejar de partir no lo baja, porque quien lo subió puede quererlo alto igual. El alto se dice como máximo y no como medida fija: una fila con poco texto no tiene por qué ocupar lo que ocuparía la más llena. **Alinear al principio no se guarda**: es lo que hace cualquier tabla, y guardarlo sería guardar que nadie eligió. Los tres son de la vista, así que dos vistas de las mismas filas pueden verse distinto. **Defecto encontrado al probarlo:** alinear la columna movía el texto pero no lo que se ve, porque dentro de cada celda hay un botón que ocupa el ancho entero para poder tocarse en cualquier punto; ahora cada lado se dice de las dos maneras, para el texto y para la caja. Comprobado contra PostgreSQL: pedir partir dejó `rowHeight: MEDIUM, wrapsText: true`, y alinear `Priority` al final dejó `{"priority": "END"}` y la columna pegada a su borde derecho. | Correcto |
| 2026-09-14 | VW-17 | **Defecto encontrado por El-Vitas y corregido: el alto de las filas no hacía nada.** Medido en el navegador: 61 px antes de pedir «alto» y 61 px después. Dos causas, las dos por escribir el alto donde no se lee. La primera: se decía como altura máxima sobre la celda, y una celda de tabla crece con lo que lleva dentro sin hacerle caso a una altura; ahora se dice como aire —relleno— y como alto mínimo de lo que se toca dentro de ella, que nunca baja de los cuarenta y cuatro píxeles que mide un dedo. La segunda, al probarlo otra vez: la celda traía escrito que su texto no salta de línea, así que partirlo no partía nada; ahora partir empieza por permitírselo. Medido después: **53, 81 y 145 px** para corto, medio y alto, y el texto en varias líneas con tope —tres o seis según el alto—, para que una fila con un párrafo dentro no mida media pantalla. | Correcto |
| 2026-09-15 | VW-13 | **El buscador de la colección.** Busca **entre lo que ya está en pantalla**, que son las filas que el filtro dejó pasar: así respeta el filtro sin saber nada de él, y responde al teclear en vez de ir y volver del servidor por cada letra. Comprobado: con `Status es done` puesto, buscar una palabra que solo dice una fila filtrada no la trae de vuelta. Busca en el nombre y en lo que se responde escribiendo, y no en fechas ni números: quien escribe «agosto» no busca `2026-08-14`, y quien escribe «3» encontraría media colección. Compara sin acentos ni mayúsculas, con el mismo plegado que ya usaba la búsqueda de páginas. Lo buscado no se guarda en la vista —es de este rato—, y si no encuentra nada lo dice con la palabra delante, porque una tabla con la cabecera puesta y nada debajo parece rota. Dice además cuántas encontró de cuántas hay: el contador de arriba cuenta lo que pasa el filtro, este lo que encuentra la búsqueda. **De entorno:** el contenedor de PostgreSQL se había caído y la sesión del navegador estaba vencida; se levantó y se volvió a entrar antes de comprobar nada. | Correcto |
| 2026-09-17 | VW-02 | **Arrastrar contra el borde desplaza el tablero solo.** Sin esto, llevar una tarjeta a una columna que no se ve son tres gestos: soltarla en medio, desplazar a mano y volver a tomarla. El desplazamiento va **por cuadros y no por evento**, porque el navegador deja de mandar eventos cuando la mano se queda quieta contra el borde —y quieta contra el borde es justo donde hay que seguir moviéndose—. La velocidad **crece con la cercanía al borde**: rozando la franja de setenta y dos píxeles apenas se mueve y pegado al filo va a tope, para que acercarse de a poco desplace de a poco. La cuenta vive aparte de la vista, así que se comprueba sin navegador: cinco pruebas para los dos lados, el medio y los extremos. Comprobado en el navegador con el tablero más ancho que la ventana (1288 contra 752): con la mano en el centro no se movió nada en medio segundo; contra el borde derecho pasó de 0 a 256 en un cuarto de segundo y llegó al tope de 536; contra el izquierdo volvió a 0; salir del tablero y soltar lo detienen, y lo que quede corriendo se cancela al desaparecer el tablero. **De entorno, otra vez:** el contenedor de PostgreSQL estaba caído y la sesión vencida. **Nota de método:** el arrastre nativo HTML5 no se produce con eventos de ratón sintéticos en este navegador, así que se comprobó mandando los mismos eventos de arrastre que manda el navegador. | Correcto |
| 2026-09-17 | VW-08 | **Anidar grupos de condiciones.** Sin esto no se podía decir «está hecha y además es urgente o la pidió tal persona»: una sola lista unida por «y» o por «o» obliga a elegir una de las dos para todo. El filtro dejó de ser una lista y pasó a ser el árbol que el contrato ya guardaba; cada condición se nombra **por dónde está** —qué puesto ocupa en su grupo, y ese dentro del suyo—, porque lo guardado no lleva identificadores. **Hasta dónde se puede anidar** no es un número elegido aquí: son los tres niveles que el contrato admite contando la condición, así que el de arriba abre grupos y esos ya no. Un grupo nace uniendo con «o», que es justo lo que el «y» de afuera no da. La cuenta de la profundidad se mudó a `shared`, para que la pantalla no tenga escrito un tres que el servidor podría cambiar. Comprobado contra PostgreSQL: `Status es done` **y** (`Priority es high` **o** `Priority es low`) quedó guardado como un grupo dentro de otro, y las filas pasaron de 1 a 2 al agregar la segunda condición dentro del grupo —con las dos unidas por «y» habrían sido 0—. | Correcto |
| 2026-09-17 | VW-14 | **Gráficos.** Un gráfico **es una agrupación dibujada**, y por eso entró como cualquier otra clase de vista —un valor en el enumerado, una definición y un componente registrado— y no como una pieza aparte: agrupa como agrupa un tablero, de modo que la propiedad por la que agrupa **es** su eje y no hay dos maneras de repartir las mismas filas conviviendo en la pantalla. De ahí salen gratis dos casillas: respeta el filtro de la vista —le llegan las filas que el filtro dejó pasar, ya repartidas— y se rehace cuando los datos cambian, como todo lo demás. **Qué mide** cada grupo es contar filas, sumar o promediar; sumar y promediar solo se ofrecen cuando la colección guarda un número, porque sumar estados no quiere decir nada. La aritmética no se volvió a escribir: es la misma que una columna hace al pie de una tabla, mirada por grupo. **Se dibuja sin traer ninguna librería**: barras con cajas —que se leen con lupa, se seleccionan y se traducen— y línea y pastel en SVG, con la cuenta separada del dibujo y probada aparte. **El color no es adorno: es el dato**, así que cada barra y cada porción llevan el color de la opción que representan, y en modo oscuro cada tono se aclara. El pastel va siempre con su lista de números al lado, porque de un arco no se lee cuánto vale y porque así dice algo también para quien no distingue los colores. Comprobado contra PostgreSQL: contando filas dio `todo 2` y `done 2`; con `Priority es high` puesto bajó a 1 y 1; cambiar una fila a `done` lo dejó en `todo 1` y `done 3`; y sumando una propiedad de horas dio `done 16` (5+3+8). **Defecto encontrado al probar la última casilla y corregido:** al insertar una colección en otra página solo se elegía la página, así que siempre entraba la vista principal —un gráfico no se podía insertar salvo que fuera la que abre la colección—; ahora, con más de una vista, se pregunta cuál. **Y un defecto que eso destapó:** las colecciones dibujadas dentro de una página se guardaban por el identificador de la página, de modo que dos bloques de la misma colección con vistas distintas mostraban lo mismo; ahora se guardan por página y vista, y en la misma página conviven su tabla y su gráfico. **De entorno, la trampa de siempre con una vuelta nueva:** el backend en marcha tenía en memoria el enumerado anterior y rechazaba la clase `CHART` con 400; hubo que reiniciar la pila **después** de generar el cliente de Prisma, no antes. | Correcto |
| 2026-09-17 | VW-01, VW-02, VW-05, VW-07 | **Casillas retiradas por revisión de alcance, a pedido de El-Vitas.** Preguntó por qué se pedía una portada en las tarjetas, y la respuesta estaba escrita: `../current-scope.md` dice que las portadas de página **se construyeron y se retiraron el 18/08/2026** y no son parte del alcance, así que pedirlas en las tarjetas de un tablero o de una galería las devolvía por la ventana. Fuera las dos casillas; el tamaño de las tarjetas se queda, que es de la vista y no necesita ninguna pieza nueva. **La línea de tiempo** sale de este pase: `../future-scope.md` la declara futuro y `../current-scope.md` dice que ni ella ni el calendario entran en la ronda actual —el calendario se adelantó porque la fecha ya existía y agrupaba—; sus casillas se escribirán cuando se abra como su propio trabajo. **«Una tabla con muchas filas se desplaza sin ponerse lenta»** estaba dicha dos veces: es `RE-01` y `RE-02` de `13-rendimiento-y-limites.md`, escritas allí con su protocolo de sembrar cinco mil filas. Una casilla verificada en dos documentos se marca en uno y se olvida en el otro. | Correcto |
| 2026-09-17 | VW-08 | **Cómo se ve el filtro, rehecho tras verlo El-Vitas.** Lo dicho fue que estaba feo, y mirándolo en el navegador se veía por qué: «Cumpliendo todas» colgaba arriba del todo, lejos de las condiciones que unía; los campos de una condición no caían bajo los de la anterior, porque el grupo anidado los corría; cada línea terminaba en una cruz roja encendida; y «Quitar todas», también en rojo, ocupaba una franja propia. Ahora **cada línea empieza por cómo se une a la de arriba** —«Donde» la primera, el selector «y/o» la segunda, y de ahí abajo esa misma palabra repetida sin poder tocarse, porque un grupo se une de una sola manera— y sigue por propiedad, comparación y valor, **siempre con el mismo ancho**, de modo que el filtro se lee como una frase de arriba abajo. El hueco del valor se queda ocupado cuando el operador no pregunta por ninguno, para que la línea de al lado no corra sus campos. Quitar dejó de gritar: gris, y rojo solo al apuntarlo; el del grupo se dice con palabras y no con otra cruz, que en esa misma columna se leería como quitar una condición. **Medido en el navegador:** el panel se ensanchó a 46rem porque a 36 cada condición se partía en dos líneas, y el grupo anidado desbordaba once píxeles por no poder encogerse. A 390 px de ancho no desborda y la condición se apila en tres líneas. | Correcto |
