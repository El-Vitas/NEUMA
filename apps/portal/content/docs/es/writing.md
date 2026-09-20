---
title: Escribir en una página
summary: Qué hace cada bloque del menú, lo que se convierte solo al escribir, los atajos y el menú de cada bloque.
order: 3
---

Una página es una pila de bloques. Cada párrafo, cada imagen y cada tabla es uno, y todos se
mueven, se anidan y se duplican igual. Hay tres maneras de poner uno: la barra `/`, la
escritura que se convierte sola, y el botón **+ Añadir un bloque** al final de la página.

Escribe `/` en una línea vacía y aparece la lista. Sigue escribiendo para filtrarla —`/tab`
deja la tabla y el índice— y elige con Enter o con el ratón. Lo que sigue es cada opción de
esa lista, en el orden en que aparece.

## Texto

### Cita

Sangra el párrafo y le pone una línea al costado. Es para reproducir algo escrito por otra
persona, no para destacar algo propio.

### Destacado

Una caja con una marca a la izquierda, para lo que no debe pasarse por alto. Lleva dentro lo
que sea, incluidos otros bloques. Qué marca lleva se elige en las acciones del bloque, así
que un aviso y un dato de paso no se ven igual.

### Encabezado 1, 2 y 3

Parten la página en secciones. Los tres aparecen en el índice lateral y llevan una flecha que
pliega su sección entera, así que una página larga se recorre cerrada. Con `#`, `##` y `###`
salen sin abrir el menú.

## Listas

### Lista con viñetas

Elementos sin orden entre ellos. Tab anida el elemento bajo el anterior y Shift+Tab lo saca,
y cada nivel cambia la viñeta.

### Lista numerada

Lo mismo, pero contando. La numeración se rehace sola al agregar o quitar elementos en medio.

### Lista de tareas

Cada elemento lleva su casilla, y marcarla se guarda en la página como cualquier otro cambio.
Sirve para lo que se hace una vez. Para lo que se sigue en el tiempo, con responsable y fecha,
está la colección.

## Medios

### Imagen

Sube un archivo y lo deja en la página. Debajo se le escribe una descripción, y el ancho se
ajusta arrastrando su borde. Los demás archivos —un PDF, una hoja de cálculo— se adjuntan
desde el botón del final de la página.

## Avanzado

### Botón

Un bloque que hace algo al tocarlo. Se le escribe lo que dice y se elige qué hace:

- **Escribir lo que tiene dentro.** Lo que pongas dentro del botón se escribe en la página
  cada vez que alguien lo toca. Para un formato que se repite, como el acta de una reunión.
- **Agregar una fila a una colección.** Eliges a cuál, y cada toque crea una fila.

### Bloque de código

Código con su resaltado. El lenguaje se elige en la barra del bloque, entre `plain`, `bash`,
`css`, `html`, `java`, `javascript`, `json`, `latex`, `markdown`, `mermaid`, `python`, `sql`,
`typescript` y `yaml`. Dentro del bloque, Tab escribe una sangría en vez de saltar al
siguiente bloque.

Eligiendo `mermaid` o `latex` el bloque deja de mostrar el código y pasa a dibujar el diagrama
o componer la fórmula.

### Diagrama

Un dibujo que se escribe en vez de dibujarse. Qué se puede dibujar y cómo se escribe está en
[Diagramas](diagrams).

### Índice de la página

La lista de los encabezados de la página, con enlace a cada uno. Se rehace sola mientras
escribes, así que no hay que mantenerla. Sirve arriba de una página larga.

### Fórmula y Fórmula en línea

Matemáticas escritas en LaTeX. La primera ocupa su propio bloque y la segunda va en medio de
una frase. Está explicado en [Fórmulas](formulas).

### Subpágina

Crea una página hija y la enlaza aquí en un solo gesto. Queda colgando de esta en el árbol
lateral. Es lo que conviene cuando un tema crece tanto que estorba dentro de la página.

### Colección

Una colección nueva, con su primera propiedad y su primera vista, creada como página hija.
Todo lo que se puede hacer con ella está en [Colecciones y vistas](collections).

### Colección de otra parte

Muestra aquí una colección que ya existe en otra página. Si tiene varias vistas, se pregunta
cuál va en este sitio, así que el mismo dato se puede poner como gráfico junto al párrafo que
lo comenta y como tabla más abajo. No es una copia. Lo que se edita aquí se edita en ella.

### Enlazar una página

Un enlace a una página que ya existe, buscada por su nombre. A diferencia de escribir la
dirección, el enlace sigue a la página si la mueven de sitio, y la página enlazada se entera:
aparece en sus retroenlaces.

### Persona

Una mención a alguien del espacio.

Escribiendo `@` sale el mismo menú, y ahí dentro se menciona además una página o una fecha.
Las fechas se ofrecen como **hoy**, **mañana**, **ayer** o el día que elijas en el calendario.

### Emoji

Un emoji buscado por su nombre, sin salir del teclado.

### Separador

Una línea que corta la página. También sale escribiendo `---`.

### Tabla

Una rejilla de celdas escritas a mano. Desde su barra se agregan y se quitan filas y columnas,
y se decide si la primera fila es de encabezado.

Sirve para datos que no son filas de una colección: una comparación de tres opciones, un
horario. Cuando lo que hay son cosas que se filtran, se ordenan o cambian de estado, eso es
una colección y no una tabla.

### Desplegable

Un bloque plegado que se abre al tocarlo, con lo que sea dentro. Se le escribe un resumen, que
es lo único que se ve cerrado. Para lo que estorba leído de corrido pero tiene que estar, como
el detalle de un cálculo.

## Lo que no está en el menú

| Cómo aparece | Qué queda |
|---|---|
| Pegar un enlace | Se pregunta si dejarlo como enlace, como tarjeta o incrustado, cuando el sitio lo permite |
| Arrastrar un bloque al costado de otro | Los dos quedan en columnas, y el ancho se reparte arrastrando el medio |
| Soltar un archivo en la página | Se adjunta, y si es imagen, vídeo o audio se muestra |
| Escribir `@` | Menciona una persona, una página o una fecha |

## Lo que se convierte solo

Al escribir estos caracteres, el bloque cambia sin tocar la barra.

| Escribes | Queda |
|---|---|
| `# `, `## `, `### ` | Encabezado 1, 2 o 3 |
| `- `, `* `, `+ ` | Lista con viñetas |
| `1. ` | Lista numerada |
| `[] ` o `[ ] ` | Lista de tareas |
| `> ` | Cita |
| `---` | Separador |
| ` ``` ` o ` ```js ` | Bloque de código, con su lenguaje si lo nombras |

Y dentro de una línea, sin salir de ella:

| Escribes | Queda |
|---|---|
| `**negrita**` | **negrita** |
| `*cursiva*` | *cursiva* |
| `` `código` `` | `código` |
| `~~tachado~~` | tachado |
| `[texto](https://…)` | un enlace |

Si lo que querías era el carácter y no la conversión, Ctrl+Z inmediatamente después deshace
la conversión y deja lo escrito.

## El menú de cada bloque

Con Ctrl+/ —o desde el asa que aparece a la izquierda al pasar el ratón— cada bloque ofrece
lo suyo.

| Acción | Qué hace |
|---|---|
| Convertir en | Cambia el bloque de tipo sin perder lo escrito |
| Color del texto y Color de fondo | Tiñen el bloque |
| Duplicar | Una copia justo debajo, con lo que cuelga de él |
| Copiar enlace | Una dirección que lleva a ese bloque, no solo a la página |
| Mover a… | Se lleva los bloques al final de otra página |
| Sincronizar en otra página… | El mismo bloque pasa a verse también allá, y editarlo en cualquiera de las dos lo cambia en ambas |
| Convertir en página | Los bloques se van a una página nueva, y aquí queda el enlace |
| Comentar | Abre un hilo sobre ese bloque |
| Eliminar | Quita el bloque y lo que cuelga de él |

## Atajos de teclado

En Mac, Ctrl es ⌘.

| Atajo | Qué hace |
|---|---|
| Ctrl+B | Negrita |
| Ctrl+I | Cursiva |
| Ctrl+U | Subrayado |
| Ctrl+Shift+S | Tachado |
| Ctrl+E | Código |
| Ctrl+K | Enlace |
| Ctrl+F | Buscar en la página |
| Ctrl+/ | Abrir las acciones del bloque |
| Ctrl+D | Duplicar el bloque, con lo que cuelga de él |
| Ctrl+Shift+↑ y Ctrl+Shift+↓ | Subir o bajar el bloque una posición |
| Tab y Shift+Tab | Anidar el bloque bajo el anterior, o sacarlo |
| Escape | Seleccionar el bloque completo |
| Ctrl+A | Seleccionar el bloque y, otra vez, la página |
| Ctrl+Shift+Retroceso | Eliminar los bloques seleccionados |
| Ctrl+Z y Ctrl+Shift+Z | Deshacer y rehacer |

La misma lista está en el botón **Atajos de teclado**, al final de cada página.
