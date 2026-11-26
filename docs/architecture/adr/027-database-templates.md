# 027: Collection templates

**Status:** Accepted
**Date:** 2026-10-21
**Approved by:** El-Vitas, 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`, `025-views-as-reducer-queries.md`
**Precedes:** stage 9 (database templates) of the plan `2026-10-20-daily-work.md`.

## Context

A template is a page with content and property values that is copied when a row is created. Stage 9 asks for creating it, editing it, renaming it, deleting it, marking one as default, creating rows from it (table, board, calendar, button and MCP) and resolving `@today` and `@me` on creation.

The decision that constrains everything else is where the template lives, because it must be editable like any page and must never show up as a row, a count, a search result or an element of an MCP listing.

What the code imposes today:

- **The editor, versions, title, icon and permissions work on `type = 'page'` blocks.** `BLOCK_CONTENT_SCHEMAS`, the content reader, search (the nearest page of a hit) and locks look for "the nearest page" of a block. A new type for the template root would break all of that.
- **A live block must be in its parent's `children`** (`checkPlacedUnderParent`). A template that is a child of the collection appears in `children` next to the rows.
- **Rows are recognized by `parentId = collection AND type = 'page'`.** There is no other mark. `page-query.repository` (3 places), `page-changes.repository` (2), `page-schema.repository` (row count and `readPagesUnder`), `block.live.collection.domain` and the `PageBlockReader` listings (`readChildPageBlocks`, `readPagesUnder`, `readSpacePageBlocks`) do it, and from those come the side tree, the MCP results and the trash.
- **Page schemas are strict** (`properties` only admits `title` and `values`).
- **The button block already has `deed: 'row'`** (adds a row). Stage 9 only adds a chosen template to it.
- **`@today` and `@me` are already resolved** in filters (`readPageRelativeDate`, `PAGE_FILTER_ME`, stage 8).

## Alternatives Considered

### Where the template lives

- **Own table (`PageTemplate`) with content in JSON.**
  - PRO: it stays out of every block query without touching them.
  - CON: it breaks ADR 021 (everything is a block). The content stops being blocks, so there is no editor, no versions, no inherited permissions, no duplicate with new ids. All of that has to be rewritten.
- **New block of type `template` as the root.**
  - PRO: queries by `type = 'page'` exclude it on their own.
  - CON: it loses "nearest page", so the template's content cannot be searched, locked or versioned, and the editor does not open it. It is equivalent to the previous case with more pieces.
- **`template_list` container (a block that is not a page) as a child of the collection; the templates are pages that are children of the container.**
  - PRO: row queries do not see them, and the editor and everything else work because they are pages.
  - CON: the container is a child of the collection that is not a page, so the collection's content reads it as a block (that type has to be excluded from the collection document). The templates end up orphaned in `readSpacePageBlocks` (side tree, trash, search, MCP), a different failure in each reader and with no mark that can be queried.
- **Page that is a child of the collection with a `properties.template` mark (chosen).**
  - PRO: it is a complete page: editor, versions, inherited permissions, duplication with new ids and trash work unchanged. A single mark that is queried in SQL and in TypeScript.
  - CON: it stays in the collection's `children` and in every `parentId = collection AND type = 'page'` query, so each one listed above must exclude it. This is the main risk.

### How the leak is prevented

- **Patch each query when it is found.**
  - CON: the next new query leaks it again, and nobody notices.
- **A central predicate and a test that walks all the paths (chosen).**
  - `isTemplatePage` in `packages/shared` and its SQL fragment in a single constant. Every row reader and every page listing of `PageBlockReader` applies it. An integration test creates a template with a neighboring row and asserts that it does not appear in: view query, counts and aggregates, change notices, side tree, search (title and content), `list_pages`, `get_collection`, `query_collection`, trash and export. That test is the barrier against future leaks. The template is seen only through the template listing itself and by id.

### Default template

- **`isDefault` mark on each template.**
  - CON: two writes to change it (remove and set), and two default templates if they fail or race.
- **`defaultTemplateId` pointer on the collection (chosen).**
  - PRO: a single field, a single atomic write, and there are always zero or one.
  - CON: if the pointed-to template is deleted, the pointer must be cleared in the same transaction.

### Per collection or per view

- **Per view.**
  - PRO: calendar with one template and board with another.
  - CON: it is view configuration, with the concurrent-editing care of ADR 025, and the agent has no view in `create_row`.
- **Per collection only (chosen).** The requested case (default when creating from any view) is covered. A different template per view can be added later as an optional view field, without changing this model.

### Variables

- **Expression language.** CON: that is stage 10 (formulas).
- **Only `@today` and `@me` (chosen).** They are stored as a text placeholder in a date or person property of the template, and are resolved on creation with the same functions as stage 8. The resulting row never contains them.

## Decision

1. **A template is a page that is a child of the collection** with `properties.template`, an object `{ variables }`. It is added to the page schema as an optional field. The words `@today` and `@me` do not go inside the template's values (there, column validation would reject them) but in `variables`, which says which column is filled with which word; the column comes out of `values` and the word is resolved when the row is created. `@today` only fits in a date column and `@me` in a person column.
2. **The collection stores `properties.defaultTemplateId`** (optional). The server clears it when the pointed-to template is deleted or loses its mark.
3. **No row or page reader returns a template.** It is excluded with the central predicate, and the leak test above covers it.
4. **Creating a row from a template** copies content and values with new ids by reusing the duplicate planning (`planCopies`), resolves `@today` and `@me` for whoever creates, and writes everything in a single transaction. Without an explicit template, `create` in a collection with `defaultTemplateId` uses the default one. A row created with its own content or values merges them over the template (what is given wins).
5. **Template operations** (create, rename, edit values and variables, delete, mark as default) have their own route under the collection (`/pages/:collection/templates`); the content is edited with the page editor, because the template is a page. They require being able to edit the collection. Deleting a template sends it to the trash with a purge deadline (without going through the trash listing) and clears the pointer if it was the default.
6. **The initial values of the columns** travel separately on creation (`defaultValues`) so they sit under the template: explicit given value, then template and variables, then the column's initial value.
7. **The button** adds an optional `templateId` to `deed: 'row'`; without it the default template is used.
8. **MCP:** `list_templates`, `save_template` (creates or updates, and can mark it as default), `delete_template`, and `create_row` with `template` (name or id; null for a blank row) and with the default one when none is given. The descriptions explain it.
9. **Change notices and duplication:** a collection's live notice ignores changes to its templates, and duplicating a collection with its pages copies the templates with their mark and reassigns the default template.
10. **There is no migration.** The mark and the pointer live in `properties` (JSON).

## Consequences

- **More than one place touches row queries.** It is the cost of the template being a complete page. The leak test makes it visible and the business rule declares it.
- **A template takes a place in `children`.** It does not affect the order of rows because views sort by reducers (ADR 025). Whoever reads a collection's `children` without going through the reader must filter.
- **The template's permissions are those of the collection** (inherited). Whoever cannot edit the collection does not change its templates, and whoever only reads it sees the list of templates and uses them only if they can create rows.
- **Per-view templates remain open.** It is one more field of the view if usage asks for it.
- **It remains to be decided** whether a row made with its own values and a default template merges (proposed) or the own values replace the whole template.
