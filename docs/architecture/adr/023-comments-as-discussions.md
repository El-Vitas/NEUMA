# 023: Comments become threaded discussions with mentions and an inbox

**Status:** Accepted
**Date:** 2026-10-20
**Depends on:** `021-everything-is-a-block.md`, `022-retire-the-outbox-and-projection-workers.md`

## Context

Today a comment is an object `{ id, author, body, createdAt }` inside the block's `format.comments`, with a maximum of 50 (`PAGE_BLOCK_COMMENTS_MOST`). If the comment quotes a stretch of text, that stretch carries an inline `comment` mark with the comment's id. This leaves four limits:

- there are no replies, so a conversation is a flat list of loose comments;
- nothing can be resolved or reopened;
- `body` is plain text, with no mentions, and nobody finds out they were named;
- comments travel with the block. Editing the block rewrites all of its comments, and two people commenting at the same time compete for the same field.

What is sought is to store each discussion and each comment as records of their own. The plan `2026-10-20-daily-work.md` asks for the same in stage 2, together with a notifications inbox delivered over the live channel.

## Alternatives Considered

- **Keep the list inside the block and add `replies` and `resolved`.**
  - PRO: zero new tables and comments move with the block.
  - CON: each reply is a write on the block and bumps its `version`. The cap of 50 becomes the cap for the whole thread. A notifications inbox would force walking all blocks to find mentions.
- **Own `Discussion` and `Comment` tables (chosen).**
  - PRO: a reply writes one row and does not touch the block. They are listed, resolved and notified with simple queries and indexes.
  - CON: two more tables, a data migration and a new rule so that the block's permissions filter the discussions.
- **A single `Comment` with `parentCommentId` and no `Discussion`.**
  - PRO: one table fewer.
  - CON: resolving and anchoring to a stretch of text are properties of the thread, not of each message. They would have to be repeated on the root and the root queried to know the state.
- **Store comments as child blocks of type `comment`.**
  - PRO: consistent with ADR 021 and inherits permissions, versions and the live channel.
  - CON: the children of a block are page content. Comments would show up on export, move or duplicate, and would have to be excluded in every reader. A discussion is not content.

## Decision

### Model

`Discussion`
| Field | What it stores |
|---|---|
| `id` | uuid v7 |
| `blockId` | the commented block; `onDelete: Cascade` |
| `spaceId` | copy of the block's space, to filter and protect by space |
| `anchorMarkId` | id of the inline `comment` mark that covers the quoted stretch; null if the thread belongs to the whole block |
| `quote` | the text quoted when the discussion was created, to show it even if the stretch is edited |
| `resolvedAt`, `resolvedById` | null while open |
| `createdById`, `createdAt` | authorship |

`Comment`
| Field | What it stores |
|---|---|
| `id` | uuid v7 |
| `discussionId` | the discussion; `onDelete: Cascade` |
| `body` | rich text with the same Yjs delta shape that `properties` uses (`BlockRichText`), including `person` embeds |
| `authorId` | who wrote it |
| `createdAt`, `editedAt`, `deletedAt` | `deletedAt` marks a soft delete |

A deleted comment keeps its row with an empty `body`, so the thread does not change shape. If all the comments of a discussion are deleted, the discussion is deleted.

### Permissions

Those of the page or the block. They are not stored in either of the two tables.
- Viewing a discussion requires being able to read its block.
- Who can comment does not change. Today a comment is stored in the block's content (and the MCP requires the `pages:write` permission for it), so whoever can edit the block can comment (`canEditBlock`, block role `editor` or higher). A reader (for example the `CLIENT` role) sees the threads but does not comment. Creating a discussion and replying follow that same rule; this ADR neither widens nor narrows it.
- Editing or deleting a comment requires being its author and still being able to comment on the block. A workspace `ADMIN` can delete any comment (moderation), but not edit it.
- Anyone who can comment can resolve or reopen.
- Every listing filters with the same per-block permission from ADR 021. A discussion on a block the reader cannot read does not appear, nor does its count, nor in the MCP, nor in notifications.

### The inline mark

The `comment` mark is kept, but its `id` becomes that of the `Discussion` and not that of a comment. That way the text stays underlined and the editor finds the thread by the id. A whole-block discussion has no mark and is shown from the block menu.
- If the marked text is deleted, the discussion stays alive, with its `quote`, and is shown as "deleted text".
- Resolving a discussion removes the underline in the editor but does not change the block's text. The mark is only painted if the discussion is open.

### Mentions

A mention in a comment is the `person` embed that already exists, with `userId` and `label`. No new format is created.
- When saving a comment, the server extracts the `userId`s from the `person` embeds and creates one `mention` notification for each distinct person, except the author.
- A mention in the text of a page also notifies, because it shares the embed. The server detects it when applying `applyText` and compares it with the block's previous mentions, so as not to notify again someone who was already there.
- Only someone who can read the block is notified. Mentioning someone without access creates nothing and reveals neither that the person exists nor that the block exists.

### Notifications

`Notification`
| Field | What it stores |
|---|---|
| `id` | uuid v7 |
| `recipientId` | the person |
| `kind` | `mention`, `reply` or `page_change` |
| `blockId`, `discussionId`, `commentId` | the origin, the last two null if it came from a mention in the text |
| `actorId` | who triggered it |
| `readAt` | null until read |
| `createdAt` | inbox order |

- `reply` is created for whoever took part in the discussion (wrote or was mentioned) and is not the author of the reply.
- `page_change` is reserved in the enum and is not implemented in this stage, because page following does not exist yet. Nothing creates or lists it.
- One notification per origin and recipient. If the same person is mentioned and also participates, they receive only `mention`.
- When the inbox is read, the block permission is checked again. If access was lost, the notification is neither returned nor counted as unread.
- Retention. An unread notification is never deleted. A read one is deleted 90 days after `readAt`, with the same pattern as the existing retention scheduler, without a new process.
- The listings (inbox and discussions per page) are bounded and paginate with a cursor.

### Live delivery

The `/api/v1/blocks/live` channel already authenticates each socket with a user token. A per-user flow is added over the same socket.
- When a notification is created, the same Postgres transaction emits a `NOTIFY` with `{ recipientId, notificationId }`, just like the block versions.
- The channel manager finds that user's sockets and sends them the `notification` message with the full notification and the unread count.
- The client does not need to subscribe, because the flow belongs to the user and not to a page. On reconnect it asks for the count and the first page over HTTP, as it does with blocks.
- New discussions, replies and status changes on the open page use the existing version message, with a `discussion` type, and respect the page subscription. That way two people on the same page see the thread grow without reloading.

### Migration of the current comments

A data migration walks every `Block` with a non-empty `format.comments` and, for each element:
1. creates a `Discussion` with the same `id` as the comment, so that the already existing `comment` marks keep pointing to it without touching the text;
2. creates a `Comment` with `body` converted from plain text to a delta with a single `insert`, `authorId` looked up by the stored name and the original `createdAt`;
3. the author is resolved only if exactly one workspace member has that name, with an exact match. If there is none or several, it uses the block's creator and leaves the original name as a prefix of the body, so as not to lose authorship. The migration output counts and reports each of those cases;
4. removes `comments` from `format` in the same transaction.

The migration counts the comments before and the threads after, and fails if they do not match. It is tested against a copy of the database with real comments. `PageBlockComment` and `PAGE_BLOCK_COMMENTS_MOST` are retired from the shared schema together with the migration. Since there is no production (same criterion as ADR 022), there is no coexistence between the old and the new format.

### MCP

Two new tools, `list_discussions` and `reply_to_discussion`. The existing `comment_on_block` and `delete_comment` now write `Discussion` and `Comment`. All of them apply the same per-block filter.

## Consequences

- Positive:
  - real threads, with replies, resolution and reopening;
  - replying does not bump the block's `version` or compete with whoever is editing it;
  - mentions notify and the inbox is built with a query by `recipientId`;
  - the limit of 50 comments per block disappears.
- Negative:
  - two new tables and a notifications table, with their migration;
  - every read of discussions checks block permissions, which is more expensive than reading `format`;
  - the `comment` mark and the discussion can drift apart if the marked text is deleted, and the editor has to tolerate it;
  - detecting new mentions in `applyText` adds work to the text transaction.
- Accepted as a cost: soft delete leaves empty rows to preserve the shape of the thread.

## Governance

The comment business rules (`FEA-BLQ`) that assume the list inside the block are replaced with `rules:add` and `supersedes` on implementation. Any new notification origin (following a page, a reminder) is decided in an ADR of its own or as an extension of this one, and reuses `Notification` and the per-user flow.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 2)
