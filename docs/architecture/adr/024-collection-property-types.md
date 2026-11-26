# 024: New collection property types and options identified by id

**Status:** Accepted
**Date:** 2026-10-20
**Depends on:** `021-everything-is-a-block.md`, `023-comments-as-discussions.md`
**Precedes:** stage 4 of the plan `2026-10-20-daily-work.md` (views by reducers), which filters, sorts and groups on top of what this ADR fixes.

## Context

A collection is a `page` block with a schema (`PageSchemaProperty`, one row per property with `key`, `label`, `type`, `required`, `options`) and views (`PageSchemaView`). The values of each row live in the `properties.values` of its block, indexed by `key`. Today there are eight types: title, text, select, multi-select, person, date, checkbox and number. The plan asks for eleven more (stage 3), and stage 4 will build the server query on top of them.

Four things in the current model do not hold up with the new types:

- **Options are identified by their name.** A select stores `"En curso"` in each row. Renaming an option rewrites all the rows, and two people who rename and edit at the same time step on each other (BR-699e037 exists to patch that). Saved filters, collapsed columns and the views' column limits also quote names. Grouping by name is exactly what has to be avoided.
- **Person stores a single id** and **date stores a single instant**, with no range or multiple values.
- **A number is just a number**, with no currency, percentage or decimals.
- **`required` exists on the server** (a row without that value is rejected) but no screen offers it, and the current rule rejects editing any other property of an old row that lacks the value.

The server already validates each transaction against the type's schema (ADR 021, step 3) and row reads already strip what the reader cannot see. The new types have to uphold both guarantees.

## Alternatives Considered

### Option identity

- **Keep going by name.**
  - PRO: zero migration.
  - CON: renaming is a massive, concurrent rewrite. Each new type with options (status) would inherit the problem, and board grouping would stay tied to the visible text.
- **Stable id per option, assigned by the server (chosen).**
  - PRO: renaming touches only the schema. Rows, filters and views do not change. The order of options can change without affecting anyone.
  - CON: a migration that rewrites rows and views, and every edge (MCP, export) must translate id to name.
- **Positional index.**
  - PRO: short values.
  - CON: reordering or deleting an option shifts the indexes of all rows.

### Where computed values live (creation, edit, unique id)

- **Copy them to `properties.values` on every transaction.**
  - PRO: the filter engine reads everything from a single place.
  - CON: each edit writes one more key, the copy can diverge from the columns, and existing rows need a backfill.
- **Read them from the block's columns (chosen for creation and edit).**
  - PRO: a single source, nothing to synchronize, and stage 4 sorts and filters with an index on `createdAt` and `editedAt`.
  - CON: the shared engine receives a composite value (stored plus derived), not just `values`.
- **Unique id: a Postgres sequence per collection.**
  - PRO: the engine handles it.
  - CON: it forces creating and dropping sequences with DDL from the application, inside the schema transaction.
- **Unique id: a counter on the property row (chosen).**
  - PRO: `UPDATE ... RETURNING` under the row lock, inside the transaction of the row being created. If the transaction fails, the number is not consumed.
  - CON: it serializes row creation in that collection for the duration of the transaction. It is short, and only affects collections that have the property.

### Relations

- **`BlockRelation` edge table.**
  - PRO: referential integrity and an indexed inverse query.
  - CON: one more table, and reading a row needs a join to know what it points to. It duplicates what `properties.values` already does.
- **Ids inside `properties.values`, with the mirror property maintained by the server (chosen).**
  - PRO: consistent with the rest of the values, travels in the same row read, and permissions filter with the same mechanism as `children`.
  - CON: the inverse query of a one-way relation needs a GIN index on the JSON (measured in stage 4), and there is no foreign key preventing a dangling id. Reads discard ids that no longer point to a live row.

### Status

- **A select with an optional `group` field.**
  - PRO: one type fewer.
  - CON: status has its own invariants (it always has a value, three fixed groups, at least one option per group) that a select does not have. It would require branching inside select.
- **A separate `STATUS` type (chosen).**
  - PRO: its rules live in its definition.
  - CON: one more type to teach in every list of types.

## Decision

### Options with id

Each option of `SELECT`, `MULTI_SELECT` and `STATUS` becomes `{ id, value, color }`, plus `group` in status.

- `id` is a random 8-character `[a-z0-9]` string, unique within its property. The server assigns it when saving an option that arrives without an id. The client never proposes one.
- Rows store the **id**. Select stores one id, multi-select a list of ids.
- `value` is the visible name and remains unique within the property.
- Renaming an option changes only `value` in the schema. It does not rewrite rows or views. `rewriteSchemaOption` now operates by id.
- Removing an option still removes its id from the rows in the same operation, with the exception of status (below).
- An id that a row stores and the schema no longer knows is treated as empty when read, never as a value. Nothing reinterprets it by name.
- Views quote ids: filter values of select, status and person, `collapsedGroups` and `columnLimits` when they group by an options property.
- **Migration.** A single data migration (see below) converts the existing names to ids.
- **MCP.** The tools accept option names and translate them to ids at the edge. An unknown name is an error with the list of valid names. Reads return `{ id, name }`. An agent does not need to know the ids.

### Type catalog

The eleven new types add `STATUS`, `RELATION`, `URL`, `EMAIL`, `PHONE`, `FILES`, `CREATED_TIME`, `EDITED_TIME`, `CREATED_BY`, `EDITED_BY` and `UNIQUE_ID`. Three existing types change shape: person, date and number.

| Type | Value stored in `values[key]` | Configuration |
|---|---|---|
| `STATUS` | option id (string), always present | options with `group`: `TO_DO`, `IN_PROGRESS`, `COMPLETE` |
| `RELATION` | list of row ids of the target collection | `targetCollectionId`, `mirrorPropertyKey` (null if one-way) |
| `URL` | string | none |
| `EMAIL` | string | none |
| `PHONE` | string | none |
| `FILES` | list of `FileAsset` ids | none |
| `CREATED_TIME`, `EDITED_TIME` | nothing. Read from `Block.createdAt` and `Block.editedAt` | none |
| `CREATED_BY`, `EDITED_BY` | nothing. Read from `Block.createdById` and `Block.editedById` | none |
| `UNIQUE_ID` | integer assigned by the server | `prefix` (optional) |
| `PERSON` (changes) | list of user ids | `allowsMultiple` (false by default) |
| `DATE` (changes) | `{ start, end? }` | none |
| `NUMBER` (changes) | number | `format` (`NUMBER`, `PERCENT`, `CURRENCY`), `decimals`, `currency` |

The configuration lives in a new column `PageSchemaProperty.config` (JSON, null in types without configuration), validated with a Zod schema per type in `packages/shared`. Options remain in `options`.

### Status

- Three fixed groups. Each group has at least one option. A new property is born with three options, one per group.
- The row always has a value. When creating it, the server writes the first option of the `TO_DO` group. Writing an empty value is rejected. When the property is added to a collection with rows, those rows receive the same value in the same transaction.
- Removing an option moves its rows to the first remaining option of the same group. Removing the last option of a group is rejected.
- The filter admits an option (`IS`, `IS_NOT`) or an entire group with two new operators, `IS_IN_GROUP` and `IS_NOT_IN_GROUP`, whose value is the group name.

### Relation

- **Target.** A collection in the same space that the writer can read. Pointing to the collection itself is allowed (the mirror, if any, is another property).
- **Validation on write.** Each id must be a live row, a child of the target collection and readable by the writer. An unreadable or nonexistent id rejects the transaction with the same message in both cases, so as not to reveal that the row exists. Cap of 100 ids per cell.
- **How it is written.** With two commands of the block pipeline's own, `addRelation` and `removeRelation`, with arguments `{ property, targetId, after? }`. `after` is the id of the relation after which it is inserted (or none for the end). They are relative to an id, like `listAfter`, so they preserve order and two people adding different rows to the same cell do not step on each other. Both are idempotent. `set` of the full list is rejected on a relation property. `listAfter` and `listRemove` are not generalized to `properties.values`.
- **Two-way.** Creating the relation as two-way creates the mirror property in the target in the same schema transaction (it requires being able to write both collections and that the target has room under the property cap). When a command is applied, the same transaction locks the mirror rows (in id order, to avoid crossed locks) and adds or removes the source id in their cell.
- **Mirror-side permission.** Writing the mirror requires being able to **edit** the target row, not just read it. If the writer cannot edit it, the whole operation is rejected with a typed error (`RELATION_MIRROR_FORBIDDEN`) that names that it is the mirror side. A reader does not modify a page they cannot edit. If the mirror cell would go over 100 ids, the whole transaction is rejected.
- **Removing the property.** Deleting one side leaves the other as a one-way relation and keeps its values. If the target collection is sent to the trash or purged, the property shows "collection deleted" and its values are not returned.
- **Reads with permissions.** Every response that includes rows (collection read, MCP, export, and in stage 4 the counts and aggregates) strips from each relation cell the ids the reader cannot read before responding, with a single batch check per page of rows. The cell count and any aggregate are computed after that filter. An unreadable id is never counted.

### URL, email and phone

They are stored as a trimmed string.
- **URL.** Must parse with an `http` or `https` scheme and have a host. Maximum 2048 characters. The portal prepends `https://` when the person types only the host. The server corrects nothing.
- **Email.** One `@`, a domain with a dot, no spaces, maximum 254 characters.
- **Phone.** Digits, spaces and `+ - ( )`, between 6 and 20 digits.

### Files

The cell stores the list of `FileAsset` ids (maximum 10). The file is not duplicated and the name is not stored.
- Each id must be an `ACTIVE` asset of the same workspace uploaded by the writer, or one that is already in that cell.
- When attaching it, if the asset has no `pageId`, the row's is assigned. An asset referenced by a cell counts as in use for orphan cleanup.
- Row reads return, next to the ids, the name, size and type, read from `FileAsset`.

### Creation and edit date and author

They are not stored in `values`. A write to these keys is rejected. The reader composes a derived value from the block's columns (`withDerivedValues`) and hands it to the filter, sort and grouping engine of `packages/shared`. Stage 4 uses the columns directly in SQL. "Edited" reflects any edit of the row, including its body and the mirror writes of a relation.

### Unique id

- The value is the integer. The view shows it as `prefix-N`, or `N` without a prefix. Changing the prefix changes how it is displayed in all rows, without touching data.
- The counter is a new column `PageSchemaProperty.nextValue` (integer, 1 by default, only used in `UNIQUE_ID`). When creating a row in the collection, the transaction runs `UPDATE ... SET nextValue = nextValue + 1 ... RETURNING` on that row, writes the value into the new row and commits everything together. A client write to that key is rejected.
- When the property is added to a collection with rows, the server numbers them by `createdAt` and `id` in the schema transaction.
- Numbers are not reused if a row is deleted. A row that enters the collection through a move receives the next one.

### Person with multiple values

The person cell always stores a list of user ids. `allowsMultiple` set to false limits the list to one element and is what current properties migrate to. Each id must be a member of the directory, as today.

### Date with range

`{ "start": "2026-10-20", "end": "2026-10-25" }`, with `end` absent on a simple date. `start` and `end` use the same precision, `YYYY-MM-DD` or an ISO instant with offset, and `end` is not earlier than `start`. Groupings by day, week and month use `start`.

### Number formats

The stored value is always the plain number.
- `NUMBER`: no unit.
- `CURRENCY`: major units, with `currency` as an ISO 4217 code. The portal formats with `Intl.NumberFormat`.
- `PERCENT`: the fraction is stored (`0.25` is shown as "25 %"), so that sums and averages remain correct arithmetic. The editor converts and rounds when typing.
- `decimals` (0 to 8, or null for free): the server rejects a value with more decimals than configured. The editor rounds before sending. Floating-point error is accepted for large amounts. The stage 4 aggregates sum in Postgres `numeric`.

### `required`

- It is offered in each property's editor, and the column carries an asterisk in the header. It is not offered for title (always required), checkbox, status, or for the computed types (creation, edit, unique id), which always have a value.
- It is enforced when creating a row and when that property is written or emptied. Editing another property of an old row that did not have the value is no longer rejected (a change from today, where the rule blocked any edit). The row shows "missing" on the property.
- Empty means what each type says: blank text, list without elements, absent range.
- The new-row form cannot be confirmed with an empty required property.

### What each type supports

The shared filter, sort and grouping engine is organized by logical type. The logical types `STATUS`, `RELATION` and `FILES` are added. Person becomes `MULTI_TAG`.

| Type | Filter | Sort | Groups | Exported text |
|---|---|---|---|---|
| `TITLE`, `RICH_TEXT`, `URL`, `EMAIL`, `PHONE` | is, is not, contains, does not contain, empty | alphabetical | no | the text |
| `SELECT` | is, is not, empty | by option position | yes, by option | the name |
| `MULTI_SELECT` | contains, does not contain, empty | by the first option, by position | yes, the row appears in each value | comma-separated names |
| `STATUS` | is, is not, in the group, not in the group | by group and then by position | yes, by option or by group | the name |
| `PERSON` | contains, does not contain, empty | by the first name | yes, the row appears under each person | comma-separated names |
| `DATE` | is (the day falls in the range), before (`end` or `start`), after (`start`), empty | by `start` and then `end` | yes, by day, week or month of `start` | `YYYY-MM-DD` or `YYYY-MM-DD → YYYY-MM-DD` |
| `CHECKBOX` | is | false before true | yes | `true` or `false` |
| `NUMBER` | is, is not, greater, less, empty | numeric | yes | number with its format |
| `UNIQUE_ID` | as number | numeric | no | `PREFIX-N` |
| `CREATED_TIME`, `EDITED_TIME` | as date | chronological | yes, by day, week or month | ISO instant |
| `CREATED_BY`, `EDITED_BY` | is, is not | by name | yes | name |
| `RELATION` | contains (one id), does not contain, empty | by count | no | titles of the readable rows, comma-separated |
| `FILES` | empty, not empty | no | no | file names, comma-separated |

The rules that stage 4 inherits:
- Sorting an options property uses the order of the schema's options, which the person controls. It replaces today's alphabetical order, and can be expressed in SQL without joining names.
- Grouping by a multi-value property repeats the row in each group. The `groups` reducer reports the count of distinct rows separately, so that a total does not get inflated.
- Rows without a value form the "no value" group, except in status, which does not have one.
- Views quote types and options by id and key. A filter or sort on a deleted property stops being applied, as today.
- The board keeps its current list of grouping properties, plus status. It does not group by multiple values in this stage.

### Migration

A single migration (`packages/db`, per its `AGENTS.md`) does, in this order and in one transaction:
1. adds the eleven values to the `DatabasePropertyType` enum, and the `PageSchemaProperty.config` and `PageSchemaProperty.nextValue` columns;
2. assigns an id to each option of each select and multi-select;
3. rewrites in `Block.properties.values` the option names to their ids. A name that is not among the options is counted and reported in the output, not reinterpreted;
4. rewrites in `PageSchemaView.configuration` the filter values, `collapsedGroups` and `columnLimits` that point to an options property;
5. converts person values from string to a one-element list, with `allowsMultiple` set to false, and changes in the views the person operators `IS` and `IS_NOT` to `CONTAINS` and `NOT_CONTAINS`;
6. converts date values from string to `{ start }`;
`PageVersion.content` is not touched: it is the page body document (titles and content blocks), and does not store `properties.values`.

It counts values and views before and after, and fails if they do not match. It is tested against a copy of the database with real collections, and is run first on a disposable database. Since there is no production (same criterion as ADR 022), there is no coexistence between the old and the new format.

## Consequences

- Positive:
  - renaming an option is a change to one schema row and cannot step on anyone;
  - each new type is validated on the server with the same transaction pipeline, and relations respect permissions on read;
  - stage 4 receives a clear table of what each type filters, sorts and groups, and values that can move to SQL with an index;
  - creation and edit do not diverge from the columns because they are not copied;
  - `required` stops being an invisible rule.
- Negative:
  - the migration rewrites rows, views and versions, and touches three value shapes at once (options, person, date);
  - every read of rows with relations pays a batch permission check;
  - the two-way relation means that writing one cell touches other rows, which are locked and bump their `version`;
  - the unique id counter serializes row creation in that collection;
  - changing the select sort from alphabetical to positional is a visible change for whoever used it;
  - without a foreign key, a relation can store dangling ids that reads discard;
  - since an option's id belongs to its property, moving a row to another collection whose selects have other ids is rejected (409), instead of storing values that the other collection does not understand;
  - when saving the shape, completing the default statuses and the unique id numbers of the rows that already existed, and cleaning up removed options, happens inside the same Postgres transaction as the schema change (the block pipeline accepts an already-open transaction, `applyTrustedWithin`); if a step fails, neither the property nor the rows are left half done. The cost is that saving the shape of a collection with a row that the saver cannot edit is rejected entirely;
  - a raw block transaction (`POST /transactions`, the live channel) cannot write a unique id or a creation or edit field in `values`: the pipeline rejects it with `BLOCK_PROPERTY_SERVER_ASSIGNED`. The pipeline reads the collection schema of the row it touches, so that read now happens in every client transaction that changes a row. The rest of the value validation remains that of the pages API and of the MCP.
  - the MCP uploads files with `upload_file` (base64, name and type, up to 10 MB) through the same file service as the portal, and returns the id to be put in a files column. The MCP route raises Fastify's body limit (1 MiB by default) to what a 10 MB file fits in base64.
- Accepted as a cost: changing a property's type remains out (BR-37f128e). Each new type is created new, and conversion is a separate question.

## Governance

The `FEA-CLC` business rules that this ADR changes are replaced with `rules:add` and `supersedes` on implementation:
- BR-12b587f (each option carries a name and color: now also an id);
- BR-37f128e (renaming an option stops being a warning about rows);
- BR-699e037 (the rename of an option is applied by id);
- BR-d7ada57 (the dropped value must be an option the property offers: now an id).

Rules are added for status, relation (permissions and mirror), unique id, and `required`. Each new type enters with validation, filter, sort, grouping and export tests written before the code. A future type (formula, rollup, stage 10) is decided in its own ADR and reuses `config` and the capabilities table.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-20
- Approved by: El-Vitas, 2026-10-20
- Modified: 2026-10-20. Approved with three changes. The relation is edited with two commands of its own (`addRelation`, `removeRelation`) and not with `listAfter`/`listRemove`. Writing the mirror side requires edit permission on the target row. It was confirmed that `PageVersion.content` does not store row values, so the migration does not touch it.
- Implemented on 2026-10-20 with three differences from what was proposed, all of scope: the board does not group by person or by multi-select (the previous list plus status and the creation and edit times remains); a status is not grouped "by group" but by option; and the MCP reads relations and files but does not write them. The `FEA-CLC` rules were replaced or added with `rules:add` (BR-12b587f, BR-37f128e, BR-699e037 and BR-d7ada57 were replaced).
- There is no collection export yet. `toExportText` is the shared text rendering that the MCP, page export and copying will use.
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 3)
