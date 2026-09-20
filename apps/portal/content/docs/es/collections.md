---
title: Colecciones y vistas
summary: Cómo hacer una colección, qué puede guardar cada propiedad, y las seis maneras de mirar las mismas filas.
order: 4
---

Una colección es una página que además guarda una forma: propiedades con tipo, y vistas sobre
sus filas. Cada fila es una página completa, así que se abre, se mueve, se enlaza y se manda a
la papelera como cualquier otra.

De ahí sale casi todo lo que sigue. Un tablero no guarda las tarjetas, sino una manera de
mirar filas que ya existían.

## Hacer una colección

Escribe `/` y elige **Colección**. Nace con una propiedad y una vista de tabla, y desde ahí se
cambia todo. Con **Colección de otra parte** muestras aquí una que ya existe en otra página;
si tiene varias vistas, se pregunta cuál va en este sitio.

El botón **Configurar la colección**, junto a las pestañas de vistas, es donde se cambian las
propiedades y las vistas. Lo que se toca ahí queda guardado al confirmar, no antes.

## Propiedades

Ocho tipos, y el tipo decide qué se puede responder y qué se puede hacer después con eso.

| Tipo | Qué guarda |
|---|---|
| Título | El nombre de la fila, que es el título de su página. Va siempre primero y no se puede quitar |
| Texto | Lo que se escriba |
| Número | Una cifra. Es lo único que un gráfico puede sumar o promediar |
| Selección | Una opción de una lista, con su color |
| Selección múltiple | Varias opciones de esa lista |
| Persona | Alguien del espacio |
| Fecha | Un día |
| Casilla | Marcada o sin marcar |

Cambiar el tipo de una propiedad no borra lo que las filas ya respondieron. Lo que no encaje
con el tipo nuevo hay que volver a responderlo.

Una selección declara sus opciones y el color de cada una en la configuración. Ese color es de
la opción, no de la vista, así que la misma etiqueta se ve igual en la tabla, en las tarjetas
del tablero y en las barras de un gráfico.

## Las seis vistas

Todas miran las mismas filas. Cambiar de vista no cambia ningún dato.

| Vista | Para qué sirve |
|---|---|
| Tabla | Comparar filas campo por campo, y responder una celda donde está |
| Tablero | Mover trabajo de un estado a otro arrastrando |
| Lista | Leer una tras otra, con lo que guardan en una línea debajo |
| Galería | Tarjetas grandes cuando lo que importa es ojear |
| Calendario | Poner cada fila en el día que dice |
| Gráfico | Contar, sumar o promediar por grupo |

Una vista se agrega desde la configuración, se renombra, se duplica con todo lo que tiene
puesto, y se cambia de clase sin perder lo que la clase nueva entienda. Cada una lleva su
emoji para reconocerla en la pestaña.

### Tablero

Agrupa por una propiedad, y cada valor es una columna. Arrastrar una tarjeta a otra columna
escribe esa propiedad en la fila; con Alt y las flechas hace lo mismo sin ratón.

Desde la columna se agrega una opción, se renombra, se pinta y se quita. Renombrarla reescribe
también las filas que decían el nombre viejo. Quitarla avisa a cuántas filas deja sin valor, y
esas filas no se borran. Pierden ese valor y caen en «Sin asignar».

Con una segunda agrupación puesta, el tablero se cruza en bandas y cada banda repite las mismas
columnas. Soltar una tarjeta en un cruce escribe las dos propiedades de una vez.

### Calendario

Coloca cada fila en el día de la fecha que elijas, porque una colección puede guardar varias.
Arrastrar una entrada a otro día le escribe esa fecha, y Alt con las flechas la mueve un día a
los lados o una semana arriba y abajo. Lo que no tiene fecha se dice al pie, para que no
parezca borrado.

### Gráfico

Dibuja los mismos grupos que dibujaría un tablero, así que la propiedad por la que agrupa es su
eje. Se elige cómo se dibuja —barras, línea o pastel— y qué mide de cada grupo: cuántas filas
hay, o la suma o el promedio de una propiedad de número. Sin ninguna propiedad de número, solo
se puede contar filas.

## Filtrar, ordenar y buscar

Sobre las filas hay dos botones que dicen cuántas condiciones llevan puestas sin abrirlos.

**Filtrar** arma una frase de arriba abajo. Cada línea dice cómo se une a la anterior —«y» u
«o»—, qué propiedad mira, cómo la compara y contra qué. Los operadores que se ofrecen son los
que ese tipo admite, y una fecha no «contiene» nada.

| Tipo | Qué puede preguntar |
|---|---|
| Título y Texto | es, no es, contiene, no contiene |
| Número | es, no es, es mayor que, es menor que |
| Fecha | es, es antes de, es después de |
| Selección y Persona | es, no es |
| Selección múltiple | contiene, no contiene |
| Casilla | es |

A eso se suman **está vacío** y **tiene valor**, que están en todos los tipos y no preguntan
contra qué. Al elegirlos, el campo del valor desaparece.

Con **Agregar un grupo** abres un paréntesis dentro de la frase, que es la única manera de
decir «esto, y además una de estas otras». El grupo se une con «o» al nacer.

**Ordenar** encadena propiedades. La primera manda y la siguiente desempata, y cada una va de
mayor a menor o al revés.

El **buscador** de arriba de las filas busca entre lo que ya está en pantalla, así que respeta
el filtro puesto. Mira el nombre y lo que se responde escribiendo, no las fechas ni los
números, y compara sin acentos ni mayúsculas. Lo buscado no se guarda, porque es de ese rato.

Lo demás sí se guarda en la vista, no en quien mira. Dos personas ven el mismo filtro.

## Agrupar y calcular

Agrupar no es solo del tablero. La tabla, la lista y la galería también parten sus filas en
grupos, con una franja que dice de qué es el grupo y cuántas filas lleva. Plegar un grupo se
guarda en la vista.

Cuando se agrupa por una fecha, el tramo decide cuánto cabe en cada grupo: un grupo por día,
por semana o por mes. Sin tramo, un año de trabajo serían trescientos grupos de una fila.

Al pie de cada columna de una tabla se elige qué dice de todas sus filas juntas.

| Cálculo | Sobre qué |
|---|---|
| Filas, Con valor, Vacías | Cualquier propiedad |
| Suma, Promedio, Mínimo, Máximo, Mediana | Números |
| Marcadas | Casillas, como porcentaje |

Se cuenta sobre las filas que el filtro dejó pasar, y con la tabla agrupada cada grupo muestra
su propia cuenta.

## Trabajar con muchas filas a la vez

La casilla que acompaña al nombre marca filas. La de la cabecera marca todo lo que se está
viendo, que es lo que el filtro dejó pasar y no lo que la colección guarda.

Con algo marcado aparece una barra que ofrece responder una propiedad en todas, duplicarlas o
eliminarlas. Eliminar manda a la papelera sin preguntar, porque todo eso se deshace desde el
aviso que aparece al terminar.

## Cómo se ve la tabla

El mando sobre la tabla decide el alto de las filas —corto, medio o alto— y si el texto largo
se parte en varias líneas o se corta. Pedir que se parta sube el alto cuando estaba en el más
corto, porque partir sin dejar crecer la fila dejaría las líneas de más fuera de la vista.

En el menú de cada columna se elige hacia qué lado se pega lo que dice, y hasta qué columna se
quedan quietas al desplazarse a lo ancho. El ancho se arrastra del borde derecho de la columna,
o se ajusta con Alt y las flechas.

Todo esto es de la vista. Dos vistas de las mismas filas pueden verse distinto.
