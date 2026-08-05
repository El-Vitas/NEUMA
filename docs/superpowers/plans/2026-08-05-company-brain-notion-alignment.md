# Company Brain Notion Alignment Implementation Plan

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope. Read `AGENTS.md` at the repo root and the app-level `AGENTS.md` before writing code.

**Decisions of record:**
- `docs/architecture/adr/008-adopt-single-page-primitive-notion-alignment.md` — one page primitive, collections as views over pages, the link graph, the content storage ladder, and the canonical source of truth for content.
- `docs/architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md` — a file lives where it was placed in the content.

**Goal:** Make the product deliver its actual objective — knowledge and work as the same fabric, operable by a human and by an agent — by collapsing two content primitives into one, making links between pages a first-class graph, and making content addressable at block granularity.

**Architecture:** `Page` becomes the only content primitive. A **collection is a page that carries a schema** (typed properties plus views); its rows are its child pages, so membership is plain `parentId` and there is no separate collection entity. `Page.content` (ProseMirror JSON) is the canonical source of truth for content. Everything else that needs to read content differently — search, the link graph, the block index — is a **projection** fed by the existing transactional outbox. Notion's block table is not adopted as a write model; blocks are derived (ADR-008, storage ladder level 3).

**Tech Stack:** Bun, NestJS, Fastify, Prisma 7, PostgreSQL, Zod, Next.js 16, React 19, ProseMirror, Hocuspocus/Yjs, existing Result/auth/policy conventions.

---

## Scope

**In scope:** stable block ids, page mentions, backlinks, page-level typed properties, collections as schema + views over pages, page templates, collections inside the space tree, the removal of `DatabaseRecord`, the block projection, agent write tooling over MCP, and in-place file attachment.

**Out of scope for this plan:** comments, notifications, inbox, calendar/timeline views, relations between collections, formulas, rollups, automations, per-block permissions, pages nested inside container blocks as true containment, and multi-schema collections (Notion's 2025 `data_source` split).

## Resolved: no data migration is needed

The question was whether the rows that exist today must survive the removal of `DatabaseRecord`. It was settled by inspecting the running database on 2026-08-05 rather than by assumption:

- 1 `Database`, 3 `DatabaseRecord` rows, 4 `Page` rows, 0 `FileAsset` rows.
- All three records (*Set up local development*, *Document service architecture*, *Review portal content*) are hardcoded in `packages/db/prisma/seed/demo.seed.ts:245-269`.

There is no user-authored data. **Phase 3 is therefore a seed rewrite, not a data migration**, and it is not blocked.

Re-check this before executing if significant time has passed or if the deployment has been used in earnest — the conclusion is a snapshot, and the cheap way to invalidate it is a single `count(*)` on `DatabaseRecord` compared against what the seed creates. Take a database dump before the phase regardless; the step is destructive even when what it destroys is disposable.

## Sequencing Rationale

The phases are ordered by independence and by value delivered per unit of risk, not by data-model tidiness.

1. **Phase 1 (block ids + graph)** touches neither databases nor records. It is the product's stated first requirement, it is what makes this a brain rather than a folder tree, and it lays down block ids while they are still cheap.
2. **Phase 2 (properties on pages)** makes `Page` capable of everything `DatabaseRecord` does, without removing anything. After it lands, both models can express a task — which is what makes Phase 3 a deletion rather than a rewrite.
3. **Phase 3 (absorption)** removes the redundant entity once nothing depends on it.
4. **Phase 4 (block projection + agent tooling)** depends on Phase 1 alone, so it may run in parallel with the 2 → 3 line rather than after it.
5. **Phase 5 (files)** needs Phase 4 for orphan detection, though its interaction work is independent.

Each phase leaves the product working. No phase requires the next one to be started.

**Dependency shape**, so the order is not mistaken for a strict chain:

```
Phase 1 ──┬──▶ Phase 2 ──▶ Phase 3
          └──▶ Phase 4 ──▶ Phase 5
```

---

# Phase 1 — Stable block ids and the link graph

**Delivers:** every block in a document has an id that survives editing; typing `@` in a page offers other pages; selecting one inserts a live reference; the referenced page shows what links to it.

## Stable Block Ids

Do this first, in the same slice as the mention node — both edit `pages.editor.schema.ts`, and the cost of adding ids later is not the code, it is backfilling ids into every stored document while any citation minted before the backfill is already worthless.

- Add an `id` attribute to every block-level node in the schema. Assign on node creation.
- Ids must be **stable across edits**: typing in a paragraph keeps its id; splitting a paragraph gives the new half a new id and leaves the original's id on the first half; merging keeps the surviving block's id.
- Ids must be **unique within a document**. Copy-paste within the same document must re-issue ids for the pasted nodes, otherwise a duplicate id makes "the block with id X" ambiguous. This is the failure case to test explicitly, because it is easy to miss and silently corrupts addressability.
- Existing stored content has no ids. Write a backfill that assigns them once, and make the reader tolerant of id-less nodes until it has run.
- No consumer in Phase 1 depends on these ids yet. They are laid down now because they are nearly free now and expensive later (ADR-008, storage ladder level 2).

## Data Model

One new Prisma model, one file, following the existing `models/` convention:

- `PageLink`: `id`, `sourcePageId`, `targetPageId`, `createdAt`. Unique on `(sourcePageId, targetPageId)` so reconciliation is idempotent. Indexed on `targetPageId` (backlink lookup is the hot read) and on `sourcePageId` (reconciliation deletes by source). Both relations cascade on page delete.

No enum is needed. A single relationship type exists; introducing a `type` column now would be speculative generality. Outline has one because it also models other relationship kinds we do not have.

## Editor

- Add a `mention` node to `apps/portal/modules/pages/lib/pages.editor.schema.ts`. Attributes: `pageId` and a denormalized `label` for rendering without a fetch. The node is `inline`, `atom`, and not editable as text.
- The denormalized label is a deliberate trade-off: it renders instantly and keeps the document self-describing when exported, at the cost of going stale when the target is renamed. Resolve staleness at render time by preferring the resolved title when the target is readable, falling back to the stored label when it is not. Do not attempt to rewrite stored content on rename — that would mean editing every referencing document on every title change.
- Extend the existing slash-command infrastructure (`pages.editor.slash-menu.lib.ts`, `pages.editor.slash-menu.tsx`) with an `@` trigger. Reuse the existing menu component and keyboard handling rather than building a second popover.
- The mention target list must come from the server through the existing server-first path. No client component may call the backend directly.

## Backend

- A page-search-for-mention query, scoped to what the requesting user can read. Reuse `canReadSpace` in `apps/backend/src/common/domain/workspace.policy.ts`; do not write a second authorization path.
- A `PageLink` repository with a single reconcile operation: given a source page and the set of target ids currently referenced by its content, insert what is missing and delete what is no longer referenced, in one transaction.
- A backlinks read: given a target page and a requesting user, return the source pages **filtered by space access**, with the count computed after filtering.

## Projection Worker

Follow `apps/backend/src/modules/search/infrastructure/worker/search.projection.worker.ts` as the reference implementation, including its retry and idempotency handling.

- Consume the existing outbox events for `aggregateType = 'PAGE'`: `PAGE_CREATED`, `PAGE_UPDATED`, and page trashing.
- Parse referenced page ids out of the stored ProseMirror content. Put the parser in a **pure, isomorphic helper** so it is unit-testable without a database and reusable by the portal if needed.
- Reconcile `PageLink` rows for that source page.
- Trashing a source page removes its outgoing links. Trashing a target page does **not** delete incoming links — the link is still true, and restoring the page must restore its backlinks. Filter trashed targets at read time instead.

## Portal

- A backlinks section on the document view listing pages that reference the current one. It renders only when there is at least one readable backlink; an empty section is noise.
- Mention rendering as an inline link to the target page.

## Tests

- Pure parser: extracts ids from nested content, ignores non-mention nodes, deduplicates repeated references, returns empty for empty documents.
- Reconciliation: adding a mention creates one row; removing it deletes the row; re-saving unchanged content is a no-op; a page mentioning the same target twice yields exactly one row.
- Authorization: a backlink from a space the reader cannot access is absent from the list **and** absent from the count.
- Self-reference: a page mentioning itself does not create a link.

## Risks

- **Disclosure through the graph.** Backlinks are the classic leak: an unfiltered count tells a reader that content exists in a space they cannot see. Filter first, count second. This must be tested, not merely intended.
- **Reconciliation storms.** Autosave already coalesces writes, so a page emits far fewer `PAGE_UPDATED` events than keystrokes. Verify this holds before adding any additional debounce; do not pre-optimize.

---

# Phase 2 — Properties on pages, collections as views

**Delivers:** a page can carry typed properties; a collection defines the schema and the views; creating a page can start from a template.

## Data Model

- `Page` gains `propertyValues` (nullable JSON). **It does not gain a `collectionId`** — membership is `parentId`, and a page is a row exactly when its parent page carries a schema.
- `Database` is **deleted**, not renamed. It contributed an id, name, slug, space, lifecycle and template kind, and `Page` already supplies every one of those.
- `DatabaseProperty` and `DatabaseView` survive as the schema tables, re-keyed from `databaseId` to the **owning page id** (`PageSchemaProperty`, `PageSchemaView`, or whatever naming the module settles on — the important part is the key, not the label). A page carries a schema exactly when it has at least one schema property row.
- `DatabaseRecord` is **left untouched in this phase.** Both models coexist so that nothing breaks mid-migration.

## Backend

- Validation: a page **whose parent carries a schema** validates `propertyValues` against that schema. A page whose parent does not must have no property values. Reuse the existing validation in `apps/backend/src/modules/databases/domain/database.domain.ts` rather than writing a parallel validator — it already enforces the "exactly one TITLE property" rule and per-type value checking.
- Resolving a page's schema is one hop to its parent. Keep that resolution in a single named function; if it starts appearing inline at call sites, the model has leaked.
- The `TITLE` property becomes redundant: `Page.title` already exists and is the title. Map the collection's title property onto `Page.title` instead of storing it twice in `propertyValues`. Storing a title in two places guarantees they diverge.
- View reads (table, board) gain a page-sourced implementation. `database.views.domain.ts` grouping logic is reused as-is; only the input changes.

## Templates

- A template seeds three things: the collection the new page joins, its initial property values, and its initial content.
- `apps/backend/src/modules/databases/templates/database.templates.ts` becomes the seed for collection schemas. Tasks and Projects keep their existing property sets.
- Creating a page from a template is a single server action; the portal must not assemble it client-side from several calls.

## Portal

- A property panel on the document view, rendered only when the page belongs to a collection. Property inputs derive from the property type, reusing existing form primitives.
- The page-creation flow offers templates. This replaces the current situation where templates exist only when creating a database.

## Tests

- A page in a collection rejects values that violate the schema; a page outside a collection rejects any property values at all.
- A page whose parent carries no schema rejects any property values at all.
- Moving a page under a different schema-carrying parent re-validates it against the new schema; moving it under a plain page clears its row-ness. Decide and test what happens to values that no longer fit — silently dropping a user's data is not acceptable, so the move must either be refused with a clear reason or preserve the orphaned values somewhere recoverable.
- Board grouping produces identical output whether fed records or pages — this is the regression gate that makes Phase 3 safe.

## Risks

- **The board's hardcoded `groupBy: 'status'`.** `boardView` in the templates file pins grouping to a `status` key that a custom collection may not have. Phase 2 exposes this. Either make the board view require a `SELECT` property at creation and let the user choose it, or render an explicit "this view needs a grouping property" state. Do not leave it silently grouping by nothing.
- **Schema authority.** See ADR-008 Risks. Adding a required property to a collection makes existing member pages non-conforming. Decide authoritative-vs-advisory **before** collections are user-editable.

---

# Phase 3 — Absorb `DatabaseRecord`

**Delivers:** one primitive. A task is a page you can open and write inside.

**Not blocked.** See "Resolved: no data migration is needed" above — the only records that exist are seed rows.

## Steps

1. Rewrite the seed (`packages/db/prisma/seed/demo.seed.ts`) so the demo tasks are created as pages whose parent is the schema-carrying "Tasks" page, carrying their titles and property values. No backfill script is needed because no user-authored record exists.
2. Delete the `DatabaseRecord` model, its repository, its DTOs, its record endpoints, and the `pageId` column that was never wired.
3. Point every view read at pages. The board and table domain logic does not change.
4. Retire `SearchSourceType.DATABASE_RECORD`. Remove the record branches from the search projection worker — the worker loses code rather than gaining it. Reindex.
5. Move collections into the space tree in the portal and retire the top-level `/databases` route.

## Tests

- Views over pages return the same shape the record-backed views returned (the Phase 2 gate proves this before deletion).
- Search returns former records as pages, with no `DATABASE_RECORD` source type remaining anywhere.
- A page that was a record has working versioning, trash/restore, collaboration and mentions — that is the whole point of the phase, so it must be asserted explicitly.

## Risks

- **Irreversibility.** This is the destructive step. It is safe only under the disposable-data assumption; confirm it, and take a database dump first regardless.
- **Endpoint removal.** Record endpoints disappear. Grep for every consumer, including the MCP search surface, before deleting.

---

# Phase 4 — The block projection and agent tooling

**Delivers:** content becomes queryable and citable at block granularity, and an agent can operate the brain rather than only read it.

**Depends on:** Phase 1 only (it needs the stable ids). It does **not** depend on Phases 2 or 3, so it may run in parallel with them.

## Data Model

- `PageBlock`: `id` (the node's stable id), `pageId`, `parentBlockId` (nullable), `order`, `type`, `text` (flattened plain text for querying), `attributes` (JSON for the type-specific bits), `versionMarker`. Unique on `(pageId, id)`. Indexed on `pageId` for subtree reads and on `type` for cross-page queries.
- This is a **projection**. Nothing writes to it except the worker. Treat a direct write to `PageBlock` in application code as a bug.

## Projection Worker

- A second consumer of the `PAGE_*` outbox events, alongside search. Reuse the retry, idempotency and `versionMarker` handling that `search.projection.worker.ts` already establishes — including its rule that a late event must not overwrite a newer state.
- Derive from `Page.content`, which ADR-008 establishes as canonical. Do **not** derive from `CollaborationSnapshot`.
- Decomposition (ProseMirror document → flat block rows with parent and order) must be a **pure, isomorphic function**, unit-tested against real document fixtures with no database involved.
- Reconcile per page: upsert present blocks, delete rows whose ids are no longer in the document.

## MCP Surface

The existing server (`apps/backend/src/modules/mcp/mcp.server.ts`) has three read tools — `mcp.listSpaces`, `mcp.getPage`, `search_company_brain` — all resolving a principal and filtering by permission. Extend it along the **domain**, not the storage:

- Reads: fetch a page's blocks, fetch a block by id, list backlinks for a page, query pages by collection property.
- Writes: create a page (optionally from a template, optionally in a collection), update a page's properties, replace a block by id, append a block, link two pages.

Non-negotiable for every new tool:

- **Every tool resolves the principal and filters by space access**, exactly as the three existing tools do. There is no "agent bypass" path. An agent operating with a user's identity sees precisely what that user sees.
- **Writes go through the same services the portal uses**, so domain validation, versioning and outbox emission happen identically. An agent must not be able to write a state a human could not.
- **Write tools are explicit about the unit they touch.** "Replace block X" is safe and reviewable; "rewrite this page" invites silent destruction of work. Prefer the narrow tool.

## Tests

- Decomposition: nested lists, tables and toggles produce correct `parentBlockId` and `order`; an empty document produces no rows.
- Reconciliation: editing one paragraph updates one row; deleting a block removes exactly that row; re-running on unchanged content is a no-op.
- Cross-page query: unchecked to-do blocks are found across pages, and **only** in spaces the requester can read.
- MCP write: a tool invoked as a viewer-role principal cannot create or modify a page.

## Risks

- **Projection lag is now user-visible to agents.** An agent that writes and immediately queries the block index may not see its own write. Either expose the write's resulting state directly in the tool response, or document the lag in the tool description so the agent does not loop waiting. Do not paper over it with a sleep.
- **Write tools are a blast-radius increase.** Every write tool must be justified by a real workflow; a tool that can rewrite arbitrary content because it "might be useful" is how an agent destroys a wiki. Ship the narrow ones first.

---

# Phase 5 — Files where you put them

**Decision of record:** `docs/architecture/adr/009-files-live-in-content-not-in-a-parallel-list.md`

**Delivers:** dropping a file into a document attaches it at that spot, and deleting the block is how you remove it. One gesture, one place.

**Depends on:** Phase 4 for orphan detection (the block projection already knows every referenced `assetId`). The interaction work depends on nothing and may land first.

## Backend

- `FileAsset.pageId` stops being the placement record and becomes the ownership/permission/collection anchor. The authorization path in `file.asset.repository.ts` is already correct — **do not rewrite it**; it resolves the asset's page and checks page access, which resolves to space access.
- After Phase 3, `databaseRecordId` is removed and the exactly-one-of check at `file.asset.repository.ts:42` collapses to a required `pageId`.
- Add an unreferenced-asset sweep: an asset whose id appears in no block of its owning page, **and in no retained page version**, is eligible after a grace period. Reuse the existing `FileAssetLifecycle` soft delete rather than hard-deleting rows.
- `GET /files/page/:pageId` stays for administrative use. It is no longer what renders the page.

## Portal

- **Drop on the editor inserts at the drop position.** The drop is already captured (`onDropCapture` → `uploadDroppedFile`); the change is that the insertion point follows the pointer instead of appending.
- Paste an image → same path at the caret. `/file` and `/image` slash commands → picker → insert at caret.
- Images render inline; other files render as a compact card with filename, size and download.
- **Upload state lives in the inserted block**: a placeholder showing progress, and on failure an inline retry. A toast alone is not acceptable — it disappears and takes the error with it.
- Retire the separate "Attachments" section as the primary surface.

## Tests

- Deleting a file block leaves the asset unreferenced but **not** immediately deleted.
- An asset referenced only by an older page version is not swept.
- A block referencing an asset owned by a page the reader cannot access renders an explicit no-access state, never a broken image and never the file itself.
- Upload failure leaves a retryable block in the document, not a silent gap.

## Risks

- **The sweep can destroy data.** Failure mode is permanent loss, so it must be conservative: when the reference check is uncertain, keep the blob. Paying for storage is strictly better than deleting a file someone still needs.
- **Restoring an old page version whose asset was already swept** must render a missing-file block, not crash the document.

---

## What Deliberately Is Not Changing

Stating this prevents scope drift during execution:

- **`Page.content` stays the canonical write model for content.** Blocks are derived, never written to directly. Yjs live editing keeps operating on the ProseMirror document, and `CollaborationSnapshot` stays session state rather than the record of the document.
- **Per-block permissions and true page-in-block containment are not built.** They are the reopening condition for storage ladder level 4 in ADR-008, not part of this plan.
- **`Space` stays exactly what it is** — grouping, ordering, permission boundary. It gains no behaviour.
- **The outbox and search projection stay.** The link graph, the block index and the asset-reference check are additional consumers of the same event stream, not replacements for it. If a phase here proposes new event infrastructure, it has gone wrong.
- **`file.asset.repository.ts` authorization stays.** It is already correct; Phase 5 changes what `pageId` *means*, not how access is checked.
- **The table and board view domain logic stays.** Only its data source moves.

## Verification For Every Slice

From the relevant app directory: `bun run check` must exit with 0 errors and 0 warnings, and `bun run test` must pass with 0 failures. No suppression comments, no lint or TypeScript config edits. Nobody commits except the user.
