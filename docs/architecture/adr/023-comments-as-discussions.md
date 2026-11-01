# 023: Los comentarios pasan a discusiones con hilo, menciones y bandeja

**Status:** Accepted
**Date:** 2026-10-20
**Depends on:** `021-everything-is-a-block.md`, `022-retire-the-outbox-and-projection-workers.md`

## Context

Hoy un comentario es un objeto `{ id, author, body, createdAt }` dentro de `format.comments` del bloque, con un máximo de 50 (`PAGE_BLOCK_COMMENTS_MOST`). Si el comentario cita un tramo de texto, ese tramo lleva una marca en línea `comment` con el id del comentario. Esto deja cuatro límites:

- no hay respuestas, así que una conversación es una lista plana de comentarios sueltos;
- no se puede resolver ni reabrir nada;
- `body` es texto plano, sin menciones, y nadie se entera de que lo nombraron;
- los comentarios viajan con el bloque. Editar el bloque reescribe todos sus comentarios, y dos personas que comentan a la vez compiten por el mismo campo.

Notion guarda cada discusión y cada comentario como registros propios. El plan `2026-10-20-paridad-con-notion.md` pide lo mismo en la etapa 2, junto con una bandeja de notificaciones que llegue por el canal en vivo.

## Alternatives Considered

- **Mantener la lista dentro del bloque y añadir `replies` y `resolved`.**
  - PRO: cero tablas nuevas y los comentarios se mueven con el bloque.
  - CON: cada respuesta es una escritura sobre el bloque y sube su `version`. El tope de 50 se vuelve el tope de todo el hilo. Una bandeja de notificaciones obligaría a recorrer todos los bloques para encontrar menciones.
- **Tablas propias `Discussion` y `Comment` (elegida).**
  - PRO: una respuesta escribe una fila y no toca el bloque. Se listan, resuelven y notifican con consultas simples e índices.
  - CON: dos tablas más, una migración de datos y una regla nueva para que los permisos del bloque filtren las discusiones.
- **Un solo `Comment` con `parentCommentId` y sin `Discussion`.**
  - PRO: una tabla menos.
  - CON: resolver y anclar a un tramo de texto son propiedades del hilo, no de cada mensaje. Habría que repetirlas en la raíz y consultar la raíz para saber el estado.
- **Guardar los comentarios como bloques hijos de tipo `comment`.**
  - PRO: coherente con el ADR 021 y hereda permisos, versiones y canal en vivo.
  - CON: los hijos de un bloque son contenido de la página. Los comentarios aparecerían al exportar, mover o duplicar, y habría que excluirlos en cada lector. Una discusión no es contenido.

## Decision

### Modelo

`Discussion`
| Campo | Qué guarda |
|---|---|
| `id` | uuid v7 |
| `blockId` | el bloque comentado; `onDelete: Cascade` |
| `spaceId` | copia del espacio del bloque, para filtrar y proteger por espacio |
| `anchorMarkId` | id de la marca en línea `comment` que cubre el tramo citado; nulo si el hilo es del bloque entero |
| `quote` | el texto citado al crear la discusión, para mostrarlo aunque el tramo se edite |
| `resolvedAt`, `resolvedById` | nulos mientras está abierta |
| `createdById`, `createdAt` | autoría |

`Comment`
| Campo | Qué guarda |
|---|---|
| `id` | uuid v7 |
| `discussionId` | la discusión; `onDelete: Cascade` |
| `body` | texto enriquecido con la misma forma de delta Yjs que usa `properties` (`BlockRichText`), incluidos los embeds `person` |
| `authorId` | quien lo escribió |
| `createdAt`, `editedAt`, `deletedAt` | `deletedAt` marca un borrado suave |

Un comentario borrado conserva su fila con `body` vacío, para que el hilo no cambie de forma. Si todos los comentarios de una discusión están borrados, la discusión se borra.

### Permisos

Los de la página o el bloque. No se guardan en ninguna de las dos tablas.
- Ver una discusión exige poder leer su bloque.
- Quién puede comentar no cambia. Hoy un comentario se guarda en el contenido del bloque (y el MCP lo exige con el permiso `pages:write`), así que comenta quien puede editar el bloque (`canEditBlock`, rol de bloque `editor` o superior). Un lector (por ejemplo el rol `CLIENT`) ve los hilos pero no comenta. Crear una discusión y responder siguen esa misma regla; este ADR no la amplía ni la reduce.
- Editar o borrar un comentario exige ser su autor y seguir pudiendo comentar en el bloque. Un `ADMIN` del workspace puede borrar cualquier comentario (moderación), pero no editarlo.
- Resolver o reabrir lo puede hacer cualquiera que pueda comentar.
- Todo listado filtra con el mismo permiso por bloque del ADR 021. Una discusión de un bloque que el lector no puede leer no aparece, ni su conteo, ni en el MCP, ni en las notificaciones.

### La marca en línea

La marca `comment` se mantiene, pero su `id` pasa a ser el de la `Discussion` y no el de un comentario. Así el texto sigue subrayado y el editor encuentra el hilo por el id. Una discusión del bloque entero no tiene marca y se muestra desde el menú del bloque.
- Si el texto marcado se borra, la discusión sigue viva, con su `quote`, y se muestra como «texto eliminado».
- Resolver una discusión quita el subrayado en el editor pero no cambia el texto del bloque. La marca solo se pinta si la discusión está abierta.

### Menciones

Una mención en un comentario es el embed `person` que ya existe, con `userId` y `label`. No se crea un formato nuevo.
- Al guardar un comentario, el servidor extrae los `userId` de los embeds `person` y crea una notificación `mention` por cada persona distinta, salvo el autor.
- La mención en el texto de una página también notifica, porque comparte el embed. El servidor la detecta al aplicar `applyText` y compara con las menciones anteriores del bloque, para no notificar de nuevo a quien ya estaba.
- Solo se notifica a quien puede leer el bloque. Mencionar a alguien sin acceso no crea nada y no revela que la persona existe ni que el bloque existe.

### Notificaciones

`Notification`
| Campo | Qué guarda |
|---|---|
| `id` | uuid v7 |
| `recipientId` | la persona |
| `kind` | `mention`, `reply` o `page_change` |
| `blockId`, `discussionId`, `commentId` | el origen, los dos últimos nulos si nació de una mención en el texto |
| `actorId` | quien la provocó |
| `readAt` | nulo mientras no se lee |
| `createdAt` | orden de la bandeja |

- `reply` se crea para quien participó en la discusión (escribió o fue mencionado) y no es el autor de la respuesta.
- `page_change` queda reservado en el enum y no se implementa en esta etapa, porque el seguimiento de páginas no existe todavía. Nada lo crea ni lo lista.
- Una notificación por origen y destinatario. Si la misma persona es mencionada y además participa, recibe solo `mention`.
- Al leer la bandeja se vuelve a comprobar el permiso del bloque. Si perdió el acceso, la notificación no se devuelve ni cuenta como no leída.
- Retención. Una notificación sin leer no se borra nunca. Una leída se borra 90 días después de `readAt`, con el mismo patrón del programador de retención existente, sin un proceso nuevo.
- Los listados (bandeja y discusiones por página) están acotados y paginan con cursor.

### Entrega en vivo

El canal `/api/v1/blocks/live` ya autentica a cada socket con un token de usuario. Se añade un flujo por usuario sobre el mismo socket.
- Al crear una notificación, la misma transacción de Postgres emite un `NOTIFY` con `{ recipientId, notificationId }`, igual que las versiones de bloques.
- El gestor del canal busca los sockets de ese usuario y le envía el mensaje `notification` con la notificación completa y el conteo de no leídas.
- El cliente no necesita suscribirse, porque el flujo es del usuario y no de una página. Al reconectar pide el conteo y la primera página con HTTP, como hace con los bloques.
- Las discusiones nuevas, respuestas y cambios de estado en la página abierta usan el mensaje de versión existente, con un tipo `discussion`, y respetan la suscripción a la página. Así dos personas en la misma página ven el hilo crecer sin recargar.

### Migración de los comentarios actuales

Una migración de datos recorre cada `Block` con `format.comments` no vacío y, por cada elemento:
1. crea una `Discussion` con el mismo `id` del comentario, para que las marcas `comment` ya existentes sigan apuntando a ella sin tocar el texto;
2. crea un `Comment` con `body` convertido de texto plano a un delta con un solo `insert`, `authorId` buscado por el nombre guardado y `createdAt` original;
3. el autor se resuelve solo si exactamente un miembro del workspace tiene ese nombre, con coincidencia exacta. Si no hay ninguno o hay varios, usa el creador del bloque y deja el nombre original como prefijo del cuerpo, para no perder la autoría. La salida de la migración cuenta e informa cada uno de esos casos;
4. quita `comments` de `format` en la misma transacción.

La migración cuenta los comentarios antes y los hilos después, y falla si no coinciden. Se prueba contra una copia de la base con comentarios reales. `PageBlockComment` y `PAGE_BLOCK_COMMENTS_MOST` se retiran del esquema compartido junto con la migración. Como no hay producción (mismo criterio del ADR 022), no hay convivencia entre el formato viejo y el nuevo.

### MCP

Dos herramientas nuevas, `list_discussions` y `reply_to_discussion`. Las existentes `comment_on_block` y `delete_comment` pasan a escribir `Discussion` y `Comment`. Todas aplican el mismo filtro por bloque.

## Consequences

- Positivas:
  - hilos reales, con respuestas, resolución y reapertura;
  - responder no sube la `version` del bloque ni compite con quien lo edita;
  - las menciones notifican y la bandeja se arma con una consulta por `recipientId`;
  - el límite de 50 comentarios por bloque desaparece.
- Negativas:
  - dos tablas y una tabla de notificaciones nuevas, con su migración;
  - cada lectura de discusiones comprueba permisos de bloque, que es más caro que leer `format`;
  - la marca `comment` y la discusión pueden quedar desfasadas si el texto marcado se borra, y el editor tiene que tolerarlo;
  - detectar menciones nuevas en `applyText` añade trabajo a la transacción de texto.
- Aceptado como costo: el borrado suave deja filas vacías para conservar la forma del hilo.

## Governance

Las reglas de negocio de comentarios (`FEA-BLQ`) que suponen la lista dentro del bloque se reemplazan con `rules:add` y `supersedes` al implementar. Cualquier nuevo origen de notificación (seguir una página, un recordatorio) se decide en un ADR propio o como ampliación de este, y reutiliza `Notification` y el flujo por usuario.

## Notes

- Author: El-Vitas, con Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20
- Referencia: `docs/superpowers/plans/2026-10-20-paridad-con-notion.md` (etapa 2)
