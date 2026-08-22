# Estado de los documentos de verificación

Revisión del 2026-08-22. Qué tan al día está cada documento y por qué.

## El diagnóstico, en una línea

Los documentos del `05` al `13` **no están escritos con el modelo viejo**: hablan
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
| `05` colecciones | 8 tipos de propiedad (título, texto, selección simple y múltiple, persona, fecha, casilla, número); vista de tabla y tablero; colección incrustada | enlace/correo/teléfono, archivos como propiedad, relaciones, cálculos sobre relaciones, fórmulas, datos automáticos de la página; vistas de lista, galería, calendario y línea de tiempo |
| `06` colaboración | edición simultánea, comentarios de bloque, versiones, visibilidad de espacio, privado | publicar hacia afuera, historial navegable |
| `07` grafo | menciones, retroenlaces | menciones sin enlazar, grafo visual |
| `08` agentes | MCP, modo oscuro, atajos | por medir |
| `09` importar/exportar | exportar a Markdown (página, rama, espacio) | importar cualquier cosa, PDF, HTML, CSV, copiar como Markdown, imprimir |
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

## Lo que queda por decidir

1. **`IO-02` pide exportar una selección suelta de páginas.** Hoy se exporta por
   página, rama o espacio. Si esa casilla se queda, es trabajo por hacer.
2. **Los documentos `10` y `12` describen producto que no existe** salvo el
   bloque de botón. Ya lo dicen en su cabecera, pero hay que decidir si son la
   siguiente etapa o si esperan.
3. **El `13` no se poda, se corre.** Todo lo suyo se mide sobre lo que ya
   existe.
