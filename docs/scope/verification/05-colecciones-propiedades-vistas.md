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

**Lo que falta ahora es mandar sobre las columnas.** Una columna no se agrega,
ni se renombra, ni se reordena, ni se pliega desde el tablero. El tipo de una
propiedad tampoco se cambia, porque es una pregunta sobre qué pasa con cada fila
que ya respondió. Y una celda todavía no se edita sin abrir la fila.

Nada de eso cuenta como verificado: está escrito aquí para saber por dónde
empezar a probar, no para ahorrarse la prueba.

## Lo que queda para una segunda etapa

Estas cinco capacidades —`PR-10` relaciones, `PR-11` cálculos, `PR-12`
fórmulas, `VW-05` calendario y `VW-06` línea de tiempo— **no se miden todavía**.

Las tres primeras no son más propiedades: necesitan un grafo de dependencias
entre colecciones y recálculo cuando algo cambia, que es construir medio motor
de base de datos. Las dos vistas dependen de tener fechas resueltas primero.

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
- [ ] Se puede cambiar su tipo, y se advierte qué pasa con los datos existentes — el tipo se muestra, no se cambia
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

- [ ] Texto: admite varias líneas y no se corta al perder el foco
- [ ] Número: rechaza letras
- [ ] Número: permite elegir formato (entero, decimal, moneda, porcentaje)
- [ ] Número: se puede mostrar como barra de progreso
- [ ] Ambos se editan directamente en la celda de la tabla

## PR-03 · Debe ofrecer selección simple y múltiple

> Una opción se guarda con su nombre y su color, de un conjunto cerrado de
> nueve. El color nunca dice nada por sí solo: el nombre viaja siempre al lado.
> Registrado en `docs/business-rules/fea-clc.yaml`.

- [x] Se pueden definir las opciones disponibles — desde la configuración de la colección, agregando y quitando
- [x] Cada opción tiene un color — se elige de una paleta de nueve, con todos a la vista
- [ ] Se puede crear una opción nueva escribiéndola desde la celda — solo desde la configuración
- [ ] Se pueden reordenar y renombrar las opciones — el renombrado existe en el dominio, sin pantalla que lo ofrezca
- [ ] Renombrar una opción actualiza todas las filas que la usan — no las toca, y eso está dicho en la interfaz
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

- [ ] Se marca y desmarca con un clic en la celda
- [ ] El valor se refleja de inmediato
- [ ] Se puede agrupar y filtrar por marcado / no marcado

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

- [ ] Las filas se ven con sus propiedades en columnas
- [ ] Se puede editar una celda sin abrir la fila
- [ ] Se puede ajustar el ancho de las columnas
- [ ] Se pueden reordenar las columnas arrastrando
- [ ] Se pueden congelar las primeras columnas al desplazarse
- [ ] Se puede mostrar un cálculo al pie de cada columna
- [ ] Los cálculos incluyen contar, contar vacías y contar con valor
- [ ] En columnas numéricas incluyen suma, promedio, mínimo, máximo y mediana
- [ ] En columnas de casilla incluyen el porcentaje marcado
- [ ] El cálculo respeta el filtro aplicado
- [ ] Con agrupación, cada grupo muestra su propio cálculo
- [ ] Una tabla con muchas filas se desplaza sin ponerse lenta
- [ ] Una tabla ancha se desplaza dentro de sí misma sin romper la página

## VW-02 · Debe ofrecer un tablero y permitir mover tarjetas con el mouse

**Cómo probarlo:** abre una colección en vista tablero y arrastra una tarjeta de una columna a otra.

- [x] Las filas se ven como tarjetas agrupadas en columnas
- [x] Se elige por qué propiedad se agrupa — desde la configuración, y solo ofrece las que se pueden agrupar
- [x] Se puede arrastrar una tarjeta de una columna a otra
- [x] Al soltarla, el valor de la propiedad cambia solo
- [x] El cambio persiste al recargar — comprobado contra la base, no solo en pantalla
- [ ] Se puede reordenar una tarjeta dentro de su misma columna — soltar en la misma columna no hace nada
- [ ] Mientras se arrastra se ve dónde va a caer — la columna se resalta, pero no se marca el sitio entre dos tarjetas
- [ ] Otra persona viendo el mismo tablero ve el movimiento — no hay tiempo real en las colecciones
- [ ] Se puede crear una tarjeta directamente en una columna
- [x] Se elige qué propiedades se muestran en la tarjeta — y la propiedad por la que agrupa no se repite en ella
- [ ] Las tarjetas pueden mostrar una imagen de portada
- [ ] Se pueden ocultar columnas vacías
- [x] Se ve el conteo de tarjetas por columna
- [x] Cada columna se ve con el color de la opción que representa
- [x] Si no hay propiedad de agrupación configurada, se explica qué hacer
- [x] Una tarjeta se puede mover sin ratón, solo con el teclado — con Alt y las flechas
- [x] Al moverla con el teclado se anuncia dónde quedó
- [ ] Arrastrar hacia el borde desplaza el tablero solo

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

- [ ] Se puede agregar una columna desde el tablero, y aparece como valor nuevo de la propiedad
- [ ] Se puede renombrar una columna, y el valor cambia en todas las filas que lo tenían
- [ ] Se puede reordenar una columna arrastrándola, y el orden persiste
- [ ] Se puede pintar una columna de un color, y ese color viaja con el valor a las demás vistas
- [ ] Se puede plegar una columna para dejarla como una franja angosta
- [ ] Una columna plegada sigue diciendo cuántas tarjetas tiene
- [ ] Al borrar una columna con tarjetas dentro se avisa cuántas quedarán sin valor
- [ ] Las filas de una columna borrada quedan sin valor, no se borran
- [ ] Hay una columna para las filas sin valor, y se puede ocultar
- [ ] Se puede fijar un tope de tarjetas por columna
- [ ] Pasado el tope, la columna lo dice sin impedir soltar
- [ ] Se puede agrupar por una segunda propiedad y ver franjas dentro de cada columna
- [ ] Lo que se cambia de las columnas es de la vista, y no altera lo que ven las otras vistas de la misma colección

## VW-04 · Debe ofrecer una vista de lista

- [ ] Muestra las filas como lista simple, sin cuadrícula
- [ ] Se elige qué propiedades acompañan a cada entrada
- [ ] Es cómoda de leer para páginas de contenido, no solo de datos

## VW-05 · Debe ofrecer una vista de galería

- [ ] Muestra las filas como tarjetas grandes
- [ ] Se elige qué imagen usar como portada
- [ ] Se elige el tamaño de las tarjetas
- [ ] Sin imagen, la tarjeta sigue siendo legible

## VW-06 · Debe ofrecer una vista de calendario

- [ ] Las filas se ubican por una propiedad de fecha
- [ ] Se navega entre meses
- [ ] Se puede arrastrar una entrada a otro día y la fecha cambia
- [ ] Se puede crear una fila haciendo clic en un día
- [ ] Un rango de fechas se ve extendido sobre los días que abarca

## VW-07 · Debe ofrecer una vista de línea de tiempo

- [ ] Las filas se ven como barras sobre un eje temporal
- [ ] Se puede cambiar la escala (día, semana, mes)
- [ ] Se puede arrastrar y estirar una barra para cambiar las fechas
- [ ] Se puede agrupar por una propiedad

## VW-08 · Debe permitir filtrar

- [x] Se puede filtrar por cualquier propiedad
- [x] Cada tipo ofrece condiciones que le corresponden (contiene, es, está vacío, antes de)
- [x] Se pueden combinar varios filtros con "y" / "o"
- [ ] Se pueden anidar grupos de condiciones — el contrato admite tres niveles; la pantalla ofrece uno
- [x] Los filtros aplicados se ven arriba y se quitan de a uno — el botón dice cuántos hay puestos
- [x] El filtro se guarda con la vista
- [ ] Se ve cuántas filas quedaron de cuántas
- [ ] Un filtro que no deja nada explica que hay filas ocultas — dice «aún no hay filas», que es otra cosa

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

- [ ] Se puede agrupar por una propiedad en cualquier vista
- [ ] Solo se ofrecen para agrupar las propiedades que tienen sentido agrupar
- [ ] Agrupar por fecha permite elegir el tramo: día, semana, mes
- [ ] Agrupar por casilla produce dos grupos, marcado y sin marcar
- [ ] Agrupar por selección crea un grupo por opción, incluido "sin valor"
- [ ] Cada grupo muestra su conteo
- [ ] Los grupos se pliegan y despliegan
- [ ] Se pueden reordenar los grupos
- [ ] Se pueden ocultar los grupos vacíos
- [ ] Al arrastrar una fila entre grupos, el valor cambia solo si esa propiedad admite escritura
- [ ] Si no la admite (por ejemplo un cálculo), no se permite arrastrar y se explica por qué

## VW-11 · Debe permitir elegir qué se muestra

- [x] Se puede ocultar una propiedad en una vista sin borrarla
- [x] Cada vista guarda sus propias propiedades visibles
- [ ] Se puede reordenar lo que se muestra — el orden es el del esquema, y no se puede cambiar por vista

> Comprobado en el navegador el 2026-08-28. Quitar `Description` del tablero la
> sacó de las tarjetas y dejó la tabla intacta, con cada vista guardando su
> propia lista. Una vista que nunca eligió muestra todo, que es distinto de
> elegir no mostrar nada.

## VW-12 · Debe permitir varias vistas de la misma colección

- [x] Se pueden crear varias vistas sobre las mismas filas — al crear la colección; después no hay dónde agregarlas
- [x] Se cambia entre ellas con pestañas — la vista abierta va en la dirección, así que un tablero se manda por enlace
- [ ] Cada vista tiene nombre e ícono — nombre sí, ícono no
- [x] Cada vista conserva su propio filtro, orden y agrupación — guardado en la vista; no hay dónde cambiarlo en pantalla
- [ ] Se puede duplicar, renombrar y eliminar una vista
- [x] Se puede definir cuál es la vista por defecto — es la que abre cuando la dirección no nombra ninguna
- [ ] Se puede convertir una vista de tabla en tablero, y al revés
- [ ] Al convertir se conserva lo que sigue aplicando: filtros, orden y propiedades visibles
- [ ] Lo que no aplica al tipo nuevo se descarta avisando
- [ ] Convertir una vista no altera las filas

## VW-13 · Debe permitir buscar dentro de la colección

- [ ] Hay un buscador propio de la colección
- [ ] Busca en el título y en las propiedades de texto
- [ ] Los resultados respetan los filtros aplicados

## VW-14 · Debe ofrecer gráficos sobre los datos de la colección

- [ ] Se puede crear un gráfico a partir de una colección
- [ ] Se elige qué propiedad va en cada eje
- [ ] Hay barras, líneas y pastel
- [ ] Se puede agrupar por una propiedad
- [ ] El gráfico respeta los filtros de la vista
- [ ] Se actualiza cuando cambian los datos
- [ ] Se puede insertar dentro de otra página
- [ ] Se lee bien en modo oscuro

## VW-15 · Debe permitir reordenar arrastrando en toda la colección

- [ ] Se pueden reordenar las columnas de la tabla arrastrando
- [ ] Se pueden reordenar las propiedades en el panel de configuración
- [ ] Se pueden reordenar las opciones de una propiedad de selección
- [ ] Se pueden reordenar las vistas guardadas
- [ ] Se pueden reordenar las columnas del tablero
- [ ] Cada uno de estos órdenes sobrevive al recargar

## VW-16 · Debe permitir editar varias filas a la vez

- [ ] Se pueden seleccionar varias filas con casillas
- [ ] Se puede asignar el mismo valor de propiedad a todas las seleccionadas
- [ ] Se pueden eliminar todas juntas
- [ ] Se pueden duplicar todas juntas
- [ ] Se ve cuántas hay seleccionadas
- [ ] Seleccionar todo respeta el filtro aplicado
- [ ] La operación se puede deshacer

## VW-17 · Debe permitir ajustar cómo se ve la tabla

- [ ] Se puede elegir la altura de las filas
- [ ] Se puede hacer que el texto largo se ajuste en varias líneas o se corte
- [ ] Se puede alinear el contenido de una columna
- [ ] Estas preferencias se guardan con la vista

---

## Bitácora

| Fecha | Bloque | Qué faltó | Estado |
|---|---|---|---|
| 2026-08-28 | PR-01, PR-05, VW-02, VW-11 | Recorrido en el navegador contra PostgreSQL de lo que ya estaba construido y este documento daba por ausente. **Agrupación:** se cambió desde la configuración de `Status` a `Priority`, el tablero se rehízo y, con esa agrupación, mover una tarjeta escribió `priority` sin tocar `status` — el tablero escribe la propiedad por la que agrupa, no una fija. **Qué muestra cada vista:** quitar `Description` la sacó de las tarjetas y dejó la tabla intacta; la propiedad por la que se agrupa no se repite dentro de su columna. **Esquema:** se agregó «Área» (clave `area`, derivada de un nombre con tilde), con opción «Backend» en verde, se asignó a una fila y se quitó la propiedad, sin trabar la fila. **Defecto encontrado y corregido:** la tabla y las tarjetas mostraban el identificador de la persona asignada mientras el panel decía su nombre, porque solo el panel recibía el directorio del espacio; ahora lo reciben las tres, y a quien el directorio no reconoce se le nombra en palabras en vez de enseñar el identificador. **Sin construir:** manejar las columnas del tablero, y filtrar y ordenar desde la pantalla. | Correcto |
| 2026-08-28 | VW-08, VW-09 | Filtrar y ordenar desde la pantalla, verificado contra PostgreSQL. `Status es done` dejó 4 filas de 13; ordenar por `Due date` las puso de la más antigua a la más nueva e invertirlo las dio vuelta; ambas cosas quedaron guardadas en la vista y sobrevivieron a la recarga. Cada clase de propiedad ofrece los operadores que le corresponden, el campo del valor desaparece cuando el operador no pregunta por ninguno, y una selección ofrece sus opciones en vez de pedir que se escriban. **Defecto encontrado y corregido:** el filtro se guardaba pero no volvía —al leer, el backend descartaba los `null`, y una condición sin valor perdía el campo `value` que su contrato exige, con lo que el filtro entero dejaba de leerse—. **Falta de estos dos bloques:** anidar grupos de condiciones (el contrato admite tres niveles, la pantalla ofrece uno) y decir cuántas filas quedaron de cuántas. | Correcto |
