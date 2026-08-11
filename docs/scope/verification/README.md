# Verificación funcional — Company Brain

Lo que el producto **debe poder hacer**, escrito como comportamientos observables en la interfaz, para revisarlos uno a uno.

## Para qué sirve esto

No es un inventario de lo que está hecho. Es la lista de lo que debe funcionar. Que algo ya exista en el código no cambia nada: igual se prueba, igual se marca. Varias cosas ya construidas no convencen, y esa es justamente la razón de revisarlas.

Cada punto está escrito para que se pueda comprobar **mirando la pantalla**, sin leer código.

## Cómo se usa

1. Se toma un bloque de capacidad (por ejemplo `ED-05`).
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
| `01-escritura-y-editor.md` | Escribir: bloques, markdown, formato, menciones, arrastre de bloques |
| `02-paginas-y-navegacion.md` | Crear, anidar, mover, papelera, favoritos, árbol lateral, búsqueda |
| `03-colecciones-propiedades-vistas.md` | Colecciones, tipos de propiedad, tabla, tablero, filtros, orden |
| `04-colaboracion-y-permisos.md` | Edición simultánea, comentarios, historial, permisos, compartir |
| `05-grafo-de-conocimiento.md` | Menciones, retroenlaces, menciones sin enlazar, grafo |
| `06-agentes-y-experiencia.md` | MCP, modo oscuro, atajos, móvil, estados vacíos |
| `07-importacion-y-exportacion.md` | Markdown, PDF, CSV, exportación masiva, importar desde otras herramientas |
| `08-plantillas.md` | Elegir al crear, plantillas de fábrica y propias, plantillas de fila |
| `09-administracion-y-cuenta.md` | Invitaciones, roles de la organización, grupos, auditoría, perfil, sesiones |
| `10-automatizacion-e-integraciones.md` | Disparadores, botones, recurrencia, recordatorios, sistemas externos, IA |
| `11-rendimiento-y-limites.md` | Colecciones grandes, páginas largas, memoria, límites, tolerancia a lo desconocido |

## Orden sugerido

De lo que más se usa a lo que menos:

1. `01` — escritura. Es donde se pasa el día y donde más se nota lo que falta.
2. `02` — páginas y navegación.
3. `03` — colecciones y vistas.
4. `08` — plantillas. Va después de las colecciones porque una plantilla las reproduce.
5. `05` — grafo de conocimiento.
6. `04` — colaboración y permisos.
7. `09` — administración y cuenta.
8. `07` — importación y exportación.
9. `10` — automatización e integraciones.
10. `06` — agentes y detalle.
11. `11` — rendimiento. Se revisa al final, pero se siembra el volumen de datos desde ya.

Es una propuesta. Se puede empezar por lo que más moleste hoy.

## Cómo se anota el resultado

Al final de cada documento hay una bitácora. Se registra la fecha, el bloque, y qué faltó. Un bloque sin fila en la bitácora es un bloque no revisado.
