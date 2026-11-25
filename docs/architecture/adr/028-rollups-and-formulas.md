# 028: Rollups and formulas with a single engine, computed on read

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `024-collection-property-types.md`, `025-views-as-reducer-queries.md`, `026-collection-change-notices.md`
**Precedes:** stage 11 (local cache and client mode) of the plan `2026-10-20-daily-work.md`.

## Context

Stage 10 asks for two new property types. A **formula** computes a value from the row's other properties. A **rollup** summarizes a property of the rows that a relation links. They are shown in table, board and gallery, they are filtered, sorted, grouped and aggregated like any other property, and an agent can define and read them.

ADR 024 left this out and fixed two things that apply here. Derived values are not copied to `properties.values`, and reads strip from each relation cell the ids the reader cannot read before counting or aggregating. ADR 025 compiles filter, sort and groups to SQL over `properties.values`, with the `packages/shared` engine as the oracle of the semantics. ADR 026 gave each block a `changeXid`.

A serious formula engine needs a time and work limit, a result per `(row, property)` tied to the schema version, batch loading of dependencies and precomputed values for filtering and sorting. It is the most expensive part of this stage.

What forces a decision:

- a formula cannot be expressed in SQL without duplicating the language, and a rollup depends on other rows;
- a rollup can reveal an unreadable row, and a formula with `now()` changes without anyone writing;
- when a related row changes, the value of another row whose block was not touched changes;
- the agent must be able to define, test and understand an error without going through the portal.

AGENTS.md asks for the simplest solution and to optimize only with a measurement. That is why this decision **does not include a cache** in the first version, and fixes when one is added.

## Alternatives Considered

### Where the language runs

- **Compile the formula to SQL.**
  - PRO: filtering and sorting come from the database.
  - CON: two semantics, different dates and zones, and Postgres gives no per-row work limit.
- **An expression library or a JavaScript sandbox.**
  - PRO: nothing to write.
  - CON: it does not control the work per cell, the sandbox is an attack surface and it adds an unapproved dependency.
- **A full language with lists, anonymous functions and variables.**
  - PRO: it expresses any computation.
  - CON: it brings loops and recursion, which stage 10 leaves out.
- **Our own small, typed interpreter, written once in `packages/shared` (chosen).**
  - PRO: server, portal and MCP run the same code. Without loops, the work of a cell is bounded.
  - CON: the parser and catalog have to be written and tested. Formulas from other tools are not imported as is.

### Where the results live

- **Compute on read, in batch (chosen for version 1).**
  - PRO: the result is always fresh and is per reader naturally (permissions, `now()` and zone work without separate rules). There is no table, data migration, invalidation or "pending" response.
  - CON: filtering, sorting, grouping or aggregating by a computed value evaluates the candidates on every query. Its cost grows with the collection, and that is why it is measured.
- **Results table validated on read with `changeXid` (next plan, with a trigger).**
  - PRO: SQL filters and sorts on typed columns.
  - CON: two tables, invalidation per row and per related rows, separate per-reader values, budget and a "pending" response.
- **Copy to `properties.values` or invalidate on write.**
  - PRO: the ADR 025 engine does not change.
  - CON: ADR 024 ruled out copying derived values, and an edit would cascade to other rows, their `version` and the notices.

### How a computed value is filtered, sorted and aggregated

- **Bring the whole collection and evaluate it in TypeScript.**
  - PRO: simple.
  - CON: it reintroduces the cut that ADR 025 eliminated, if there is no prior filter.
- **A SQL prefilter plus exact evaluation in TypeScript (chosen).**
  - PRO: SQL trims with what it does know and the final semantics are those of the shared engine.
  - CON: two steps, and a cap on candidates.

## Decision

### The language

A `packages/shared/src/page-formula/` module with parser, type checker, evaluator and function catalog. It is used by the server (evaluate, save and test) and the portal (editor, validation, preview and optimistic recomputation). No dependencies, no JavaScript interpretation.

| Group | Contents |
|---|---|
| Operators | `+ - * / %`, `== != < <= > >=`, `and`, `or`, `not` (and `&& \|\| !`), unary negation |
| Condition | `if(condition, a, b)` |
| Properties | `prop("Name")`: text, number, checkbox, date, select, status, person, creation and edit, unique id, another formula or a rollup |
| Numbers | `abs ceil floor round sqrt pow sign min max toNumber` |
| Text | `concat length lower upper trim contains startsWith endsWith replace replaceAll slice format join empty` |
| Dates | `now today date dateAdd dateSubtract dateBetween start end year month day weekday hour minute formatDate timestamp fromTimestamp` |
| Lists (read) | `length join first last contains empty` on relations and "show original" rollups. No `map`, `filter` or anonymous functions |

- Out of version 1: loops, recursion, anonymous functions, variables, regular expressions (ReDoS) and access to other rows other than through a rollup.
- **Types.** Number, text, checkbox, date (with optional end) and list. The checker infers the type on save and rejects what does not fit. A formula's result is a scalar. An empty value propagates through arithmetic and comparisons; `empty(x)`, `if`, `and` and `or` receive it without propagating it. The exact table is fixed first in the tests.
- **Storage.** `PageSchemaProperty.config` stores `source` (text), `ast` (with property ids), `resultType` and `references`. Renaming a property rewrites only the stretches of `source` that cite it. Writing a formula or rollup cell is rejected, as with creation and edit.
- **Limits.** Text of up to 2,000 characters, tree of up to 500 nodes and depth 24. Budget of 10,000 steps per cell (per evaluated node and per element or character processed), deterministic and not clock-based. Text result of up to 10,000 characters. Relation already has a cap of 100 ids per cell (ADR 024).
- **Typed errors.** On save, it is rejected with a `Result` and code: `FORMULA_SYNTAX`, `FORMULA_UNKNOWN_FUNCTION`, `FORMULA_UNKNOWN_PROPERTY`, `FORMULA_TYPE_MISMATCH`, `FORMULA_CYCLE`, `FORMULA_TOO_LARGE`, with position (`from`, `to`) and message; the unknown one proposes the two closest labels. On evaluation, the error belongs to the cell and does not break the row: `FORMULA_DIVISION_BY_ZERO`, `FORMULA_INVALID_ARGUMENT`, `FORMULA_WORK_LIMIT`, `FORMULA_DEPENDENCY_ERROR` and `ROLLUP_TARGET_UNAVAILABLE`. The portal paints the code and the message. An error meets no filter, goes to the end of the order and is counted separately in the aggregations (`errorCount`).
- **Rejected schema changes.** Deleting or changing the type of a property cited by a formula or a rollup (of the same collection or another) fails with `PROPERTY_IN_USE` and the list of dependents. A cycle fails on save. A chain of rollups over rollups or formulas has a cap of 3 collections (`ROLLUP_DEPTH_EXCEEDED`).

### The rollup

`config` stores `relationPropertyId`, `targetPropertyId`, `calculation` and `resultType`; the target collection comes from the relation.

| Calculation | Result |
|---|---|
| `COUNT_ALL` (related rows), `COUNT_FILLED`, `COUNT_EMPTY` | number |
| `PERCENT_FILLED`, `PERCENT_EMPTY` | number (same convention as `PERCENT_CHECKED`) |
| `SUM`, `AVERAGE`, `MEDIAN` | number |
| `MINIMUM`, `MAXIMUM` | number, or date if the target is a date |
| `SHOW_ORIGINAL` | list of the target's values |

- The valid calculations come from `listPageCalculationsFor(target type)`. `PERCENT_FILLED` and `PERCENT_EMPTY` become calculations of that table (also of the table footers), with their case in the ADR 025 SQL aggregation compiler and in the parity test. The functions of `page-view.calculation.lib` are reused, there is no second implementation.
- Without related rows, counts and sum are 0; average, minimum, maximum, median and percentages are empty.
- `SHOW_ORIGINAL` is shown, is read through the MCP and is used from another formula, but **is not filtered, sorted or grouped in version 1** (`VIEW_QUERY_INVALID` with a clear message).

### Computing on read

A **computation context** per request loads, in batches and without one query per row:

1. the candidate rows, with their values;
2. the relation ids of the properties that the formula or rollup cite, already without those the reader cannot read (the ADR 025 denied set, same cap of 5,000 and same typed error);
3. the distinct related rows, in one `id = ANY($ids)` query per target collection and per block of 500 sources, only with the needed keys;
4. if the target is another formula or a rollup, it is evaluated first in that context (up to the depth cap).

The computations run with the shared engine. Since each request evaluates for its reader, with its clock (`PAGE_QUERY_CLOCK`) and its zone (`timeZone`), the result is what that reader should see: a rollup never counts an unreadable row and `now()` is that of the response. A reader without access to the target collection sees the rollup as if the relation were empty. No response reports how many rows were excluded.

**Screen.** For the rows of a page (from `results`, `groupResults` or the read of a row) only the requested computed columns are evaluated.

### Filtering, sorting, grouping and aggregating

The ADR 025 compiler keeps doing in SQL everything that does not depend on a computed value. When the query touches a computed column in the filter, the sort, the groups or the aggregations, the server does two steps:

1. **SQL prefilter.** It compiles the filter replacing with "true" each condition on a computed column, and applies the search, the denied set and the rest. It is a superset of the result.
2. **Exact evaluation.** It loads the candidates in batches, computes the necessary computed columns, applies the full filter with `matchesPageFilter`, sorts with `comparePageRowsBySorts`, groups with `groupPageRows` and aggregates with the functions of `page-view.calculation.lib`, all from the shared engine. It paginates with the same opaque cursor as ADR 025 (sort values of the last row plus `id`).

- **Cap.** Up to 20,000 candidates. Above that, `VIEW_QUERY_COMPUTED_TOO_LARGE` with a message saying how many candidates there are and that a filter on stored properties reduces them. Never a truncated response.
- **A query that does not touch computed columns does not change**: it stays entirely in SQL.
- **A single semantics.** The computed value enters the shared engine like the derived creation and edit values (`withDerivedValues`). Step 2 uses the oracle directly. Parity with SQL is tested where there is SQL: the prefilter must be a superset of the exact result (property tested with generated collections), and `PERCENT_FILLED` and `PERCENT_EMPTY` enter the aggregation parity.

### Measurement and cache trigger

Neuma's expected data is small (a few hundred pages), and a 10,000-row collection with 10 relations per row filtered by a computed column is the stress case, not the common one. There are therefore two budgets. A page of 50 rows with their computed values has an **API p95 of 300 ms or less**. Filtering, sorting, grouping or totaling by computed columns over 10,000 rows with 10 relations has a **p95 of 600 ms or less**. The test `formulas-and-rollups.performance.integration.spec.ts` watches them and is measured alone, without another heavy process: with another session's development server running, the times double. Measured that way on a loaded development machine, the page took 114 ms and the computed queries between 193 and 374 ms. The cache is **only added if a p95 measured on real data (or on the production VM) exceeds those budgets**; the stress test on a shared machine is not enough. The planned next step is a results table per `(row, property)`, validated on read with `changeXid` as the cursor (ADR 026), with `asOf` per entry, a fingerprint of schema versions, a `hasRestrictedInputs` mark for cells that depend on rows with their own permissions (which would keep being computed per reader), a fill budget per request and a `COMPUTED_VALUES_PENDING` response. That design is written in a new ADR when the trigger is met.

### Notices and portal

- **A row changes and its dependent is not touched.** The query responds `computedDependsOn`, the target collections of the rollups. The portal follows them through the live channel (they count toward the cap of 20) and, on a notice, draws the page again from the server: the views do not place those rows because they are not theirs. Today the portal takes those collections from the schema, so it follows only the direct ones: a rollup over a rollup of another collection is not followed until the third. Requesting by ids only the computed values of the loaded rows remains as an improvement.
- **Optimistic.** While a table cell is being written, the portal recomputes locally with the same engine the row's formulas that read only stored properties or other such formulas, and do not use the clock. The rest waits for the server.
- **Row open on its page.** The page list does not bring computed values (computing them for the whole space would be costly), so the page of a row that belongs to a collection with formulas or rollups requests them separately with a `GET` of the page, which computes them for the reader.
- **Editor.** It validates while typing, with the same engine, and says the type the formula yields. The test on real rows is `test_formula` for agents; the portal does not have it yet.
- **For stage 11.** A computed value is not part of the row's `version`, because it can change with the row untouched. A record cached in the browser must not take them as good just because of the same `version`.

### MCP tools

- **`update_collection_columns`** accepts `FORMULA` with `{ formula }` (text with column names) and `ROLLUP` with `{ relation, property, calculation }`. It responds `resultType` and `references`, and if it fails, the code, the position and the closest labels.
- **`test_formula`** (new, read only): `{ collection, formula | rollup, rows?, trace? }`. It checks a definition without saving it and evaluates it on up to 5 rows. It returns `resultType`, `references`, the values or errors per row and, with `trace`, the value of each subexpression. It is idempotent.
- **`query_collection`** and `get_collection` return the computed columns as `{ value }` or `{ error: { code, message } }` and accept `where`, `sort`, `groupBy`, `aggregate` and `columns` on them by name. On `VIEW_QUERY_COMPUTED_TOO_LARGE`, the message says how to narrow.
- **`collection_changes`** (ADR 026), without a cache, cannot know which computed value changed. For each collection with rollups, in addition to the touched-block rows, it returns as `possiblyChanged` the source rows whose relation points to a target row that changed since `since` (they are found by the relation ids with one pass over the collection, in the order of 3 ms with 10,000 rows according to ADR 025). They are marked as possible, complete and with their current values, and the agent deduplicates by `id` and value. For formulas, a row changes only if its block changed, so it is already covered.
- The guide to functions and errors lives in the MCP instructions and in the description of `test_formula`.
- An agent has the permissions of its person: the same per-reader rollups and the same denied set.

### Other surfaces

- **Export** (Markdown, CSV): writes the computed value for the reader, through the same path.
- **Totals with failed cells**: `errorCounts` says how many cells of a totaled column failed among the evaluated rows, which are those that pass the conditions on stored columns; it is an approximate figure so that the total is not read as if it were everything.
- **Templates and default value**: they do not apply to formulas or rollups, and `required` is rejected.
- **Row in the trash**: it stops counting in rollups because the relation already excludes it (ADR 025).

### Migration

Only what the enum needs: a small migration (`packages/db`, per its `AGENTS.md`) that adds `FORMULA` and `ROLLUP` to `DatabasePropertyType`. There are no new tables. Before creating it, `ls packages/db/migrations/app` is checked in case another stage has an unapplied one. It is tested on a disposable database and then applied to `company-brain`.

## Consequences

- Positive:
  - a single language that runs the same on server, portal and MCP, with work bounded per cell;
  - no cache tables, no invalidation and no "pending" state. Values are always fresh and per reader, with the correct permissions;
  - writing pays nothing for formulas or rollups;
  - the agent tests a formula before saving it, sees the code and position of the error, and finds out which rows may have changed.
- Negative:
  - filtering, sorting, grouping or aggregating by a computed value evaluates the candidates on every query, with a cap of 20,000 and a measurement that may force adding the cache;
  - `SHOW_ORIGINAL` is not filtered or sorted;
  - `collection_changes` can return rows whose value did not change (`possiblyChanged`);
  - the portal spends subscriptions from the cap of 20 on target collections;
  - the language does not import formulas from other tools and has no functional lists or regular expressions.
- Changes to existing behavior:
  - deleting or changing the type of a property cited by a formula or a rollup fails with `PROPERTY_IN_USE`;
  - the calculations table gains `PERCENT_FILLED` and `PERCENT_EMPTY`.

## Governance

- Tests first (TDD). Each catalog function and each empty rule has its case before the code. The parser and the rename have property tests.
- **Permissions.** A leak test per rollup: a reader without access to a related row obtains the same value as if it did not exist, in cell, filter, sort, group, aggregation, export and MCP, and the same with a reader without access to the target collection.
- **Prefilter.** A test with generated collections that the SQL result is always a superset of the exact one.
- **Performance.** A 10,000-row collection with 10 relations per row: API p95 of 300 ms or less for a page of 50 rows with their computed values and 600 ms or less for filtering, sorting, grouping or totaling by computed columns, without queries per row. If a value measured on real data exceeds them, a warning with the figures is given before adding the cache.
- **Errors.** Every query error is a `Result` with a code; an unexpected failure leaves an `ERROR` with a trace and never an empty list.
- **Business rules** (`FEA-CLC`, with `rules:add`): formulas and rollups, cell errors, permissions, `PROPERTY_IN_USE`, `VIEW_QUERY_COMPUTED_TOO_LARGE`.
- A new function, operator or calculation does not enter without its parity case. Adding the cache is decided in a new ADR.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21. Approved with one structural change: no cache tables or validation on read in version 1. It is computed on read, in batch, with the shared engine, and the cache remains as the next plan with its trigger (p95 of 300 ms over 10,000 rows with relations). The own language without regex, read-only `SHOW_ORIGINAL`, `PROPERTY_IN_USE`, optimistic recomputation, `PERCENT_FILLED` and `PERCENT_EMPTY`, and the notices through target collections are kept.
- Modified: 2026-10-24. The exact evaluation ended up different from what is written in Decision: the server computes the computed columns over the candidates that the stored conditions let through, and hands those values to SQL as if they were stored (`materializeComputed` in `page-query.service.ts`). That way the filter, sort, groups, cursor and totals keep running in the ADR 025 compiler, without a second implementation in TypeScript.
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 10)
