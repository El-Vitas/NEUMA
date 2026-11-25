# 026: Change notices per collection

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `025-views-as-reducer-queries.md`
**Precedes:** stages 7 (missing views) and 10 (rollups and formulas) of the plan `2026-10-20-daily-work.md`, which declare what they can evaluate locally.

## Context

The live channel (`block_versions`, `NOTIFY` after each transaction) notifies per page: each socket subscribes to a page and receives `{ id, version }` of the blocks of that page it can read. An open collection view does not find out that a row changed, unless the row is the open page. Today a person sees a card move only if they reload, and an agent watching a collection has no other way than repeating `query_collection` and comparing.

The model being sought is this. Each collection has a channel with `{ rowId: version }`. When a card is moved, the other tab receives a notice per changed record, requests the new records in a single request and does not repeat the query. Before querying, the client waits for its own pending writes on that collection to be sent. ADR 025 left this point open in two places: the client deduplicates and "repeats the query when notified (stage 5)", and the client mode stays out until this channel exists.

What we already have and is reused:

- one subscription per socket, with per-reader access control (`BlockLiveAccessService.loadContext`, one load per notification for all readers) and a pure delivery plan (`planVersionDeliveries`);
- notifications serialized in a queue, so versions reach a socket in commit order;
- `resync` as the safe response when something cannot be resolved or there is a hidden block;
- the `packages/shared` engine (`matchesPageFilter`, `comparePageRowsBySorts`), which decides in the portal where a just-moved card lands;
- the reducer query contract of ADR 025, with `view.version` and the opaque cursor.

## Alternatives Considered

### What is notified

- **Notify only "the collection changed".**
  - PRO: minimal work on the server.
  - CON: each edit by someone else repeats the query of all open views. With 2,000 cards and several people, each move costs one query per watcher.
- **Send the full records in the notice.**
  - PRO: one round trip fewer.
  - CON: the notice carries data, so filtering has to be per property and not just per row, and `NOTIFY` has a cap of 8,000 bytes.
- **Send `{ row: version }` and let the client request what it does not have (chosen).**
  - PRO: the notice is small and carries no content. The client decides whether it already has that version (its own writes) and requests only what it is missing, with the permissions at the time of the read.
  - CON: one more round trip per change by someone else.

### Where the subscription lives

- **Reuse the per-page subscription.**
  - PRO: nothing new in the protocol.
  - CON: a page can embed several collections (linked views), and the page showing the view is not the collection. A per-page subscription would let things through or be redundant.
- **A separate socket for collections.**
  - PRO: isolation.
  - CON: it doubles authentication, limits and reconnection.
- **Per-collection subscriptions on the same socket (chosen).**
  - PRO: reuses authentication, message rate, closing on unavailable account and reconnection.
  - CON: the registry holds a second type of subscription.

### What the client does on receiving the notice

- **Always repeat the view query.**
  - PRO: correct by construction.
  - CON: it is what we want to avoid. It amounts to not having a channel.
- **Always reposition locally.**
  - PRO: zero queries.
  - CON: the client cannot evaluate everything (text search, relations to rows it did not load, future formulas), and a row outside the loaded window has no known place.
- **Reposition locally what the client knows how to evaluate and repeat the query only in the listed cases (chosen).**
  - PRO: the common case, moving a card or changing a visible value, costs no query.
  - CON: there is a list of exceptions to maintain and test, and correctness depends on the local engine and the SQL matching (the ADR 025 parity test already watches it).

### How an agent finds out

- **Repeat `query_collection` and compare.**
  - PRO: it exists.
  - CON: the agent spends context on rows that did not change and does not know what changed.
- **An event socket for the MCP.**
  - PRO: immediate.
  - CON: the MCP runs as a separate process with HTTP transport and the tools are request-response. An agent in a loop does not hold a socket.
- **A changes tool with a cursor, and optional wait (chosen).**
  - PRO: the agent asks for "what changed since my last read", receives only those rows and a new cursor. It works with any MCP client.
  - CON: the cursor and its limits have to be defined (see below).

## Decision

### Protocol on the live channel

New client messages:

| Message | Effect |
|---|---|
| `{ type: 'subscribe-collection', collectionId }` | The server checks that the reader can read the collection, just like `subscribe` with a page, and responds `{ type: 'subscribed-collection', collectionId }`. |
| `{ type: 'unsubscribe-collection', collectionId }` | Removes the subscription. |

New server messages:

| Message | When |
|---|---|
| `{ type: 'collection-changes', collectionId, rows: [{ id, version }], views: [{ id, version }], schemaVersion? }` | A committed transaction touched rows of the collection that this reader can read, or its views, or its schema. |
| `{ type: 'collection-resync', collectionId }` | The change cannot be described (see "Permissions and hidden rows", truncated notifications, error resolving access, loss of the listening connection, more than 500 rows in one notice). The client repeats the query of its views of that collection. |
| `{ type: 'collection-revoked', collectionId }` | The reader can no longer read the collection. The subscription is dropped. |

- A row is a `page` block whose parent is the collection. A change to the row's block (properties, title, lifecycle, permissions) counts as a change of the row. A change to the row's body (its child blocks) is **not** notified through the collection: the card does not show it. The cover from content (stage 7) will ask for this notice and will add it with its own ADR.
- `views` carries the version of the collection's views that the transaction touched (the transaction result already brings `viewVersions`). `schemaVersion` is included when the collection's schema changed (properties, options).
- Entries follow commit order. A socket receives one message per notification, and notifications already go in a queue.
- Limit of 20 collection subscriptions per socket. Past the limit, `subscribe-collection` is rejected with the already existing error code for limits. Messages count toward the per-socket rate that already applies.
- A person with the same collection in two tabs has two sockets and two subscriptions. Nothing is shared between sockets.

### Emission: one query per notification

The delivery service (`BlockLiveFanoutService`) already loads the access context once per notification, seeded with the touched ids and the subscribed pages. For collections:

1. the seeding adds the ids of the subscribed collections in the notification's space;
2. with the chain rows already loaded, the touched blocks are grouped by collection (a row is a `page` block whose parent is a subscribed collection). There is no read per row or per subscriber;
3. the plan is a pure function, like `planVersionDeliveries`: for each subscriber and collection, it filters the rows with `isBlockReadableInPage(row, row, access)` (the row and its whole chain up to it are readable, the same cut as the page read) and builds a single message.

The cost per notification is one context load plus an in-memory walk of `touched × subscribers`. It does not grow with the size of the collection. The performance tests check it with a 2,000-row collection and bursts of changes.

**`NOTIFY` payload.** Each `{ id, version }` entry gains two optional fields, `previousParentId` and `hasAccessChange`, which only go when the transaction moved the block to another parent or changed its permissions. They add no size in the common case. If the notification exceeds the cap, `truncated` is still sent, and every collection subscriber receives `collection-resync`.

### Permissions and hidden rows

- A reader only receives `{ id, version }` of the rows they can read. An unreadable id never travels, neither in `rows` nor in a count.
- If a touched row is unreadable for the reader, nothing is said to them, unless `hasAccessChange` or `previousParentId` indicate that the row may have been readable before: then they receive `collection-resync`. That way the client drops a card that has just been hidden from them without the server naming its id. The cost is that whoever reads a collection with restricted rows sees one more query when someone changes the permissions of one of them, and only in that case. An ordinary change to a hidden row produces no message.
- A row that leaves the collection (`previousParentId`) is treated the same for whoever subscribes to the source collection: `collection-resync`.
- A row that enters the collection (new parent) arrives as a normal change to the subscribers of the new collection, if they can read it.
- The permission is recomputed with the account's current role before delivering, as page delivery does (`applyCurrentAccounts`). An account that no longer exists closes the socket.

### What the client does

The portal keeps, per open view, the loaded rows with their version. On receiving `collection-changes`:

1. **Discard what it already has.** It ignores a row whose version is less than or equal to the one it holds. This absorbs the echo of its own writes. A row with a pending local operation is kept as is and reconciled when the queue empties.
2. **Batch.** It gathers the notices in a 150 ms window before acting, so that a burst is a single read.
3. **Request only those rows**, in a single request per collection (`rows` by ids, with the view's properties), with a cap of 200 ids per request. If the batch gathers more than 200 distinct rows, the view query is repeated once instead of reading by ids.
4. **Reposition locally** each row with the `packages/shared` engine: it evaluates the view's filter against the new record, and sorts it with `comparePageRowsBySorts`. A card moves from one group to another (board column, table group), enters, leaves or changes place. Group counts are adjusted on moving, and verified with a single `aggregations` request per burst (phase two of ADR 025), because sums, averages and medians are not adjusted by difference.
5. **Request the view data again** if `views` brings a version greater than the stored one, and the schema if `schemaVersion` is greater.

**When it repeats the query instead of repositioning.** Exactly in these cases, and in no other:

| Case | Why it cannot evaluate |
|---|---|
| There is an active search (`search`) and the row changed | The match is computed on the server over `Block.text` and the text answers, accent- and case-insensitively, and the client does not have an identical normalization. |
| The filter or sort uses a relation, a rollup or a formula | They depend on other rows that the client may not have or may not be able to read. Formulas and rollups (stage 10) declare their exception here. |
| The order is manual and the notice brings a greater version of the view | The `manualOrder` list does not travel to the client in full. The loaded range of each affected group is read again (`groupResults`, no more than two groups per move), not the whole view. |
| The row is not loaded and its position falls within the already loaded range | It is placed with its sort value. Only possible with sort by property. |
| The row is not loaded and its position falls after the last loaded one | It is not placed. The count is adjusted and the row will appear on loading more. It costs no query. |
| `collection-resync` | The server asked for it. |
| The "load more" `cursor` returns `VIEW_QUERY_CURSOR_STALE` | It is the ADR 025 case: the order changed, restart from the first page. |
| A batch gathers more than 200 rows | It is cheaper to repeat the query than to read by ids. |

A filter with relative dates or "me" (stage 8) is evaluated locally, because the client knows the zone and who is looking. The passage of time generates no notices: "today" changes at midnight and the view reflects it on the next query, not through the channel.

**Own pending writes.** Before any query of a view (first load from the client, "load more", repetition for the causes above), the client waits for the pending transactions that touch rows, views or schema of that collection to be sent. The server's result already contains them and the echo does not revert the own move. If the wait exceeds 5 s it queries anyway and logs a warning. A query in flight is cancelled and repeated when a `collection-resync` arrives.

**Reconnection.** When the socket reopens, the client subscribes again to its collections and repeats the query of each open view, as the editor repeats the page read after a reconnection.

**Visibility.** A hidden view (background tab) keeps its subscription but accumulates the notices and acts on return, in a single read.

### MCP tool for agents

An agent does not hold a socket, so its path is a request tool with a cursor.

**`collection_changes`** receives `{ collection, since?, columns?, limit?, waitSeconds? }`.

- Without `since`, it returns only `cursor` (the current point), with no rows. It is "start watching from now".
- `query_collection` gains in its response `changesCursor`, taken in the same snapshot as its rows. That way "I read and then I watch" neither loses nor repeats changes between the two calls.
- With `since`, it returns `{ cursor, rows, trashed, total, hasMore, reset }`.
  - `rows` are the rows that changed and that the token can read, complete and with `version`, with the same format and the same `columns` trimming as `query_collection`. A row that changed several times appears once, with its current state.
  - `trashed` are the ids that went to the trash. Purging requires the trash first, so every deletion is announced once.
  - `total` is the exact count of rows visible to the token, with the same computation as ADR 025. If it does not match the agent's own count, the agent knows it missed something that cannot be named (a row that was hidden from it) and re-reads.
  - `hasMore` and `limit` (default 50, cap 100) paginate the changes. `cursor` only advances up to what was returned.
  - `reset: true` when the cursor is not valid or continuity cannot be guaranteed (schema changed in an incompatible way, cursor older than the retention). The agent re-reads with `query_collection`.
- `waitSeconds` (0 to 25, default 0) makes the call wait until there is a change or the deadline passes, and return what there is. The server resolves it by repeating the changes query every second, which costs a `parentId` walk of a few milliseconds. That way an agent waits without polling in a loop of its own or spending context on empty responses.
- **The cursor never loses a change.** A date-based cursor does not work: a transaction that started earlier and commits later writes a mark earlier than the cursor, and no time margin guarantees it. Instead the transaction identifier is used:
  - `Block` gains `changeXid bigint NOT NULL`, which a `BEFORE INSERT OR UPDATE` trigger sets to `pg_current_xact_id()::text::bigint` on every write (the contract does not model `xid8`, and the 64-bit value fits in a `bigint`). It is in the database and not in the application so that no write path (the transaction pipeline, the purge, a data migration) can forget it. A lifecycle change (trash, restore) is a write of the row, so it also sets it.
  - The cursor is the `xmin` of the reader's snapshot (`pg_snapshot_xmin(pg_current_snapshot())`), taken in the same read-only transaction and with the same snapshot as the rows that are returned. Everything that commits after that snapshot has a `changeXid` greater than or equal to the `xmin`, because the `xmin` is the oldest transaction that was still open.
  - `collection_changes` with `since` returns the rows of the collection with `changeXid >= since`, sorted by `(changeXid, id)`. It may repeat rows the reader has already seen (those committed before the snapshot, but with a transaction id greater than or equal to the `xmin`). The repetition is harmless because each row carries its `version` and the agent deduplicates by `id` and version. It never omits a row committed afterwards.
  - The cursor is opaque (base64url of `{ xmin, after? }`). `after` is the `(changeXid, id)` position of the last row of a partial page, and only exists while `hasMore` is true. When the changes run out, the returned cursor is the `xmin` of that read's snapshot.
  - A long transaction that stays open pushes the `xmin` back, and the cursor of whoever reads then repeats more rows until that transaction ends. It is the cost of losing nothing.
  - After restoring a database copy, transaction identifiers may go backwards. A cursor with an `xmin` greater than the current `xmin` responds `reset: true`.
- The rows the token cannot read, including those a token rule closes, are excluded in the query with the ADR 025 denied set, not discarded afterwards. The same cap of 5,000 and the same typed error apply.
- **A migration** (per `packages/db/AGENTS.md`): adds `Block.changeXid` (`bigint`, default 0: existing rows did not change after the migration), the trigger and the index `Block_parentId_changeXid_idx` on `(parentId, changeXid)`. It is tested first on a disposable database and then applied to `company-brain` with `bun run db:migrate:deploy`.
- **Index cost.** `changeXid` changes on every write, so no `Block` update can be HOT: each edit writes an entry in this index and in the others. With ADR 025 the `Block` indexes were already few on purpose to preserve HOT, and this decision changes that. It is accepted because it is the only way to read "what changed" without walking the collection and without losing changes. The performance tests measure the write cost of a one-letter edit before and after, and the decision is reopened if it rises more than 20%.
- The block's last-edit column is `editedAt` (not `updatedAt`). The cursor does not use it.
- It is a read. It follows the usual rules: the agent has the permissions of its person.
- The tool's description explains the cycle: read with `query_collection`, save `changesCursor`, call `collection_changes` with `since` and `waitSeconds`, apply `rows` and `trashed`, and save the new `cursor`. The MCP instructions say when it is worth watching and when to re-read (`reset`).

### Errors and observability

- Every failure of access resolution or delivery plan leaves an `ERROR` with a trace and sends `collection-resync` to the affected subscribers. A notice is never silently dropped.
- A notice that cannot be read counts as `resync` for all collection subscriptions, just as it does today for page ones.
- The client logs at `WARN` level each query repetition by cause (from the table above), to be able to measure how much each exception costs.
- A loop guard: more than 5 queries per second per view caused by notices are logged as `ERROR` and stopped for 5 s.

## Consequences

- Positive:
  - moving a card in one window moves it in another person's window without repeating the view query, only with a read by ids of the rows that changed;
  - the cost of delivering is one context load per notification, independent of the size of the collection;
  - a reader with a hidden row does not see the row appear, nor its id, nor a count that gives it away, except the `collection-resync` when its permissions change;
  - an agent knows what changed since its last read without re-reading the collection, and can wait without a loop;
  - ADR 025 recovers its "repeat the query when notified" without a contract change.
- Negative:
  - there is a table of exceptions (search, relations, manual order, window) that the portal must maintain along with the local engine;
  - changes to a row's body do not arrive through this channel and the cover from content will need to extend it;
  - the `collection_changes` cursor rests on `changeXid` and can repeat rows (harmless) while a long transaction is open, in exchange for losing none;
  - every write to a block stops being HOT because of the index on `changeXid`, and the migration adds a trigger on `Block`;
  - a change to a row's permissions generates a `collection-resync` for all readers of a collection with restricted rows, even if it does not affect them;
  - the `NOTIFY` payload and the connection registry gain one more entry type;
  - each socket can hold up to 20 collection subscriptions.
- Changes to existing behavior:
  - the per-page subscription does not change;
  - the client stops blindly repeating the view query when focus returns, and does it only for the causes in the table;
  - `query_collection` returns `changesCursor` and the MCP gains a read tool.
- Accepted as a cost: the client mode (the client receives all the ids and filters locally) stays out. The server keeps serving one page at a time and the client only repositions what it loaded.

## Governance

- The delivery plan tests cover: a readable row arrives with its version; an unreadable one neither arrives nor is named; a permissions change on a hidden row generates `collection-resync` and an ordinary one generates nothing; a row moved to another collection notifies both; a truncated notification generates `collection-resync`.
- An integration test with two readers and a hidden row checks that the second never receives its id, neither in the notice nor in the query that follows.
- A performance test with a 2,000-card board and bursts of 100 and 500 changes checks that delivery does one context load per notification (no queries per row or per subscriber), that the client does one read per burst and that the main thread is not blocked for more than 50 ms.
- The client has tests of the exceptions table: each row of the table has a case that repeats the query, and the other changes do not repeat it.
- The `collection_changes` tests cover: initial cursor, changes grouped by row, `trashed`, exact `total` with a hidden row, `reset`, cursor margin with a late transaction and `waitSeconds`.
- Business rules (`rules:add`, `FEA-CLC`): notice per collection with `{row: version}` filtered by read; query repetition only in the listed cases; waiting for own writes before querying; changes by cursor for agents.
- A change to the client exceptions or to the MCP cursor is made with a new ADR.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21. Approved with one change: the `collection_changes` cursor uses the transaction id (`changeXid` and the snapshot's `xmin`) and not a timestamp with a margin, so as never to lose a late-committed change. Changes to the row's body are not notified through this channel (stage 7 picks it up if the cover comes from content). A change of permissions or parent produces `collection-resync`. `collection_changes` is a separate tool and `query_collection` returns `changesCursor`.
- Modified: 2026-10-21 (implementation). The portal draws the views from the Next server (server components with per-space cache), so there is no row store on the client where a card could be repositioned. This stage's client, on a notice, batches in 150 ms, invalidates the space's cache with a server action and the view is drawn again with a query (the wait for own writes is given by the order in which Next runs actions). It does not read rows by id or reposition locally. Repositioning locally and the exceptions table move to stage 11 (the client cache) and require a row store on the client. The channel, per-reader permissions, the `changeXid` cursor and the MCP tool are as decided.
- Modified: 2026-10-21 (stage 7). The notice is not extended: card covers come from a files property of the row, which the notice already covers because it is a value of the row, and not from the body of its page (see the note in ADR 025). If the first image of the content is wanted later, the notice will have to cover changes to the rows' bodies, and that is decided then.
- Reference: `docs/superpowers/plans/2026-10-20-daily-work.md` (stage 5)
