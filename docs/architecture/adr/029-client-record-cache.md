# 029: Local record cache and client mode

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `025-views-as-reducer-queries.md`, `026-collection-change-notices.md`
**Precedes:** nothing in the plan `2026-10-20-daily-work.md`. It closes the deviation that ADR 026 noted in its implementation (repositioning locally).

## Context

Today the browser stores nothing between visits. A page or a view is requested from the server every time it is opened, and a collection is drawn on the Next server (server components with per-space cache). When another person moves a card, the ADR 026 notice arrives, the portal invalidates the space's cache with a server action and the view is queried and drawn in full. ADR 026 noted this as a deviation. There is no row store on the client where a card could be repositioned, so the filter, the sort and the exceptions table of that ADR were left without an owner.

What a person writes does not survive a close either. The editor's transaction queue (`createTransactionQueue`) lives in memory. If the network drops, it retries with the same transaction id, which the server answers from what it stored, but if the tab is closed before the network returns, what was written is lost without notice.

The model being sought is this. A record cache by table, id and version, persisted in SQLite over WebAssembly with OPFS. Reactive queries that re-run when the tables they read change. Optimistic transactions that are saved in a persistent queue before being sent. On a failure, the client re-requests the touched records instead of undoing with inverse operations. A client mode for small sets, where the browser filters and sorts with the same engine as the server.

What already exists and is reused.

- `createBlockStore` stores per block the content, the version, the role and a Yjs document. It already compares versions, buries and revives blocks and knows what it is missing (`findBehind`).
- The live channel already has `sync` by versions, with `revoked` in the response, and `transactions` with idempotent ids. The collection notices (`collection-changes`, `collection-resync`, `collection-revoked`) exist since ADR 026.
- `POST spaces/:spaceId/pages/:pageId/changes` returns changed rows, ids sent to the trash, `total`, `isReset` and an opaque cursor by `changeXid`. Today the MCP uses it.
- The `packages/shared` engine (`matchesPageFilter`, `comparePageRowsBySorts`, `computePageCalculation`) is the oracle of the semantics and already has a parity test against SQL.
- Portal rule. A client component never calls the backend with `fetch`. Reads and batch writes go through server actions. The live channel is the exception, because it is opened with a single-use token that an action delivers.

### Measurement

Done for this ADR in Chrome (Playwright, clean profile, localhost), with 386-byte JSON rows (status, number, multi-select, person, text). SQLite WASM is `@sqlite.org/sqlite-wasm` 3.50.4 with the `opfs-sahpool` VFS in a worker, which does not require the COOP and COEP headers. IndexedDB is the native one, with a `row` table by `id`. "In memory" is the `packages/shared` engine over the already loaded array, bundled with `bun build`.

| Measure | 10,000 rows | 50,000 rows |
|---|---|---|
| IndexedDB, write everything in one transaction | 226 ms | 1,404 ms |
| IndexedDB, open the database | 35 ms | 122 ms |
| IndexedDB, read everything (`getAll`) on a cold start | 43 ms | 217 ms |
| IndexedDB, 50 reads by id | 2 ms | 3 ms |
| SQLite WASM, load the WASM and start the VFS on a cold start | 38 ms | 39 ms |
| SQLite WASM, insert everything in one transaction | 150 ms | 840 ms |
| SQLite WASM, read everything and convert from JSON | 54 ms | 261 ms (60,000 rows) |
| SQLite WASM, filter by status and number, sort, 50 rows | 15 to 20 ms | 94 to 97 ms (60,000 rows) |
| SQLite WASM, count per group | 19 to 22 ms | 126 to 135 ms (60,000 rows) |
| In memory, the same filter and sort, 50 rows | 3.5 ms | 9 to 13 ms |
| In memory, `OR` filter with list contains | 3.6 ms | 7 to 9 ms |
| In memory, count per group | 0.3 to 1.2 ms | 1.6 to 2.7 ms |
| Space used (IndexedDB / SQLite with its index) | 5.2 MB / 11 MB | 23 MB / 39 MB |

What the figures say. Cold start is similar (IndexedDB opens and reads 10,000 rows in about 80 ms; SQLite takes about 40 ms to be ready and 54 ms to deliver the rows). What decides is the query. With the shared engine over memory, filtering and sorting 10,000 rows costs 3.5 ms and 50,000 cost 13 ms. SQLite resolves them with `json_extract` in 15 to 20 ms and 95 ms, because the cell is JSON and there is no column to index. To be faster it would have to have one column per property, which is the typed-values model that ADR 025 ruled out. Local computation is not the limit of client mode. The limit is bringing the rows, which at about 390 bytes is 3.9 MB per 10,000.

The figures are from a development machine and are repeated in the implementation's performance tests. The test bench is disposable and does not go into the repository.

## Alternatives Considered

### Where it is stored and queried

- **SQLite WASM with OPFS.**
  - PRO: SQL queries and reactivity by tables. Row by row and with indexes, it scales to millions.
  - CON: a new dependency with 1.3 MB of WASM and JavaScript, a worker and a VFS. The semantics of filters and sorts would be in a third implementation (`json_extract`), or everything would have to be loaded into the TypeScript engine, in which case SQLite would only be storage. Slower than memory for the queries we care about (15 to 20 ms against 3.5 ms with 10,000 rows) and larger on disk (11 MB against 5.2 MB). It is worthwhile when the query engine is SQL, and ours is that of `packages/shared`.
- **IndexedDB as persistence and an in-memory store as the query engine (chosen).**
  - PRO: no dependencies. The query engine is the one the server already tests. Start measured at 80 ms with 10,000 rows. The semantics stay in a single place.
  - CON: queries live in the tab's memory, so the size that is loaded is bounded (see "Size and eviction"). Without indexes, a filter walks all loaded rows (3.5 ms with 10,000 rows, 13 ms with 50,000). A small IndexedDB wrapper has to be written.
- **Memory only, no persistence.**
  - PRO: the simplest.
  - CON: it does not paint on open, does not keep what was written offline and does not serve the two needs of the stage.

### What is stored

- **Whole pages serialized.**
  - PRO: one key per page.
  - CON: an edit by someone else forces rewriting the page, and two pages that share a block duplicate it.
- **Records by `id` and version, plus query results as lists of ids (chosen).**
  - PRO: a row of a collection is stored once even if it appears in three views. It is updated with `{ id, version }`, which is what ADR 026 already sends. It matches the block store the editor already has.
  - CON: a stored result is a list of ids that has to be resolved against the records, and a missing record forces revalidation.

### Client mode

- **Always query on the server (today).**
  - PRO: nothing new.
  - CON: each change of filter, sort or grouping, and each "load more", is a round trip. With rows already on the client it would not have to be.
- **All collections in client mode.**
  - PRO: a single path.
  - CON: a 100,000-row collection does not fit in the tab nor is it brought in a reasonable time. Relations, rollups and search need data or normalization that the client does not have.
- **Client mode under a measured threshold, with the server above it (chosen).**
  - PRO: the small feels local (filtering and reordering without network) and the large stays bounded by the server. The client uses the same engine as the server, tested by parity.
  - CON: there are two paths to maintain and test. A threshold that will have to be adjusted with real data.

### What a failing queue does

- **Undo with inverse operations.**
  - PRO: it does not request anything again.
  - CON: the inverse of an operation relative to a neighbor that someone else has already moved is incorrect, and a transaction rejected by permissions has no previous state to restore.
- **Re-request the touched records and show what was not applied (chosen).**
  - PRO: the local state becomes that of the server without guessing. What was written but not applied is kept in view and not lost.
  - CON: one more round trip per failure, and an interface for rejected changes.

## Decision

### In-memory store and IndexedDB persistence

The portal has a per-user record store, in memory, with persistence in IndexedDB. It is the same one the editor already uses for blocks, extended instead of a second store. `createBlockStore` keeps its contract and gains per-id subscriptions (`subscribe(id, listener)` and a version per record) so that React reads with `useSyncExternalStore`. A card that changes repaints only that card.

One IndexedDB database per user and workspace, `neuma-cache:<workspaceId>:<userId>`, with these stores.

| Store | Key | Contents |
|---|---|---|
| `records` | `id` | `{ id, version, spaceId, parentId, alive, body, readAt }`. The body is what `sync` already delivers (properties, format, children, role). Live text remains in Yjs in memory. |
| `results` | `viewId` + query hash | `{ ids, groups, nextCursors, total, viewVersion, schemaVersion, changesCursor, savedAt }`. It is the list of ids the query returned, without the records. |
| `meta` | fixed key | `{ cacheVersion, userId, lastValidatedAt }`. |
| `transactions`, `rejected` | autoincrement | The persistent queue (see below). |

- The query hash covers `viewId`, the view version, the schema version, `quickFilter`, `search`, `sorts` and the zone. If any of those changes on revalidation, the entry is discarded. The records stay, because they are still valid by their version.
- `cacheVersion` rises when the shape of what is stored changes. The cache is disposable. A new version deletes `records` and `results` and keeps `transactions` and `rejected`, which are the person's work and are migrated, not discarded.
- If IndexedDB is not available (private window, site data blocking), the store works in memory only and the interface says so when there are pending changes ("they will be lost if you close the tab"). It never goes mute.
- No dependencies. The IndexedDB wrapper is a small module of `apps/portal/modules/pages/local-cache/`, with its types, constants and pure functions like the rest of the portal.

### Size and eviction

- Cap per user: the lesser of 50 MB and 10% of the quota reported by `navigator.storage.estimate()`. At 390 bytes per row, 50 MB is about 100,000 rows. Above 90% of the browser's quota nothing new is persisted.
- Eviction by use. The unit is the collection or the page. Each stores `lastAccessAt`, and on passing the cap the least recent are evicted until it drops to 80%. The records that some `results` entry still cites are evicted together with it.
- A `QuotaExceededError` evicts the least recent 20% and retries once. If it fails again, the store stays in memory and leaves an `ERROR` with a trace.
- An entry not validated in 30 days is discarded on open. It is the limit on how long something can be shown that the person could no longer read if they were connected (see "Revocation").
- What is not persisted: attachments (the browser already caches them over HTTP), text search results and collections above the cap of rows loaded in memory (see "Client mode").

### Per-user isolation and sign-out

- A browser profile stores the cache of **a single user**. On sign-in, the portal deletes any `neuma-cache:*` database that is not that of the user signing in. A person who uses a shared browser never sees another person's data: even if the previous session ended by expiry and not by signing out, the next sign-in deletes it before painting anything.
- Signing out deletes the user's database before redirecting. If there are pending unsent transactions, the portal shows them and asks for confirmation ("You have N unsent changes; if you sign out they will be lost"). Confirming discards them, and there is no other path in which text is lost without the person having decided.
- A session revoked by token version (ADR 018) closes the browser session, and that closing deletes the cache all the same.
- The cache is not encrypted on disk. The keys would have to live in the same JavaScript that reads it, and encryption would not protect from whoever can run code on the page or from whoever has the disk with the profile open. The protection is the browser profile, which already contains the session cookies. It remains as an accepted risk.

### Paint from cache and revalidate

When opening a page or a view.

1. `results` and the `records` it cites are read and painted immediately, with a discreet "updating" mark.
2. It revalidates. For a collection, `changes` with the stored `changesCursor`. For a page, `sync` with `{ id, version }` of the blocks held.
3. What arrives is applied (new or changed rows, `trashedIds`) and repositioned locally (see below). The new cursor is stored.
4. The full query is repeated, and the entry replaced, only if `isReset` is true, if the view or schema version changed, if `total` does not match the local count of visible rows (a sign of a row that was hidden), or if the entry did not exist.
5. The collection channel is subscribed. Each reconnection repeats steps 2 to 4, instead of always repeating the query as ADR 026 does.

The portal builds the first visit on the server as today and seeds the store with what the server read. Later visits paint from the cache while the server route has not yet responded. For that, the body of the view (table, board, gallery, list, calendar, timeline, chart) becomes a client component that reads from the store, and the collection route uses that same component in cache mode as its `loading`. Bar, tabs and configuration remain server components.

Agents do not use this cache, because they have no browser. They keep using `query_collection` and `collection_changes` from ADR 025 and 026, which are already their "give me only what changed" path. The cache belongs to the portal, but it changes nothing of what an agent sees.

### Client mode

A collection is opened in client mode when all three conditions are met.

1. It has at most **10,000 rows visible to whoever opens it** and its load does not exceed 6 MB. The count comes from the `COUNT_ALL` aggregation of ADR 025 and is stored with the entry.
2. The filter and sort of the view, the quick filter and the requested columns do not use relations to unloaded rows, rollups or formulas (stage 10 declares what each uses).
3. There is no active text search. The accent and case normalization of `Block.text` is on the server, and the ADR 026 table already says to repeat the query in that case.

In client mode the server delivers **all the rows** of the collection with their values, in pages of 1,000 through the `results` reducer (today the cap per page is 100, and 1,000 is the per-response cap that ADR 025 already fixes; the change is to allow that page when the request asks for all properties). All rows go through the same denied set and the same permission control as any query, so the client never receives a row it cannot read. With the rows loaded, the browser does with the shared engine everything the server does today for that view.

- Filter (`matchesPageFilter`), sort (`comparePageRowsBySorts`, with `manualOrder` included: it travels in full because the collection is small and its cap is 20,000 ids), group, count and compute table footers (`computePageCalculation`).
- Changing filter, sort, grouping or "load more" makes no requests. Only the local computation changes.
- Filters with relative dates and "me" are evaluated with the client's zone and user, as ADR 026 already anticipates.

Above the threshold, or when condition 2 or 3 stops being met (the person types in the search box, adds a filter by relation), the view moves to the server path without flicker. The already loaded rows are kept as a record cache and the list of ids is requested again with the reducer. With more than 10,000 rows, no row is stored for client mode. Only those that each `results` delivered are stored.

**Measurement.** Compute does not set the limit (10,000 rows filter and sort in 3.5 ms, 50,000 in 13 ms). What sets it is the cost of bringing all the rows. The initial value of 10,000 is the size of the table that the plan says to measure. It is confirmed in the implementation with the real endpoint (time to paint and response weight) and corrected here with a note if the p95 of the first load exceeds 1.5 s.

### Local repositioning on collection notices

With the cache and the per-id store, the client does what ADR 026 described and did not implement.

1. `collection-changes` delivers `{ id, version }`. The client discards those it already has and batches in 150 ms.
2. It requests those records by id in one request (cap of 200 ids, as ADR 026 already decided) and writes them to the store. Only the components that show those rows repaint.
3. It repositions each row with the shared engine, with the ADR 026 exceptions table unchanged (search, relations, rollups and formulas, manual order with a greater view version, `collection-resync`, stale cursor, batch of more than 200). In client mode the row is always loaded and the two "row is not loaded" lines do not apply.
4. Group counts are adjusted on moving and verified with a single `aggregations` request per burst. In client mode they are recomputed locally.

The `refreshPageCollectionAction` action and the server cache invalidation stop being the response to a notice. They remain for the first load and for the cases in the exceptions table.

### Persistent transaction queue

Each transaction is saved in IndexedDB's `transactions` **before** being sent, and deleted on receiving the server's response. Its `id` is the one the client already generates, and is the one sent on each retry. The server already answers a repeated id from what it stored, so a resend after closing and reopening the tab is safe.

- **States.** `pending`, `sending`, `rejected`. Text operations carry the Yjs update already computed against the last confirmed version, and can be resent without the document in memory. For each text property touched, the resulting plain text (`preview`) is also stored so it can be shown.
- **Only one tab sends.** A Web Locks lock (`neuma-queue:<user>`) chooses the tab that empties the queue, and the others write to IndexedDB and notify through `BroadcastChannel`. If the owning tab closes, another takes the lock and continues in the order of the autoincrement key.
- **Retries.** Today's wait times are kept (`computeCollaborationReconnectDelayMs`, the rate limit's own wait). Without a connection nothing is lost. When the browser is opened again, the queue starts on its own when there is a session and network.
- **Visible state.** The indicator of the editor and the views gains "Offline, N changes pending" and "N changes not applied". A change that is in the queue is seen applied on screen (optimistic), and a discreet mark distinguishes it from the confirmed.
- **Rejection.** If the server rejects a transaction (permissions, validation, entity already deleted), the client (1) moves it to `rejected` without deleting it, (2) re-requests the records it touched, through `sync`, and leaves the store equal to the server, (3) holds the following transactions, because they were written on top of what that one assumed, and presents the person with each unapplied change with its text and the options "copy" and "discard". Retrying the rest is the person's decision, not automatic. Text is never discarded without her deciding. There are no inverse operations.
- **View writes.** Today a cell change, a card move and a new row go through server actions and not through the transaction channel. In this stage, those that the channel vocabulary allows a client go through the queue: changing a cell (`set`), reordering (`listAfter`, `listBefore`) and creating a row. Those that ADR 025 reserves to the backend (`changeValueList` for multi-select and person, `move-row` with multi-value values) remain inline and, offline, the interface undoes them and says so. Extending the client's vocabulary requires an ADR of its own.
- **Without IndexedDB.** The queue lives in memory as today and the notice says so.

### Security and revocation

- **The cache obeys the server, not the other way around.** `collection-revoked`, `revoked` in a `sync` response and a 403 or 404 when reading a page immediately purge those records from the store and from IndexedDB, and the `results` entries that cite them.
- **`collection-resync` and hidden row.** On receiving `collection-resync`, the client sends its stored ids and versions of that collection (in batches of 1,000) in a `sync`. The rows that the reader can no longer read come back in `revoked` and are purged. It is the same path that page revocation already uses, without a new route. In client mode, in addition, the full list of rows that arrives replaces the previous one and those that are missing are deleted.
- **Loss of access to a space.** On sign-in and on reconnecting, the portal compares the spaces it can see with those it has in the cache and purges those it no longer can.
- **Offline.** A permission removed while there is no network cannot be known. The cache shows what was last seen, marked "offline", for up to 30 days. Past that deadline, or on first contact with the server, it is revalidated or purged. It is a limitation, and it is not hidden.
- **Counts.** `total` of `changes` remains the count of readable rows. If it does not match the local one, the query is repeated.
- **Pending writes that can no longer be applied** (the person lost the permission) go to `rejected` and are not resent.

### Errors and observability

- Every IndexedDB failure, cache write or read is a `Result` with a code or an `ERROR` with a trace. Never an empty cache in silence.
- Each full repetition of a query is logged at `WARN` with its cause (the ADR 026 table plus `cache-miss`, `reset`, `total-mismatch`, `cache-version`), to measure how much each exception costs and how much is saved.
- The ADR 026 loop guard (more than 5 queries per second per view) is kept.
- The portal records the origin of each paint (`cache`, `server`) and the time until each.

## Consequences

- Positive:
  - opening an already visited page or view paints without waiting for the server, and revalidation sends only what changed;
  - moving a card in one window repositions it in another person's window without a query or redraw, and only that card repaints;
  - in collections of up to 10,000 rows, filtering, sorting, grouping and counting is instantaneous and without network, with the same engine as the server;
  - what is written offline survives closing the tab and is resent on its own, with idempotent ids;
  - a rejection neither loses text nor leaves the client in an invented state;
  - no new dependencies.
- Negative:
  - the body of the views stops being drawn on the server and becomes a client component, which touches the table, board, gallery, list, calendar, timeline and chart;
  - there are two row-reading paths (client and server), with an equivalence test that watches them;
  - the browser stores user data unencrypted until sign-out, with an accepted risk;
  - a permission removed offline remains visible until the network returns or 30 days pass;
  - a collection of up to 10,000 rows is downloaded in full the first time, about 4 MB;
  - a persistent queue and a lock between tabs are new pieces to test;
  - multi-select and person changes in views still do not work offline.
- Changes to existing behavior:
  - the client stops redrawing the view from the server on every collection notice;
  - signing out with pending changes asks for confirmation;
  - signing in as another user deletes the previous user's cache;
  - the `results` reducer admits pages of up to 1,000 ids when everything is requested.

## Governance

- Unit tests, written first, of the store and its persistence with a fake in-memory IndexedDB. Merge by version, eviction, `QuotaExceededError`, discard on query change and on `cacheVersion` (keeping `transactions`), and purge by `revoked`.
- Equivalence test. For generated collections, the client-mode result matches id by id with the server's `results` reducer for each type and operator of ADR 024, in four time zones, with relative filters and "me". A new operator does not enter without that case.
- Exceptions table test. Each row repeats the query and the other changes do not repeat it.
- Queue tests. It persists before sending, resends with the same id after reopening, a single owner per lock, rejection re-requests the touched records and saves the text, and without IndexedDB it warns.
- Security tests. A user B who signs in cannot read anything of A's, signing out deletes everything (with confirmation if there are pending changes), `collection-revoked` and `collection-resync` purge the hidden row without the client sending anything it did not have, and the count does not reveal rows.
- Browser measurements, repeated in the performance tests. Opening a 2,000-card board from cache (time to paint with and without network), and a 10,000-row table in client mode (first load, and filter, sort and group without requests). They fail if the local filter and sort exceed 50 ms or if the main thread is blocked for more than 50 ms per long task.
- Verification with two people in the browser. Offline editing and reconnection, revocation that purges the cache, and a card that repositions without redrawing.
- Business rules (`rules:add`): the cache is per user and is deleted on sign-out, paint from cache and revalidate by versions, the client mode threshold, pending writes are never discarded without the person's decision, and what is not readable is purged.
- A change to the 10,000-row threshold, to the vocabulary of writes the client can enqueue or to where things are stored is made with a note in this ADR or with a new one.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21 (approval). In-memory store with IndexedDB and the shared engine are approved, without dependencies. The 10,000 visible-row threshold is confirmed against the real endpoint, and this note is corrected if the p95 of the first load exceeds 1.5 s. Allowing pages of 1,000 ids in `results` when all properties are requested is approved, with a minimal backend change. **The first load without cache is still drawn on the server**, with no blank page or cascade of client requests. That server read seeds the store and from there the store drives the view. The scope of the queue, the confirmation on sign-out, the 50 MB cap and the 30-day deadline remain as they are. **Formulas and rollups are computed on read** (stage 10, no server cache). Client mode stays off if a formula or a rollup is in the filter, sort or grouping, and the computed values that are shown are **never trusted from the cache**. They are treated as expired and always revalidated on open.
- Modified: 2026-10-21 (implementation, first delivery). Done and verified in the browser with two people: the editor's persistent queue (saves to IndexedDB before sending, resends with the same id on reopening, sets aside what is rejected), the local placement of board cards with the shared engine and the ADR 026 exceptions table (the view is requested from the server only for those cases, each with its reason in a `WARN`), deleting the copy on sign-out (with a notice of unsent changes) and deleting another person's copy when opening one's own. Deviations. (1) The database is one per person (`neuma-cache:<user>`), without the workspace in the name, because the backend resolves a single workspace per person. (2) The lock between tabs is not used: a duplicate resend is harmless because the server answers a repeated id from what it stored, so two tabs that resend the same thing apply nothing twice. (3) The queue stores an empty `previews`: the text of what is rejected is not shown yet. (4) The `changes` cursor comes from the same snapshot as the rows (`PageQueryResult.changesCursor`), with no backend change. Pending: painting from the cache before the server responds (the record and result store exists and is tested, but no view reads it yet), client mode (only the `decideClientMode` decision exists, with no data path or the change of the `results` cap to 1,000), moving the views' writes through the queue, the rejected changes panel and local placement in the other views (table, list, gallery, calendar, timeline), which today are drawn on the server.
- Modified: 2026-10-21 (second delivery). `previews` is filled and the rejected changes panel is shown in the editor, with the words of each change, the reason, "Copy text" and "Discard" (verified in the browser: an edit made offline on a page that was later sent to the trash appears in the panel with the full paragraph, is copied to the clipboard and is discarded). The text comes from the editor at the moment of making the transaction and not from the Yjs update, because that one only carries what was written since the last confirmation, chained to characters it does not carry. **Lock between tabs: omitted, and documented.** Resending is harmless (the server answers a repeated id from what it stored) and two tabs never show contradictory states of what is pending: the save state each one shows is that of its own connection, and what one restores from disk it sends in the same order in which it was made, so at most both say "saving" at once and then "saved". Still pending, and postponed with the rest of client mode: moving the views' writes through the queue. Today a cell, a card or a new row is sent through server actions, offline they fail with a notice and undo the screen, so no text is lost silently, but it is not saved either. Moving them requires a vocabulary of operations for the client (ADR 025 reserves `changeValueList` and per-cell patches to the backend), a transaction session in the collection view and the local optimistic state that only exists when the views' body reads from the store.
- Modified: 2026-10-21 (third delivery: views body from the store). Done. (1) Table, list, gallery, board, calendar and timeline are client components that read a row store; the first load is drawn by the server and seeds the store, and from there the `changes` notices place each row with the shared engine and the ADR 026 exceptions table (manual order re-reads only the affected columns; the count of rows without a date is re-read with an action). **The chart is still drawn on the server**: it only paints counts and is refreshed with the full redraw. (2) Painting from the cache: the page's `loading.tsx` draws the last saved view for that query, marked "updating", and brings it up to date with `changes`; on a reset, an unknown cursor or a place that depends on the server's order, the copy is left and the server's response takes over. Computed values are never stored. It does not appear on a full reload, because Next only shows `loading.tsx` on client navigations. (3) Client mode with `decideClientMode`: all the rows are read once (pages of 1,000 ids with `results`, cap raised from 100 to 1,000 only for that reduction) and the browser filters, sorts, groups and counts with the shared engine; the integration test `page-query.local-parity` compares 10 views, 4 time zones and 130 rows against the server. A grouping by person, date or number, a search, and formulas, rollups or relations in the filter or sort are rejected. The quick filter still travels through the URL, so changing it still navigates. (4) View writes through the persistent queue: single-value cell, moving a card or row without lists and new row are shown instantly, saved in IndexedDB before being sent and resent with the same id; the backend accepts `id` on create and responds with the already created page if repeated (the minimal backend change, with tests). List cells (multiple options, people, relations, files) and moves with lists need a connection and say so. **Deviation:** a rejection does not hold the following writes of the queue, unlike the editor's text, because each cell or place is independent; the rejection goes to the panel and the view re-reads the rows. Another deviation: new rows made offline appear in the store only in client mode. Measurement in the browser (production build, administrator account, 12,000 pages in the space): opening a 2,000-card board by navigation from the cache draws at 280 to 340 ms after the click (first card at 520 to 720 ms) and the server's response arrives at 3.7 s; the local engine takes 1 ms to filter, 8 to 13 ms to sort and 8 ms to group and count 10,000 rows (median and p95 of 15 runs, Bun). **The first load of the 10,000-row table takes 7.6 to 9.3 s (p95 above 1.5 s)** and it is the server read, not client mode: the space's page tree (1.8 s), the collections (2.1 s) and the query count (1.6 s) weigh, all unrelated to this stage; the 10 pages of client-mode rows arrive after the first draw, about 70 to 95 ms each. This is noted as debt for the server performance stage. Verified with two people: a card moved by the other is repositioned without reloading in board and table at 334 ms; a row sent to the trash disappears from both and from IndexedDB; an offline edit stays as "1 change waiting to be sent", is sent when the connection returns without reloading and the server confirms it. Loss of access through permissions (instead of the trash) is only covered by unit tests.
- Modified: 2026-10-21 (fourth delivery: corrections after the review). (1) **Calendar and timeline are revalidated like the rest**: the painted copy requests `changes` from its cursor and places the rows with `placeChangedWindowRows` (the same engine as the live one); if something changed, it re-reads the count of rows without a date with an action, and if the cursor was reset, the window was truncated or there is a search, it leaves the copy and the server's response takes over. (2) **The version of each stored record is that of the block on the server** (`Block.version`, which grows with each change): `PageRowSummary` and `PageQueryRow` now carry it as `version`, and the cache no longer invents client stamps; optimistic rows not yet confirmed carry 0. That is why `sync` with `{ id, version }` and the store's merge by version tell the truth. (3) **Row closed to a person.** A real test with two people showed a gap: when removing a row's permission, the server no longer drew it, but its record stayed in IndexedDB (the `changes` notice never names a row that the reader cannot open). Now, when a new read stops citing rows that the copy stored for the same question, the browser sends those rows with their versions to `sync` (500 at a time) and deletes those that come back in `revoked`; those that only left the filter are kept, and if the server does not respond nothing is deleted. Verified with a second person in her own context: the closed row disappears from the view and from IndexedDB, the others remain stored, and on closing the entire collection the view says the address does not exist and all its rows are deleted from the cache. (4) **First load of the 10,000-row table, causes.** The collections read took 1.8 s per call (3 calls per load) because it listed with their full document all the pages in the space just to keep the collections; now it requests only the space's collections and takes 19 ms. The row query, the count and the cursor take 24 to 39 ms separately: the 1.5 s that were seen was waiting behind the heavy reads in the same process. It remains unresolved, and it is a design change and not a fix: the page tree returns the 12,000 pages of the space with their content (10 MB, 1.0 s of server CPU, twice per load) and the page route hands that whole list to the client component (40 MB document); with a small space the same table paints in 1.3 to 1.4 s. A lazy page model is needed (roots, open path and children on expand, and the content of other pages on demand, because synced blocks read that of other pages). It remains as explicit debt.
- Modified: 2026-10-21 (fifth note). The debt of the fourth note, the lazy page model, is resolved in `030-page-tree-on-demand.md`: the page route stops delivering the space's list and the document drops from 18 MB to 0.37 MB in that ADR's measurement.
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 11)
- The measurement was done with a disposable bench in the session's temporary directory and is repeated in the implementation.
