# 025: Views are reducer queries

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`
**Precedes:** stages 5 (change notices per collection), 7 (missing views) and 8 (relative dates and "me") of the plan `2026-10-20-daily-work.md`, which build on the contract this ADR fixes.

## Context

Today a view is a `PageSchemaView` row with its configuration in JSON. To display it, the server reads all the rows of the collection with `readPagesUnder`, checks each one's access in memory, cuts them off at 500 (`COLLECTION_ROW_LIMIT`) and filters, sorts and groups in TypeScript. An agent query walks up to 5,000 before filtering. This has five limits the product no longer accepts:

- a collection of 10,000 rows is seen cut off at 500, and the cut cannot be continued. There is no cursor or "load more";
- each read costs in proportion to the whole collection, even if the screen shows twenty rows;
- counts and sums come from the loaded rows, so with the cut they are wrong;
- the manual order of the cards is the `children` order of the collection. All views and the side tree share it, and moving a card between columns is two separate writes (the value and the order);
- a view's configuration is saved in full. BR-22dc232 patches this by reading and merging before writing, but two people editing the same view at once can still step on each other between the read and the write.

The following stages add views, relative filters and live notices. Each one needs a query that the server knows how to paginate, count and resolve for whoever is looking. The proposed shape: the query is the view id plus named reducers, the manual order is a flat list of ids with relative operations, and view writes are fine-grained. What is avoided: saving the entire format at once and grouping by option name.

Prior measurement, done for this ADR on a disposable Postgres 18.4 database with 65,000 blocks (one collection of 10,000 rows, eleven of 5,000, 1% of the rows with their own permissions) and a warm cache:

| Query on the 10,000-row collection | Indexes | Time |
|---|---|---|
| First page by `createdAt, id`, 50 rows | `parentId` | 2.6 ms |
| Same | `(parentId, createdAt, id)` partial | 0.05 ms |
| Filter by status and priority, sort by number, 50 rows | `parentId` | 2.3 ms |
| Count per group (`GROUP BY` of status) | `parentId` | 2.5 ms |
| Sum, average, minimum and maximum of a number | `parentId` | 5.5 ms |
| "Contains" on a list (person), 50 rows | `parentId` | 2.3 ms |
| Next page with cursor by number and `id` | `parentId` | 4.3 ms |
| One board column in manual order (join with the order list) | `parentId` | 15 ms |
| The same column with `array_position` per row | `parentId` | 391 ms |
| Rows of the collection with their own permissions | `parentId` | 0.6 ms |
| With 100,000 rows: filter and sort / count per group | `parentId` | 25 ms / 28 ms |

A GIN index on `(parentId, properties->'values')` only changed the plan of highly selective queries (6 ms with 100,000 rows), and did not change the counts. The figures are from a development machine and are repeated in the implementation's performance tests.

## Alternatives Considered

### Who builds the query

- **Raise the cap and keep grouping in memory.**
  - PRO: zero contract change.
  - CON: the cost keeps growing with the collection, the cut still cannot be continued and counts are still wrong past the cap.
- **The client sends the full filter, sort and groups.**
  - PRO: it works for ephemeral views without saving anything.
  - CON: two sources of truth for the configuration, and the server has to validate and authorize every filter that arrives. An agent would have to re-read the view to know which query the person is running.
- **The client sends the view id and named reducers; the server compiles from the saved view (chosen).**
  - PRO: a single source of truth, a small contract, and what is temporary (quick filter, search, header sort) travels separately.
  - CON: a query without a view (the agent's) needs its own temporary fields.

### Pagination

- **Raise the reducer limit on every "load more".**
  - PRO: the server keeps no state.
  - CON: each page re-reads everything before it. After ten pages, fifty-five have been read.
- **Offset.**
  - PRO: trivial.
  - CON: it skips or repeats rows if someone edits between pages, and the cost grows with the offset.
- **Key cursor (chosen).**
  - PRO: constant cost per page, and someone else's edit does not repeat or skip rows sorted by a stable key.
  - CON: the cursor carries the sort values of the last row, and the compiler must generate the comparison with empty values and mixed directions.

### Permissions in counts and aggregates

- **Filter the rows in TypeScript after the query (as today).**
  - PRO: reuses `keepAccessible`.
  - CON: counts and pages stop matching what is seen. A page of 50 can arrive with 38.
- **Compute each row's access in SQL with a recursive ancestor query.**
  - PRO: exact with no intermediate state.
  - CON: each row pays an ancestor walk, and the logic of `describePageAccess` would be duplicated in SQL.
- **First resolve the set of rows the reader cannot read and push it into the query (chosen).**
  - PRO: a row that is a child of the collection inherits the collection's access unless it declares its own permissions. Those rows are few (0.6 ms to find them among 10,000), they are evaluated with the existing code and every count, page and aggregate excludes them.
  - CON: the set travels as a parameter and has a cap. A collection with thousands of restricted rows needs another strategy.

### Indexes on `properties.values`

- **An expression index per property (DDL from the application).**
  - PRO: sort and filter by that property without sorting in memory.
  - CON: property keys belong to each collection, so indexes would have to be created and dropped when editing the schema. Rows are updated without HOT on every edit.
- **GIN on `(parentId, values)` with `btree_gin`.**
  - PRO: speeds up selective "contains".
  - CON: it does not improve counts or sorts, and costs a write on every row edit. Blocks already carry two text GINs.
- **A table of typed values (one row per cell).**
  - PRO: normal indexes per type, scales to millions.
  - CON: it duplicates `properties.values` and forces maintaining both copies. It is another rewrite of the ADR 021 model.
- **The existing `parentId` index, plus a partial one for the default order (chosen).**
  - PRO: what was measured fits in 30 ms up to 100,000 rows, the partial index does not prevent HOT updates, and there is no structure to maintain.
  - CON: each sort by property sorts the already filtered rows in memory. The threshold to reopen this decision is a collection over 100,000 rows or a p95 over 50 ms.

### Manual order

- **Keep using the collection's `children`.**
  - PRO: it already exists, is complete and is safe under concurrency.
  - CON: all views and the side tree share it. Reordering a board card moves the row in another team's table.
- **Fractional index on each row.**
  - PRO: moving is writing one row.
  - CON: two people dropping into the same gap generate the same key, and the list needs rebalancing.
- **A list of ids per group.**
  - PRO: a column's order is direct.
  - CON: moving between columns changes two lists, and if the row's value changes by another path, the row ends up in the wrong list.
- **A flat list of ids per view, with operations relative to an id (chosen).**
  - PRO: a column's order is the subsequence of the list, moving is one operation and two moves with different anchors do not cancel each other.
  - CON: a view's list has a cap, and new rows have to be added to the lists that exist.

### Writes of a view's configuration

- **Keep saving the full configuration with a prior read and merge.**
  - PRO: it already works.
  - CON: a window remains between reading and writing, and each configuration screen has its own merge logic.
- **Generic JSON patches.**
  - PRO: a single mechanism.
  - CON: they address lists by position, which is exactly what does not withstand two writers.
- **A closed vocabulary of operations, each on a key or an element with an id (chosen).**
  - PRO: two people touching different keys do not step on each other, and each operation validates itself.
  - CON: each operation has to be defined and tested, and the filter nodes need ids.

## Decision

### The query contract

`POST /api/v1/collections/:collectionId/query`, with this body:

| Field | What it is |
|---|---|
| `viewId` | The saved view. Optional. Without a view there is no filter, sort or groups of its own. |
| `quickFilter` | A filter that is added with AND to the view's. It is not saved. |
| `search` | Text that searches the row's title (`Block.text`) and its text answers (rich text, link, email and phone), case- and accent-insensitive. It does not search numbers, dates or option names. It is not saved. |
| `sorts` | Replaces the view's only for this query (header sort, agent query). |
| `timeZone` | The viewer's zone. It is accepted and reserved for stage 8 ("today", "me"). Today dates without time are compared as UTC, like the `packages/shared` oracle, so that SQL and the shared engine do not disagree. |
| `reducers` | List of `{ id, kind, ... }`. The client chooses the `id` and the response returns it. |

The server compiles filter, sort and groups from the saved view. The client never sends those of the view. The zone, the reader and the time enter the compiler as context, so that stage 8 resolves "me" and "today" there without changing the contract.

Four reducers:

| `kind` | Input | Output |
|---|---|---|
| `results` | `limit` (default 50, cap 100), `cursor`, `properties` (values that are returned) | `{ ids, nextCursor }` |
| `groups` | `groupBy` (default the view's), `subGroupBy`, `rowsPerGroup` (default 25, cap 50), `groupLimit` (default 100), `includeHidden` | `{ groups: [{ key, hidden, ids, nextCursor }], hasMoreGroups }` |
| `groupResults` | `group: { key, subKey? }`, `limit`, `cursor` | `{ ids, nextCursor }`. It is the "load more" of a column. |
| `aggregations` | `by` (`NONE` or `GROUP`), `items: [{ id, propertyKey, calculation }]` | one value per item, and per group if `by` is `GROUP` |

- `groupBy` and `subGroupBy` inside `groups` let the agent group without touching the view.
- A response cannot carry more than 1,000 ids across all reducers. Asking for more is rejected with `VIEW_QUERY_INVALID`.
- The aggregations are the ones that already exist: count all, empty and filled, sum, average, minimum, maximum, median and percent checked. Each property admits those its type allows in the ADR 024 table. Counting is an aggregation without a property, and the count of each board column is a `COUNT_ALL` aggregation with `by: GROUP`. Sums are done in `numeric`.
- The response carries `view` (id, version and compiled configuration), `rows` (one record per row, once even if it is in several groups, with the values of the requested or visible properties), `lookups` (titles of related rows and file names, as today) and `reducers` (one result per `id`).
- The reader of a row without permission receives neither its id nor its record. The same goes for the relation ids in each cell.
- All the reducers of a request run in a read-only transaction with a single snapshot and a `statement_timeout` of 5 s. Two different requests may see different states.

**Two-phase loading.** The client first requests `results` or `groups` and renders. Then, in a second independent request, it requests `aggregations` and shows "calculating" until it arrives. The server keeps no state between the two. Column counts and table footers always come from the second phase.

**Charts and calendar.** The chart uses only `aggregations` with `by: GROUP`, without rows. The calendar requests `results` with a `quickFilter` on the visible range, with limit 100 and a notice if there are more.

### Cursors and pagination

The cursor is opaque (JSON in base64url) and carries the view version, a summary of the effective order and the value of each sort key of the last row, plus its position and its `id`. The order always ends in `(position, id)`, so it is total and stable. Empty values go last in both directions.

- The compiler expands the comparison as a chain of `OR` and `AND`, which covers mixed directions and empty values. Postgres tuple comparison does not cover them.
- If the effective order changed since the cursor was issued, the response is `VIEW_QUERY_CURSOR_STALE` and the client restarts from the first page.
- If a row changes value between pages, it may appear twice or not appear in that load. The client deduplicates by id and repeats the query when notified (stage 5).

### SQL over `Block.properties.values`

- Queries always fix `parentId = collection`, `type = 'page'` and `lifecycle = 'ACTIVE'`, and compare on typed expressions of `properties->'values'->key`. Each extraction carries a type guard (`jsonb_typeof`) so that a corrupt cell does not take the query down.
- Options and status compare the id. Multi-select and person use containment (`@>`). Relation uses containment of one id. Date compares `start` and `end` as instants. Creation and edit read the block's columns, as ADR 024 fixes.
- Grouping by a multi-value property expands the cell with `jsonb_array_elements_text` and repeats the row in each group. The `aggregations` reducer reports `distinctRowCount` separately, so that a total does not get inflated.
- **Indexes.** The migration adds only one: `Block_rows_order_idx` on `(parentId, createdAt, id)` with `WHERE type = 'page' AND lifecycle = 'ACTIVE'`. No GIN or per-property indexes are added. The performance tests (`page-query.performance.integration.spec.ts`) measure with `EXPLAIN` a collection of 10,000 rows, surrounded by 40,000 rows of other collections, and a board of 2,000 cards. They fail if the plan reads the whole of `Block` instead of using `Block_parentId_idx` or `Block_rows_order_idx`, if the database p95 exceeds 50 ms or if the API p95 exceeds 150 ms (on their own, the queries respond in 45 to 65 ms).
- **The default order does not use the partial index.** A view without its own order follows the order of `children`, which is read as a list of positions (`unnest ... WITH ORDINALITY`) joined to the rows: 6 ms with 2,000 rows and about 15 ms with 10,000. The partial index serves the order by creation date. So that the planner joins the positions with a hash and not with a nested loop (which walks them once per row: 223 ms with 2,000 rows, 2.8 s with 10,000), the read transaction sets `enable_nestloop = off`. The performance test discovered it and watches it.
- **A single semantics.** The `packages/shared` engine (`matchesPageFilter`, `comparePageRowsBySorts`) remains the oracle of what each operator means. The SQL compiler is tested against it with generated collections, for each type and operator of the ADR 024 table. The portal keeps using it to decide where a card that has just been moved lands locally.

### Permissions

Before compiling, the server computes the collection's **denied set**:

1. it looks for the rows with `permissions IS NOT NULL`, which are the only ones that can differ from the collection (the reader has already passed the collection's access control);
2. it evaluates those rows with `keepAccessible`, the same code today's reads use;
3. it passes the ids the reader cannot read as `id <> ALL($ids)` to each reducer.

That way counts, pages, aggregates and groups exclude those rows, and a count never reveals that they exist. The cap is 5,000 denied ids. Past the cap, the query fails with `VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS` and an `ERROR` log with the collection id, and does not degrade silently.

**Relation values.** For each relation property that the query touches (as a filter, sort or aggregate), the server computes the set of rows of the target collection that the reader cannot read or that are in the trash, with the same cap. The query subtracts that set from the cell before comparing or counting (`values->key - $ids::text[]`). A filter whose value is an id the reader cannot read matches nothing. Purging a row removes its id from the relation cells of the other rows in the same purge transaction, so there are no dangling ids and the counts are exact. Relation admits as aggregations counting filled and empty, not sums or medians, because its values are not numbers.

### Manual order

`PageSchemaView` gains `manualOrder`, a list of row ids that can be null.

- **Null** means the view follows the collection's `children` order, which is today's behavior. No existing view changes appearance.
- **With a list**, the order of a view without `sorts` is that list. A view with `sorts` sorts by them and uses the list only as a tiebreaker. A row that is not in the list goes after those that are, by `createdAt` and `id`.
- **It is materialized on the first order operation.** The server copies the live rows into the list in `children` order, inside the same transaction that applies the operation. The cap is 20,000 ids. Beyond that, manual reordering is rejected with a clear message.
- **The operations** are `listAfter`, `listBefore` and `listRemove` on the view pointer, with the same semantics as on `children`: moving removes the id if it was there and inserts it after the anchor, or at the end if the anchor is gone. They are idempotent and relative to an id.
- **New rows.** The transaction that creates a row adds it to the end of the non-null lists of its collection's views. A row sent to the trash keeps its place and returns to it when restored. Purging it removes it from the lists.
- **Position in SQL.** The query joins the rows with `unnest(manualOrder) WITH ORDINALITY`. That join costs 15 ms with 10,000 rows, against 391 ms for `array_position` per row.
- **It is a single list for the whole view**, not one per group. A column's order is the subsequence of the cards that fall in it.

**Moving a card between columns is a single transaction** of the block channel, with two operations: the one that changes the row's value and a `listAfter` (or `listBefore`) on the view, anchored to the neighboring card of the destination column. If the destination column is empty, there is no order operation. With a subgroup board, the diagonal move changes both values in that same transaction. If any operation fails, nothing is left half done. The card moves on screen before the response, and if the transaction fails the client requests the column again.

Multi-value properties (multi-select, person) move with a new block command, `changeValueList` with `{ property, add, remove }`, instead of the two foreseen (`addValue` and `removeValue`): a card that changes column removes one entry and adds another, and a single command does it in one step. It is idempotent and relative to what the cell stores at write time, like `addRelation`: first it removes, then it adds after the entries that stay and without repeating. Dragging a card from column A to B removes A and adds B without touching the other values of the cell, even if someone else changed them in the meantime. `move-row` receives it as `listChanges` and validates it with the property's rules before writing. The command is only sent by the backend (it is a page one); a client changes a cell with `set`.

Changing a view's order requires being able to edit the collection, like changing its configuration. An editor of the row without permission on the collection can change the card's value, but not move it from its place, and the joint transaction is rejected entirely.

### A view's configuration is written by operations

`PageSchemaView` gains `version` (integer, bumped with each operation) and the block channel accepts a new table, `view`, with these commands. Each touches one key or one element, never the entire configuration:

| Command | On | Effect |
|---|---|---|
| `set` | a scalar key (`groupBy`, `rowHeight`, `frozenColumns`, `icon`, `visibleProperties` and the other configuration keys) | replaces that value. `name` and `isDefault` are not operations: they keep changing with the collection's shape. |
| `setEntry`, `removeEntry` | a per-key map (`calculations`, `columnWidths`, `columnAlignments`, `columnLimits`) | changes or removes the entry of a key |
| `listAfter`, `listBefore`, `listRemove` | a list of keys (`visibleProperties`, `collapsedGroups`, `hiddenGroups`, `manualOrder`) | inserts relative to an id |
| `sortSet`, `sortRemove` | `sorts`, which is identified by `propertyKey` | changes the direction or removes a sort |
| `filterInsert`, `filterUpdate`, `filterRemove` | a filter node, by its `id` | adds, changes or removes a node without touching the others |

- Each filter node (condition or group) carries an `id`. The server assigns it if missing.
- A null `visibleProperties` means "all". The first operation on the list materializes it with the current properties.
- After applying the operations, the server validates the resulting view with `validateSchemaView`, as today, and rejects the whole transaction if it is not valid.
- Two people who change different keys do not step on each other. Two who change the same scalar key keep the last one, as in the rest of the block's fields.
- Writing the full configuration remains only for creating a view. The MCP's `update_view` and the portal screens move to operations.

### Grouping

- Views quote options by id (ADR 024). A board column is an option, and the "no value" group is the key `UNASSIGNED_GROUP_KEY`.
- Status groups by option or by group with a new key, `groupByMode` (`OPTION` or `GROUP`), which only applies to status. Dropping a card into a status group gives it the first option of that group, the same rule ADR 024 uses when removing an option. Status has no "no value" group.
- Person and multi-select group by each value, with repeated rows. The board stops excluding them, which changes the ADR 024 note.
- Properties without declared options (date, number, checkbox, creation and edit) take their groups from the values the rows have, sorted, up to `groupLimit`. If there are more, `hasMoreGroups` is true and the interface says so.
- **Hidden groups.** `hiddenGroups` is a list of view keys. Their rows do not come out of `groups` unless `includeHidden` is requested, and the interface offers them in a list with their count. `hidesEmptyGroups` and `hidesUnassignedColumn` remain as they are.
- **Group order.** It still lives in the property (the order of its options), as today, and not in the view. It does not change.
- **Subgroups.** A board cell with subgroups is `{ key, subKey }`. The `groups`, `groupResults` and `aggregations` reducers accept it, and stage 7 does not change the contract.

### Portal

- Views are requested by **id**, not by name. The name remains unique per collection.
- The first load is done by the Next server with phase one. Phase two and "load more" go through client actions. Each board column, each table group and a gallery's list paginates on its own.
- **Virtualization** of table, list and board with a window of our own (`usePagesWindowVirtualizer`): it follows the scrolling of the portal's main area, draws the visible rows plus a margin of ten, measures each row after drawing it and always keeps the card being dragged mounted. A list of up to sixty elements is drawn in full. On the board, the cards of each column are virtualized. Dragging is resolved against the data order and not against the DOM. `@tanstack/react-virtual` was tried and withdrawn: its functions are not compatible with this repository's React rules (`react-hooks/incompatible-library`, `react-hooks/refs`), and the only way out was a directive that silences them, which `AGENTS.md` does not allow. The own window is about eighty pure lines with tests, and adds no dependency.
- "Select all" selects the loaded rows. It offers "select the N that match", which fetches only ids with a cap of 1,000.
- Before requesting a query, the client waits for its pending writes on that collection to be sent, so that the result already contains them.

### MCP tools

`query_collection` keeps its name and changes shape so that an agent asks for exactly what it needs, with column and option names instead of ids:

| Field | What it does |
|---|---|
| `collection`, `view?` | The collection and, if given, the view whose filter and sort apply. |
| `where?`, `sort?` | Filter (added to the view's) and sort (replaces the view's). This is what already exists today. |
| `search?` | Searches the title and the text answers of the rows. |
| `columns?` | Which columns to return. By default, those visible in the view, with a cap. |
| `limit?`, `cursor?` | One page of rows. `limit: 0` returns no rows. |
| `group?` | The name of a group, to read only its rows with its own cursor. |
| `groupBy?` | Returns the groups with their count and their first rows. |
| `aggregate?` | A list of `{ column, calculation }`, with an optional `by: group`. |

- What was implemented: `groupBy` groups and brings each group's count; `group` reads the rows of a single group with its cursor; `aggregate` is a list of `{ calculation, column? }` over all the rows that pass the filter (with `groupBy`, also per group); `columns` trims the columns of each row (the title always goes); `limit: 0` returns only counts. Without `groupBy` the response is not grouped even if the view groups, and with `view` and without `where` or `sort` it is read in that view's manual order. The tool's description explains how to ask for only counts, one group, or a page with the needed columns.
- The MCP cursor is the server's. `truncated` disappears, and `total` comes from an exact aggregation: all the rows the token can read that pass the filter. Rows that a token rule closes are excluded from the query, not discarded afterwards.
- One new write, `move_row`, receives `{ collection, view, row, properties?, before?, after? }` and runs it as the single transaction above. `update_view` keeps its high-level fields (where it filters, how it sorts, what it groups by) but no longer sends the full configuration: it computes the difference with the view and sends it as operations. The titles of the rows that a relation links are looked up by id or by exact title on the server, not by listing the collection.
- Output: a compact form of value list was not made; each row brings its properties by name, and `columns` is the way to shorten it.

### Migration

A single migration (`packages/db`, per its `AGENTS.md`), in one transaction:
1. adds `PageSchemaView.manualOrder` (nullable text list) and `PageSchemaView.version` (integer, 0 by default);
2. creates `Block_rows_order_idx`;
3. assigns `id` to each filter node of each configuration and adds `hiddenGroups: []` and `groupByMode: 'OPTION'`;
4. counts views and filter nodes before and after, and fails if they do not match.

It is tested first on a disposable database and then applied to `company-brain`. The `children` order is not touched.

## Consequences

- Positive:
  - a collection of 10,000 rows is walked in pages of constant cost, and 100,000 rows remain at about 30 ms as measured;
  - counts and aggregates are exact and exclude what the reader cannot read;
  - the board stops being a special case: each column is a `results` with its cursor;
  - moving a card changes value and order in one transaction, and two people who reorder or who change different settings of the same view do not step on each other;
  - views stop sharing the order of the rows;
  - an agent asks for a page, a column or only the counts, with a short output;
  - stages 5, 7 and 8 receive the entry point: view version, `{ key, subKey }` cells and a compiler with reader, zone and time context.
- Negative:
  - there are two implementations of the filter semantics, the TypeScript one and the SQL one, and only the parity test keeps them from drifting apart;
  - the denied set has a cap, and a collection with more than 5,000 restricted rows fails instead of degrading;
  - purging a row walks the relation cells that cite it, and that adds work to the purge transaction;
  - each sort by property sorts the filtered rows in memory, with a known threshold to reopen the decision;
  - a view's manual order list has a cap of 20,000 ids and each new row is added to it;
  - a row that changes value between two pages can repeat or be missing until the next query;
  - phase two forces a second request per view;
  - the filter changes shape (ids in the nodes), and all code that builds or reads it is updated.
- Changes to existing behavior:
  - dragging a card no longer reorders the row in the other views or in the side tree;
  - the 500-row cap and the 5,000 query cap disappear, along with `hasMore` and `truncated`;
  - the board groups by person and multi-select, which ADR 024 had left out, and by status group;
  - views are addressed by id and not by name in the contract;
  - the full configuration is no longer written from the screens and the MCP;
  - `query_collection` changes shape and `move_row` is added as a write tool.
- Accepted as a cost: a client mode (the server returns all the ids and the client filters locally) stays out. It is evaluated with stage 5, when there is a change channel per collection.

## Governance

- The parity test between the SQL compiler and the `packages/shared` engine covers each operator of each type in the ADR 024 table. A new operator does not enter without that case.
- The performance tests (10,000-row collection and 2,000-card board) check with `EXPLAIN` that the plan uses `Block_rows_order_idx` and `Block_parentId_idx`, and measure the time. A plan with a `Seq Scan` on `Block` breaks the test.
- The permissions tests check that a reader with a hidden row sees the same count in `groups`, `aggregations` and `results`, and that a relation cell does not count unreadable ids.
- `FEA-CLC` business rules that this ADR changes, to be replaced with `rules:add` and `supersedes` on implementation:
  - BR-3c85c11 (the row cap and its notice);
  - BR-22dc232 (saving the configuration by merging what is there);
  - BR-5a97271 (a dropped card writes only the value: now also the place);
  - BR-f707396 (a change of columns does not overwrite another's), if its scope covers the views.
  Rules are added for the per-view manual order, the denied set in counts and aggregates, and the configuration operations.
- Every compiler error is a `Result` with a code (`VIEW_NOT_FOUND`, `VIEW_QUERY_INVALID`, `VIEW_QUERY_CURSOR_STALE`, `VIEW_QUERY_TIMEOUT`, `VIEW_QUERY_TOO_MANY_RESTRICTED_ROWS`). An unexpected failure leaves an `ERROR` with a trace and never an empty list.
- A decision to raise the 100,000-rows-per-collection cap or to add per-property indexes is made in a new ADR.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21. Approved with four clarifications. Manual order is per view and a null list follows the `children` order. Exceeding the cap of 5,000 denied ids fails with a typed error and leaves an `ERROR` log with the collection id. `@tanstack/react-virtual` was approved for `apps/portal` with a pinned version (it was later not used, see Portal) and `addValue`/`removeValue` remain approved (they were implemented as a single command, `changeValueList`). Purging a row removes its id from the relation cells in the same transaction, so there are no dangling ids.
- Modified: 2026-10-21 (closing of limitations). The portal's search no longer filters what is loaded on the screen: the words travel in the address (`q`) and are sent as `search`, which looks at the row's title and its text answers (the same thing the screen search looked at), over the rows, the counts and the following pages of the table, list, gallery and board. The calendar reads with `quickFilter` the rows that start on the days of the month grid (`month` in the address; up to a thousand, and the screen warns if there are more), and counts separately the rows without a date. What a column or a table loaded with "load more" is kept when the server draws it again: the window is read again from the new end (`refreshPageRowsAction`) and replaces the previous one. "Select the N that match" asks the server for the ids, up to a thousand, and warns if there are more.
- Modified: 2026-10-21 (stage 8, relative dates and "me"). `timeZone` is no longer reserved. The server resolves the filter for whoever queries before compiling it: `@me` becomes the reader's id (the token owner in the MCP) in person, created by and edited by properties, and the relative dates (`@today`, `@yesterday`, `@tomorrow`, `@this_week`, `@last_week`, `@next_week`, `@this_month`, `@last_month`, `@next_month`, `@past_days:N`, `@next_days:N`, with N from 1 to 365) become a range of days in the given zone, over date, creation date and edit date. They are stored as text in the filter node, and a marker that does not exist is rejected when saving the view and when querying. Weeks run from Monday to Sunday and the past and next N days include today. A date without time is compared by days and one with time by instants of the zone (the shared engine and SQL compute the limits with the same values, and the parity test runs in four zones). The operators `IS_ON_OR_BEFORE` and `IS_ON_OR_AFTER` are added for dates. Change in behavior: a row without a value in the property no longer passes any condition on it; it only meets those that ask for absence (`IS_NOT`, `NOT_CONTAINS`, `IS_NOT_IN_GROUP`), and an untouched checkbox counts as "unchecked", because otherwise "assignee contains me" showed the rows without an assignee. The portal's quick filter uses the contract's `quickFilter` and travels in the address (`filter`); the browser's zone travels in a cookie that the Next server reads and sends as `timeZone`. The server reads the time from an injectable clock (`PAGE_QUERY_CLOCK`) so that tests stay still at an instant.
- Modified: 2026-10-21 (stage 7, missing views). The `TIMELINE` view type is added (one more value in the database enum, with its migration) and these configuration keys, all written by the operations of this decision and never by the entire configuration: `endDateProperty` (the property where each row ends; null reads the end of the `dateProperty` range), `dateScale` (`DAY`, `WEEK` or `MONTH`; the calendar takes the last two), `cardSize` (`SMALL`, `MEDIUM` or `LARGE`), `coverProperty` and the `columnWraps` map (columns that wrap their text). The query contract does not change, with a single extension: the value of a condition on a date can be a range of days `{ start, end }`, and `IS` understands it as "the row's dates overlap with those days", which is the question of a calendar or timeline window (the shared engine already defined it that way and the SQL compiler repeats it). The window travels as `quickFilter`, and `andQuickFilters` no longer nests the person's filter one level deeper when it is an "and" group, because the server accepts three levels. With the end in another property the window is two questions (start before the window ends and end after it starts, and start within the window without an end) and not an "or", which would no longer fit in three levels; the portal joins the answers. A timeline reads up to 2,000 rows of its window (20 pages) and says how many it draws if there are more; rows without a start are requested separately, 100 and the total. **Card cover: it comes from a files property, not from the page content.** Rows already bring that property and its files (with the MIME type) in the same response, whereas the first image in the body would require reading each row's body and force notifying about its changes, which ADR 026 leaves out of the notice on purpose; a cover from the content is pending that notice. Hiding a group was already on the server (`hiddenGroups`, `includeHidden`) and the board now offers it: the column menu hides it, and a separate list, with the count that comes from the per-group aggregations, shows them again. View validation requires `dateProperty` and `endDateProperty` to point to a date property and `coverProperty` to a files one, and lets through a key of a property that no longer exists, so that the view can still be changed. Manual-order reads and writes of the table use `move-row` with only the neighbor, without values.
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 4)
- The measurement was done on a disposable database (`adr025_scratch`, already dropped) with the session's scripts, and is repeated in the implementation's tests.
