# Verificación funcional — Neuma

Lo que el producto **debe poder hacer**, escrito como comportamientos observables en la interfaz, para revisarlos uno a uno.

## Para qué sirve esto

No es un inventario de lo que está hecho. Es la lista de lo que debe funcionar. Que algo ya exista en el código no cambia nada: igual se prueba, igual se marca. Varias cosas ya construidas no convencen, y esa es justamente la razón de revisarlas.

Cada punto está escrito para que se pueda comprobar **mirando la pantalla**, sin leer código.

## El modelo que se está verificando

**Todo el contenido es un bloque.** Una página es un árbol de bloques; un párrafo, una imagen, una tabla y una colección son todos bloques y admiten las mismas operaciones. Los documentos están ordenados según ese modelo, no según cómo esté construido el producto por dentro.

Por eso `01` no habla de tipos de contenido sino de lo que se puede hacer con cualquier bloque, y una colección aparece como un tipo de bloque más antes de tener su propio documento.

## Cómo se usa

1. Se toma un bloque de capacidad (por ejemplo `BL-04`).
2. Se prueba en la aplicación corriendo: `bun run dev`, portal en `http://localhost:3010`.
3. Se marca cada casilla que se cumple. Las que no, quedan sin marcar.
4. Lo que quede sin marcar se implementa o se corrige.
5. Se vuelve a probar el bloque completo hasta que todas las casillas quedan marcadas.
6. Recién entonces se pasa al siguiente bloque.

**Reglas para quien acompaña la revisión:**

- Ningún bloque se da por bueno sin que El-Vitas lo haya probado. La opinión de un agente sobre si "ya está" no cierra nada.
- Un bloque a la vez. Nada de juntar cinco funcionalidades en una sola ronda de comentarios.
- Si al probar aparece un comportamiento esperado que no está en la lista, se agrega como casilla nueva. La lista crece con lo que se descubre usando el producto.
- Las casillas describen comportamiento, nunca implementación. Si un punto solo se puede verificar leyendo código, está mal escrito.

## Documentos

| Documento | Cubre |
|---|---|
| `01-bloques.md` | El bloque como unidad: crear, seleccionar, arrastrar, anidar, convertir, enlazar |
| `02-tipos-de-bloque.md` | El catálogo de tipos, la colección incluida |
| `03-escritura-y-formato.md` | Escribir dentro de un bloque: markdown, formato, menciones, guardado |
| `04-paginas-y-navegacion.md` | Crear, anidar, mover, papelera, favoritos, árbol, búsqueda |
| `05-colecciones-propiedades-vistas.md` | Tipos de propiedad, tabla, tablero, filtros, orden, cálculos |
| `06-colaboracion-y-permisos.md` | Edición simultánea, comentarios, historial, permisos, publicar |
| `07-grafo-de-conocimiento.md` | Menciones, retroenlaces, menciones sin enlazar, grafo |
| `08-agentes-y-experiencia.md` | MCP, modo oscuro, atajos, móvil, estados vacíos |
| `09-importacion-y-exportacion.md` | Markdown, PDF, CSV, exportación masiva, importar desde Notion |
| `10-plantillas.md` | Elegir al crear, plantillas de fábrica y propias, plantillas de fila |
| `11-administracion-y-cuenta.md` | Invitaciones, roles, grupos, auditoría, perfil, sesiones |
| `12-automatizacion-e-integraciones.md` | Disparadores, botones, recurrencia, recordatorios, IA |
| `13-rendimiento-y-limites.md` | Colecciones grandes, páginas largas, memoria, límites |
| `14-revision-y-aprobacion-de-cambios.md` | Una página verificada con responsables no se edita: se propone, y ellos aprueban, rechazan o piden cambios |

## Orden sugerido

De lo que sostiene todo lo demás a lo que menos se usa:

1. `01` — bloques. Es la base: si mover o anidar no funciona, nada de lo que sigue se siente terminado.
2. `02` — tipos de bloque.
3. `03` — escritura y formato.
4. `04` — páginas y navegación.
5. `05` — colecciones y vistas.
6. `10` — plantillas. Va después de las colecciones porque una plantilla las reproduce.
7. `07` — grafo de conocimiento.
8. `06` — colaboración y permisos.
9. `14` — revisión y aprobación. Va pegado al `06`: se apoya en su modo sugerencia (`CL-10`), en sus comentarios y en su historial, y no se puede probar antes que ellos.
10. `11` — administración y cuenta.
11. `09` — importación y exportación.
12. `12` — automatización e integraciones.
13. `08` — agentes y detalle.
14. `13` — rendimiento. Se revisa al final, pero se siembra el volumen de datos desde ya.

## De dónde salen algunos comportamientos

Varias casillas de `01`, `05` y `13` no salieron de mirar Notion, sino de estudiar cómo resuelven lo mismo otros editores de bloques de código abierto, como AFFiNE y AppFlowy.

Una advertencia que sale de ahí: que una colección sea un bloque **dentro** de una página —y no una página completa— es el escalón que `../../architecture/adr/008-adopt-single-page-primitive-notion-alignment.md` dejó deliberadamente fuera. Las casillas están escritas igual, porque describen lo que el producto debe hacer; cumplirlas implica revisar esa decisión.

## Cómo se anota el resultado

Al final de cada documento hay una bitácora. Se registra la fecha, el bloque, y qué faltó. Un bloque sin fila en la bitácora es un bloque no revisado.
