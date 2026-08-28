# Estado de los documentos de verificación

Revisión del 2026-08-22. Qué tan al día está cada documento y por qué.

## El diagnóstico, en una línea

Los documentos del `05` al `13` **no están escritos al estilo Outline**: hablan
de bloques y de filas que son páginas, que es el modelo correcto. Lo que les
pasa es otra cosa — se escribieron el día del giro y nadie los volvió a abrir
mientras el producto avanzaba. Su `0/756` no dice «no hay nada hecho», dice
«nadie ha medido».

## Cómo se llegó a esto

`git log` sobre la carpeta: los documentos `05` a `13` y el `README` tienen
todos la misma fecha, la del giro al modelo de bloques. Los documentos `01` a
`04` siguieron cambiando después, a medida que se construía. Los otros nueve
quedaron ahí.

## Lo que se corrigió en esta revisión

- **Nueve de trece títulos no coincidían con el número de su archivo** — fósil
  de cuando se insertaron los tres documentos de bloques al principio y se
  renumeraron los archivos sin tocar los encabezados. Corregidos.
- **Se corrigió una regla de negocio que estaba mal, y el error fue de un
  agente.** Decía que varias páginas salen en un solo archivo. Nadie decidió
  eso: fue una elección de diseño tomada al construir la exportación y
  registrada como si fuera decisión de producto. Lo decidido es **un archivo por
  página**, y varias páginas en un comprimido cuyas carpetas son su jerarquía —
  una colección siempre comprimida, porque cada fila es una página. La regla
  vieja queda `superseded`; el documento `09` vuelve a pedir lo correcto.
  **Y se construyó:** una página sale como Markdown, varias salen comprimidas
  con un archivo por página y las carpetas como jerarquía. Comprobado contra la
  API el 2026-08-22.
- **Se construyó lo que faltaba del `09` y podía construirse.** Exportar una
  selección suelta de páginas desde la barra lateral; los adjuntos viajan dentro
  del comprimido, en una carpeta `assets`; y los enlaces entre páginas
  exportadas apuntan al archivo vecino por camino relativo, dejando intacto el
  enlace a una página que no viajó. Comprobado en el navegador el 2026-08-22.
  El aviso de avance de una exportación grande **no se hizo**: necesita tareas
  en segundo plano, que no existen.
- **Una casilla del `04` estaba mal marcada, y la marqué yo.** «Se pueden
  exportar todas juntas» vive bajo *actuar sobre varias páginas a la vez*, o
  sea sobre la selección. La exportación existe, pero por página, por rama o
  por espacio entero: el modo selección ofrece mover y papelera, no exportar.
  Devuelta a sin marcar.

## Lo que falta por medir, documento por documento

Nadie ha corrido estos documentos contra la aplicación. Esto es lo que se sabe
leyendo el código, y sirve para saber por dónde empezar — **no reemplaza
probarlo en pantalla**.

| Doc | Construido | Sin construir |
|---|---|---|
| `04` páginas | crear, anidar, mover, papelera, portada, ícono, bloqueo, selección múltiple | que una página sea colección o lienzo (`PG-22`, `PG-23`) |
| `05` colecciones | 8 tipos de propiedad; tabla y tablero con barra de vistas; arrastrar tarjetas entre columnas, también con teclado; configurar la forma después de crear la colección (agregar y quitar propiedades, opciones y colores); filtrar, ordenar y agrupar en el servidor; colección incrustada | manejo de columnas, elegir la agrupación desde la pantalla, filtros en pantalla, qué muestra una tarjeta, cambiar el tipo de una propiedad, enlace/correo/teléfono, archivos como propiedad, relaciones, cálculos, fórmulas, datos automáticos; vistas de lista, galería, calendario y línea de tiempo |
| `06` colaboración | edición simultánea, comentarios de bloque, versiones, visibilidad de espacio, privado | publicar hacia afuera, historial navegable |
| `07` grafo | menciones, retroenlaces | menciones sin enlazar, grafo visual |
| `08` agentes | MCP, modo oscuro, atajos | por medir |
| `09` importar/exportar | exportar a Markdown (página, rama, selección, espacio), con adjuntos y enlaces relativos | importar cualquier cosa, PDF, HTML, CSV, copiar como Markdown, imprimir, aviso de avance |
| `10` plantillas | nada | todo |
| `11` administración | usuarios y roles | grupos, invitaciones, auditoría |
| `12` automatización | el bloque de botón | disparadores, recurrencia, recordatorios, IA |
| `13` rendimiento | nada medido | todo |

## Lo que se ordenó

- **El hueco de `CO-04` se cerró** renumerando lo que venía detrás. La
  numeración de los trece documentos quedó sin huecos ni repetidos, y cada
  título coincide con el número de su archivo.
- **Cada documento del `05` al `13` dice ahora, en su cabecera, qué existe
  construido y qué no.** Con una advertencia que no se puede saltar: eso sirve
  para saber por dónde empezar a probar, **no para ahorrarse la prueba**. Nada
  se marca por haber leído el código.
- **Lo caro del `05` se apartó.** Relaciones, cálculos, fórmulas, calendario y
  línea de tiempo quedan en una sección propia: mientras exista, el documento se
  da por completo sin ellas. No son más propiedades — necesitan un grafo de
  dependencias y recálculo, que es medio motor de base de datos.
- **Se agregó `VW-03`, el manejo de las columnas del tablero.** Arrastrar
  tarjetas ya estaba; mandar sobre las columnas no. Agregar, renombrar,
  reordenar, pintar, plegar, topes por columna y subgrupos — que es lo que hace
  que un tablero sea un kanban y no una lista en columnas. Va detrás del tablero,
  no al final.

## La dirección que se tomó el 2026-08-22

El producto apunta a ser componible, como AFFiNE y Notion, y no a sumar
funciones sueltas. Eso se apoya en tres separaciones:

- **El dato no sabe cómo se ve.** Un conjunto de páginas con propiedades se
  dibuja como tabla, tablero o calendario sin que el dato cambie.
- **La vista es una pieza, no un lugar.** En AFFiNE la vista de datos vive en su
  propio paquete (`blocksuite/affine/data-view`), aparte del bloque que la
  hospeda, con sus tipos de vista y sus tipos de propiedad enchufables. Agregar
  un calendario no obliga a tocar el bloque.
- **Dónde se monta es otra decisión.** La misma vista sirve ocupando una página
  entera o metida dentro de otra. Notion guarda el mismo dato en los dos casos.

De ahí salieron tres bloques nuevos de verificación: `PG-22` (una página puede
ser documento, colección o lienzo), `PG-23` (la página como lienzo) y `CO-07`
(la colección se ve igual esté donde esté).

Nuestro problema es el opuesto al de AFFiNE. Ellos tienen la pieza suelta y no
tienen página propia para ella; nosotros tenemos el modelo de página correcto
—una colección **es** una página, y sus filas son sus hijas— con la vista
cableada en un componente que solo sabe dibujarse al final de la página.

## Lo que queda por decidir

1. **Los documentos `10` y `12` describen producto que no existe** salvo el
   bloque de botón. Ya lo dicen en su cabecera, pero hay que decidir si son la
   siguiente etapa o si esperan.
2. **El `13` no se poda, se corre.** Todo lo suyo se mide sobre lo que ya
   existe.
