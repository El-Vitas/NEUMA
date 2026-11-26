# Plan: what Neuma still needs for daily work

It comes from two studies dated October 20, 2026:
- the inventory of what Neuma has today, read from the code;
- a study of how views, queries and boards are used in daily work.

It is built on the block model of ADR 021, on a new branch from `develop` once `refactor/bloques-planos` is integrated.

Each stage closes the same way:
- an ADR before the code when the stage makes a design decision;
- new or replaced business rules with `rules:add`;
- tests written before the code, seen failing;
- `bun run check` at zero and the backend and portal suites green;
- the stage tested in the browser, with a `QA <topic>` page that stays in Engineering;
- one commit per stage.

## Order and dependencies

| # | Stage | Depends on | ADR | Cost |
|---|---|---|---|---|
| 1 | Version history in the interface | — | no | low |
| 2 | Threaded comments, with mentions and inbox | — | yes | medium |
| 3 | Missing properties | — | yes | medium |
| 4 | Views that query through reducers, with pagination | 3 | yes | medium |
| 5 | Change notice per collection | 4 | yes | medium |
| 6 | Per-block permissions and sharing in the interface | — | no | medium |
| 7 | Missing or incomplete views | 4 | no | medium |
| 8 | Filters with relative dates and "me" | 4 | no | low |
| 9 | Database templates | 3 | no | medium |
| 10 | Rollups and formulas | 3, 4 | yes | high |
| 11 | Local cache and client mode | 4, 5 | yes | high |

Stages 1, 2, 3 and 6 do not depend on each other and can run in parallel.

## Stage 1 · Version history

The backend already stores a version per editing streak and knows how to restore it with per-block permissions (`findVersion`, `restoreVersion`), but no route or screen exposes them.

- Routes: list a page's versions with author and date, read a version and restore it.
- History panel in the portal: the list, the read-only preview of the chosen version and the restore button, with confirmation.
- Restoring is one more transaction: it reaches live whoever has the page open and cuts a new version.
- Tests: a reader without access to a block does not see it in any version; restoring does not touch hidden blocks; a locked page is not restored.

## Stage 2 · Threaded comments

Today a comment is a flat list stored in the block's format, plus a mark in the text. The goal is to store discussions and comments as records of their own.

- ADR: comments move to tables of their own.
  - `Discussion` hangs from a block and can quote a span of text.
  - `Comment` is each message in a thread, with rich text.
  - A discussion is marked as resolved and can be reopened.
  - Permissions are the block's.
- Mentions of people in comments and in page text, which generate a notification.
- Notification inbox: mentions, replies in threads where one participates and changes in pages one follows, with read and unread. It arrives through the live channel.
- Migration of current comments to single-message threads, without losing any.
- MCP: read and reply to threads.

## Stage 3 · Missing properties

Today there are 8 types: title, text, select, multiple select, person, date, checkbox and number.

- ADR: how each new type is stored in `properties.values` and who computes it.
- **Status.** Options split into three fixed groups: to do, in progress and done.
- **Relation.** Ids of pages from another collection.
  - It can be one-way or two-way. The two-way one keeps the mirror property in the same transaction.
  - It reads respecting permissions: a row the reader cannot see neither appears nor counts.
- **URL, email and phone**, with validation.
- **Files**, on top of the existing attachments.
- **Creation and edit date and author.** Read from the block's columns, without copying them.
- **Unique id with a prefix.** Assigned by the server with a per-collection counter inside the transaction, never by the client.
- **Person with several values** and **date with a range**.
- **Number formats:** currency, percentage and decimals.
- **Options identified by id.** Today groups are identified by the option's name, and renaming must not break them.
- **Required** visible in the interface.
- Tests per type: validation, filter, sort, grouping and export.

## Stage 4 · Views that query through reducers

Today each view brings up to 500 rows and does not paginate.

- ADR: the view becomes the query. The client sends the view id and the reducers it needs, and the server builds filter, order and groups from the saved view.
- Reducers:
  - `results` for table, list and gallery, with limit and cursor;
  - `groups` for the board, with each group's count and the first cards of each;
  - one `results` per column, with its own "load more";
  - aggregates apart: sum, average, minimum and maximum.
- Two-phase loading: first the rows, then the counts and aggregates, with a "calculating" state.
- Manual order is a list of ids in the view, with operations relative to an id, just like a block's children.
  - Moving a card between groups is a single transaction that changes the row and the view.
  - The list is written by operations, not by replacing the whole configuration: saving the complete format at once makes the last writer overwrite the other.
- Postgres indexes for the most common filters and orders over `properties.values`, measured with `EXPLAIN` on a collection of 10,000 rows.
- Virtualization of table, list and board: only the visible rows plus a margin are drawn.

## Stage 5 · Change notice per collection

Today the live channel notifies per page. An open view does not find out that a row changed, unless the row is the open page.

- ADR: subscription per collection on the live channel.
  - On committing a transaction that touches rows of a collection, `{row: version}` is announced to whoever has a view of that collection open, only with the rows each one can read.
- The client requests only the rows that changed and repositions them locally. It repeats the query only if the change affects a filter or an order it cannot evaluate.
- Before querying a view, the client waits for its pending writes in that collection to be sent.

## Stage 6 · Per-block permissions and sharing

Per-block permissions work in the backend and cannot be configured from the portal.

- "Share" dialog on each page: who has access, with what role, and whether it inherits from the parent or declares its own.
- Add and remove people, and change the role: reader, editor or full access.
- Restrict a section within a page: declare permissions on a block that is not a page.
- Indicator on the page and in the sidebar tree when something has permissions of its own.
- Browser tests with three users: the one who shares, the one who receives and the one without access.

## Stage 7 · Missing or incomplete views

- **Timeline:** start and end date, day, week and month scale, drag to move and stretch.
- **Calendar:** week view and dates with a range.
- **Gallery:** cover from a files property or from the content, and card size.
- **Board:** subgroups, cover on the card, hide groups and the "no value" group.
- **Table:** reorder rows by hand and pinned columns.

## Stage 8 · Filters with relative dates and "me"

- Relative dates: today, this week, the next N days, overdue.
- "Me" in person and author filters: resolved with whoever is looking, not whoever saved the view.
- Quick filters on the view, in addition to the saved ones.

## Stage 9 · Database templates

- Templates per collection: initial content and properties, copied with new ids, just like when duplicating.
- Default template when creating a row from any view.
- Button that creates a row from a template. The button block already exists.

## Stage 10 · Rollups and formulas

- ADR: a single formula engine in `packages/shared`, used by the server and the portal. It runs with time and work limits.
- Result cached per row and property, invalidated by the schema version and by the rows it depends on.
- **Rollup:** summarizes a property of the related rows with count, sum, average, minimum, maximum or percentage. It is computed for the whole view in a batch, not row by row.
- Formulas and rollups can be filtered and sorted. If it cannot be done in SQL, the server computes them in a batch.

## Stage 11 · Local cache and client mode

- ADR: record cache in the browser by version, in SQLite over WASM or in IndexedDB, depending on what is measured.
- **Paint from cache and then revalidate.** When opening a page or view, what is in the cache is painted and revalidated with the server. The cache is discarded if the query changed.
- **Client mode.** In small collections, the server sends all the ids and the browser filters, sorts and groups with the same engine as stage 4. The threshold is measured and not set by eye.
- **Persistent transaction queue,** so that what was written offline is not lost when closing the tab.
- **Failures.** On a failure, the touched records are requested again instead of undoing with inverse operations.

## Risks watched at every stage

- **Leaks:** no count, aggregate, relation, rollup or notification reveals a row the reader cannot see.
- **Performance:** each stage with views measures a collection of 10,000 rows and a board of 2,000 cards.
- **Concurrent writes:** a view's configuration is never overwritten between two people editing it at the same time.
