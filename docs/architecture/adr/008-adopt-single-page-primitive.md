# 008: Adopt a single page primitive and a link graph

**Status:** Superseded
**Superseded by:** 021
**Date:** 2026-08-05
**Supersedes (in part):** the data model established by `docs/superpowers/plans/2026-08-02-neuma-databases.md`
**Changes scope:** moves Mentions and Backlinks from `docs/scope/future-scope.md` into `docs/scope/current-scope.md`

**Revision, same day:** the first draft of this ADR kept a `Collection` entity (a renamed `Database`) plus a `Collection` foreign key on `Page`, with a rule that `parentId` and `collectionId` were mutually exclusive. That was wrong for the same reason `DatabaseRecord` was wrong — it duplicated identity that `Page` already owns, and the mutual-exclusion rule was the symptom. A collection is now a **page that carries a schema**, and membership is plain `parentId`. Recorded rather than silently rewritten so the reasoning is not re-derived later.

## Context

The product objective is **Neuma**: one place where the organization's knowledge and its work are the *same fabric*. The value only appears when a task carries its own context and a document shows what work came out of it. A wiki next to a task tracker does not produce that — it produces two silos that happen to share a login.

The current implementation does not deliver that objective, because it has **two primitives instead of one**:

| | `Page` | `DatabaseRecord` |
|---|---|---|
| Rich content | yes (ProseMirror JSON) | **no** |
| Children / hierarchy | yes (`parentId`) | **no** |
| Versioning | yes (`PageVersion`) | **no** |
| Trash / restore | yes (`lifecycle`, `trashedAt`) | **no** |
| Live collaboration | yes (Hocuspocus/Yjs) | **no** |
| Addressable as a document | yes | **no** |
| Typed properties | **no** | yes (`propertyValues` JSON) |

The practical consequence: **a task cannot hold its own documentation.** Opening a card and writing the spec inside it — the single most-used gesture in this category of product — is not expressible.

Three further symptoms of the same root cause:

1. `DatabaseRecord.pageId` exists in the schema **with its own index** and is referenced nowhere in the backend, the portal, or the seeds. The superseded plan describes it as "may later reference a full Page body". The bridge was designed and never built.
2. `Database` carries a `spaceId`, but the portal exposes databases at a top-level `/databases` route, outside the space tree. Half the content therefore escapes the "spaces are folders" model.
3. Templates exist only at *database* creation (`apps/backend/src/modules/databases/templates/database.templates.ts`). There is no notion of creating a *page* from a template.

Separately, and independently of the database question, the product's stated first requirement — documents that reference and connect to each other — **is not implemented at all**:

- The editor schema has no mention node. Its only `embed` node targets external URLs (`provider` + `url`), not internal pages.
- There is no backlink model in the database or the backend.
- The slash menu exposes formatting only: bold, blockquote, lists, code, heading, italic, table, toggle, undo/redo.

Without links there is no graph, and without a graph this is a folder tree, not a brain.

## Design Analysis

**Where a page lives decides its properties.** A page's parent is exactly one of: a collection, another page, or the space root. If the parent is a collection, the page's property values conform to that collection's schema; otherwise its only property is the title.

This settles a design question we had open: **properties are not an intrinsic attribute of a "page type".** There is no type enum. A page's available properties are determined by *where it lives*. Move the page to another collection and it adopts that collection's schema. This is also what makes templates coherent — a template does not define a type, it defines which collection you are born into and what initial content you get.

**Everything as a block.** Text, images, a collection row and a page can all be modelled as blocks: an id, a type, properties, an ordered `content` array of child ids, and a single `parent` pointer. The content array (the render tree, pointing down) should stay **separate from** the parent pointer (permissions, pointing up), because resolving permissions by walking content arrays does not scale. Properties are decoupled from block type so a block can change type without losing data.

**One schema per collection.** A container could hold several independent schemas, but that is complexity with no payoff at our scale, so a collection carries exactly one.

**The link graph as a projection.** Backlinks can be derived instead of written by the editor: a worker reacts to page events, parses referenced page ids out of the ProseMirror document, and reconciles rows in a link table (source page ↔ target page). The editor side is a `Mention` node.

We already run this exact shape: `OutboxEvent` (`aggregateType`, `eventType`, `payload`, `status`, `nextAttemptAt`, `idempotencyKey`) is consumed by `search.projection.worker.ts` to maintain `SearchDocument`. Pages already emit `PAGE_CREATED`, `PAGE_UPDATED` and `PAGE_MOVED`. A link graph is therefore **a second projection off an outbox that already exists**, not new infrastructure.

## Alternatives Considered

- **Keep two primitives (status quo).** PRO: zero migration; the databases module works today. CON: the core objective is unreachable — a task can never hold knowledge. Rejected because it fails the reason the product exists.
- **Bridge only — wire the dormant `pageId`.** PRO: cheap; no data migration. CON: two primitives forever; "open the task and write the spec inside" stays a second-class join across two tables; every future capability (versions, trash, collaboration, mentions on a task) must be built twice or explicitly denied to records. Rejected as a local optimum that locks in the wrong shape.
- **Adopt a full block model** (a `Block` table as the write model; page content decomposed into rows). PRO: block-level permissions, block references, pages nested inside container blocks, and surgical transactional writes per block. CON: it replaces our ProseMirror-JSON-per-page storage, and Yjs collaborative editing is built on top of that document. Making blocks the write model means either rebuilding the live-editing layer or keeping the Yjs document as the real truth and projecting anyway — which is the chosen option below under a different name. Not rejected outright; deferred as the top of a ladder (see "Storage Ladder For Content").
- **Single page primitive with collections as schema + views (chosen).** PRO: one primitive means content, hierarchy, versioning, trash, collaboration, mentions and search apply uniformly and for free; matches how people already think about notes and tasks; deletes an entity rather than adding one. CON: a real migration, and the table/board views must be re-sourced onto pages.

## Decision

**`Page` is the only content primitive.** A document, a task, a project and a meeting note are all pages. If something cannot hold knowledge, it does not deserve to be its own entity.

Three concepts, no more:

- **`Space`** — a grouping container: ordering and the permission boundary. Nothing else. It does not own behaviour.
- **`Page`** — the primitive. Title, ProseMirror content, hierarchy, versions, trash/restore, collaboration. A page may additionally **carry a schema** (typed properties plus views), and when it does, its child pages are its rows.
- **`PageLink`** — the graph. A mention in page A's content produces a persisted directed edge to page B, which surfaces on B as a backlink.

**There is no `Collection` entity.** A collection is a page that carries a schema. This is the second application of the same principle that removes `DatabaseRecord`: a separate collection entity would duplicate a title, a place in a space, a position in the tree, a URL, permissions, trash and versioning — all of which `Page` already provides. `Database`, `DatabaseProperty` and `DatabaseView` do not get renamed to `Collection*`; the container dissolves, and only the schema tables survive, keyed by the page that owns them.

Two rules follow, and they are simpler than the ones in the first draft of this ADR:

1. **Membership is `parentId`.** A page is a row of a collection if and only if its parent page carries a schema. There is no `collectionId` column, and therefore no mutual-exclusion rule to enforce — the earlier draft's "`parentId` and `collectionId` are mutually exclusive" was a symptom of a forced model, not a real constraint.
2. **Schema conformance follows the parent.** A page whose parent carries a schema validates its property values against that schema. A page whose parent does not has a title and nothing else.

Two constraints this creates, stated so nobody discovers them by surprise:

- **Every child of a schema-carrying page is a row.** You cannot put a loose sub-page inside a board. This follows from rule 1, so it is coherent rather than arbitrary — but it is a real restriction.
- **A row's children are sub-pages of that row, not rows of the collection**, because their parent is the row and the row carries no schema. This falls out of rule 1 rather than needing its own mechanism.

The collection page also gains something the separate-entity model could not offer: **its own body**. "How we use this board" lives in the content of the board page itself, instead of needing a companion document.

**Content stays as ProseMirror JSON on the page row, and blocks become a projection over it.** We adopt the *conceptual* block model (one primitive, parent pointer, properties decoupled from content, links as a graph) without making a block table the write model. See "Storage Ladder For Content" below for the target level and the reopening condition.

**The link graph is an outbox projection**, following the same pattern as search: page events already on the outbox are consumed by a worker that parses content, resolves referenced page ids, and reconciles `PageLink` rows. Authorization is enforced at read time against the space boundary, never at write time in the editor — a link must not leak the existence of a page the reader cannot access.

`DatabaseRecord` is removed as an entity. Its rows become pages.

## Storage Ladder For Content

The block question is not binary. It is a ladder, and each rung is independently useful. Recording it here so a future reader does not re-derive it and so the reopening condition is unambiguous.

| Level | What it is | What it unlocks | Cost |
|---|---|---|---|
| 1 | ProseMirror JSON per page *(state before this ADR)* | Whole-page reads | — |
| 2 | + stable ids on block nodes | Citations and anchors that survive edits | Very low |
| 3 | + `PageBlock` as a **projection** | Block-granular retrieval, cross-page queries over content, agent-directed edits | Medium |
| 4 | `Block` as the **write model** | Per-block permissions, real pages nested inside container blocks, per-block transactional writes | High |

**Target: level 3.** Level 2 lands in Phase 1 because it is nearly free now and expensive later — adding node ids after content exists requires backfilling every stored document, and any citation minted before the backfill is worthless.

Level 3 keeps the ProseMirror document plus Yjs as the source of truth and derives `PageBlock` rows through the existing outbox projection. Agents then **read** from block rows (granular, citable, queryable with plain SQL — *"every unchecked to-do in the workspace"* becomes an indexed query instead of parsing every document's JSON) and **write** through the collaborative document, where Yjs merges their edits with concurrent human typing. This is the capability that matters for operating the brain programmatically, and it does not require blocks to be the write model.

Level 3 is deliberately a stepping stone, not a dead end: if level 4 is ever justified, blocks will already be modelled with stable ids, types, parents and ordering, and the projection will be proven. Promoting that table to the write model is a bounded migration; building it from scratch while simultaneously re-architecting live editing is not.

**Reopening condition for level 4:** a real requirement for per-block permissions, or for pages nested inside container blocks as true containment rather than as references. Retrieval granularity, citation stability and agent tooling are explicitly *not* reasons to climb to level 4 — level 3 serves them.

**Relational storage is sufficient at every level.** Partitioning a block store by workspace only pays off at multi-tenant scale far beyond a single-company deployment. At our scale the block count is small enough that ordinary indexing suffices, and moving to a graph store would cost transactional integrity with the rest of the domain while buying nothing — the access patterns are "fetch an ordered subtree" and "traverse links", both of which relational handles well.

## Canonical Source Of Truth For Page Content

Page content currently has **two persistence paths**, and no document states which one wins:

- the editor's autosave calls `updatePageAction`, which writes `Page.content` and appends a `PageVersion`;
- Hocuspocus `onStoreDocument` writes the Yjs state to `CollaborationSnapshot`.

This ambiguity is tolerable while `Page.content` is the only thing anything reads. It stops being tolerable the moment a projection derives from page content, because the projection must choose a source — and choosing the wrong one means the block index, the link graph and search silently disagree with what the user sees while editing.

**Decision: `Page.content` is the canonical source of truth for content.** `CollaborationSnapshot` is live-editing session state, not the record of the document. Every projection derives from `Page.content` and from the `PAGE_*` outbox events that accompany its writes.

The consequence to accept: while a collaborative session is open, projections reflect the last autosaved state rather than the in-flight keystrokes. That is correct behaviour for search, links and block retrieval — indexing unsaved intermediate states would produce noise — but it must be a stated property, not a surprise.

The consequence to guard: if a Yjs session's state can ever diverge from `Page.content` without an autosave reconciling it, the canonical record is wrong. Autosave already runs on content change, so this holds today; any future change that decouples them must revisit this decision.

## Consequences

- **`DatabaseRecord` disappears.** Everything it did, `Page` already does better. The dormant `pageId` column disappears with it — the bridge is unnecessary once there are not two shores.
- **The table and board views survive.** `apps/backend/src/modules/databases/domain/database.views.domain.ts` keeps its grouping logic; only its data source changes from records to pages. This is the cheapest part of the migration and should not be rewritten.
- **Search unifies.** `SearchSourceType.DATABASE_RECORD` becomes unnecessary; everything indexes as `PAGE`. The projection worker loses a branch rather than gaining one.
- **Collections move under the space tree automatically.** They are pages, so they are already in the tree; the top-level `/databases` route is retired and a collection is reached exactly like any other page. Nothing special is built to make this true.
- **`Database` is deleted, not renamed.** `DatabaseProperty` and `DatabaseView` survive as schema tables keyed by the owning page. A collection needs no id, name, slug, lifecycle or space of its own — the page supplies all of them.
- **"Rows of collection X" is `WHERE parentId = X`**, served by the existing `@@index([parentId, order])`. No new index and no join table.
- **Inline collections map cleanly.** A collection rendered inline inside another page is a content node referencing the collection page, the same mechanism as mentions and file blocks — not a second storage mode.
- **Templates become page-level.** Creating a page offers a template that seeds its collection membership, property values and initial content. `database.templates.ts` becomes the seed of collection schemas rather than a database-creation-only path.
- **Mentions and backlinks enter the current scope** and must be removed from the future scope list.
- **A property schema change now affects pages.** Adding a `required` property to a collection makes existing member pages non-conforming. This tension is real and is not solved by this ADR — see Risks.
- The board view's hardcoded `groupBy: 'status'` becomes a genuine bug surface once collections are user-defined, because a custom collection may have no `status` property.

## Risks

- **Schema evolution over existing pages.** Making a property required, or changing its type, invalidates pages already in the collection. There is no property versioning and no row migration. This is structural: it forces a decision on whether the schema is *authoritative* (and then changes must migrate member pages) or *advisory* (and then validation is best-effort and the UI must tolerate non-conforming pages). Deferred deliberately, but it must be decided before collections are exposed to end users, not after.
- **Migration is destructive by design.** Turning records into pages is not reversible without a backup. Verified on 2026-08-05 against the running database: 1 `Database` and 3 `DatabaseRecord` rows exist, all three hardcoded in `packages/db/prisma/seed/demo.seed.ts`. There is no user-authored record data, so the step is a seed rewrite rather than a migration. Re-verify with a `count(*)` before executing if the deployment has since been used in earnest, and take a dump regardless.
- **Link permissions.** A backlink list is an information-disclosure surface: naively rendering "3 pages link here" tells a viewer that pages exist in spaces they cannot read. Every graph read must filter by the reader's space access, and counts must be computed post-filter.
- **Mention labels are a frozen copy of the target's title, stored inside the source page's content.** Inserting one is not an escalation — whoever inserted it could read the target and could have typed the title by hand. The tension is temporal: permissions change and the snapshot does not. A page moved into a restricted space keeps leaking its old title through every document that mentions it, with nobody having acted. This is structural, because the whole point of denormalizing the label is to render without resolving the target. The mitigation is redaction at serve time — replace the label whenever the reader cannot access the target, server-side, before the payload leaves — and it must cover exports and agent-facing reads, not just the editor. Ignoring it means space visibility silently stops being retroactive.

## Governance

Phases land in the order defined by `docs/superpowers/plans/2026-08-05-neuma-single-page-primitive.md`. Phase 1 (graph) is independent of Phases 2 and 3 and may ship alone. `DatabaseRecord` must not gain new capabilities in the meantime — any request to add versioning, trash or collaboration to records is a signal to accelerate Phase 3, not to duplicate `Page`.
