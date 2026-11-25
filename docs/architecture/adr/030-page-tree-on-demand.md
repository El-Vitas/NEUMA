# 030: Page tree on demand

**Status:** Accepted
**Date:** 2026-10-21
**Depends on:** `021-everything-is-a-block.md`, `022-retire-the-outbox-and-projection-workers.md`, `025-views-as-reducer-queries.md`, `029-client-record-cache.md`
**Precedes:** nothing in the plan `2026-10-20-daily-work.md`. It closes the debt that the fourth note of ADR 029 left open (the page tree returns the whole space).

## Context

Opening a page in a space of 12,000 pages transmits a document of about 40 MB and takes about 5.9 s. The cause is a single design decision. The portal treats "the pages of the space" as a complete list with their content, and everything else rests on it.

- `GET spaces/:spaceId/pages?includeTrashed=true` returns the 12,000 pages with their document. It weighs 9.98 MB and takes 1,010 ms.
- The Next server requests it two or three times per load: the layout to build the side menu of **all** the spaces, the page route, and `generateMetadata`.
- The page route hands that whole list to the client component `PagesWorkspace`, which serializes it into the document (the 40 MB).
- The backend already has the opposite. `PageOutlineRepository` exposes `listChildren` (with a window, count of readable children and collection mark), `listAncestors` and `listReadable`, and the MCP uses them in `list_pages`. The portal does not.

### Who uses the full list today

Measured with a code search. The last column says what replaces it.

| Consumer | What it takes from the list | What replaces it |
|---|---|---|
| `app/(portal)/layout.tsx` (side menu) | Id, title, icon, order, parent, lifecycle and own permissions of each page of each space | `GET pages/tree` by parent, only roots and what is open |
| `spaces/[spaceId]/page.tsx` (space home) | Root pages and recent activity (all of them, sorted by edit) | `tree` of roots and `GET pages/recent` with a cap |
| `pages/[pageId]/page.tsx`, `readPagesHolding` | The open page, to know whether it exists and re-read if the cache does not have it | `GET pages/:pageId` (already exists), no list |
| `generateMetadata` of that route | Title of the open page | The same page read, deduplicated per request |
| `resolvePanelPageId` | Checks that the side panel's page exists | `GET pages/:pageId` of the panel's page |
| `PagesWorkspace` (`pages`) | Selected page, tree for breadcrumbs, pages for the editor and the panel | `page`, `panelPage` and `ancestors` separately; `pages` disappears |
| Breadcrumbs (`splitBreadcrumbParentPages`, `parentBreadcrumbPages`) | Chain of parents built with `buildPageTree` | `GET pages/:pageId/ancestors` (wraps `listAncestors`) |
| Mentions and links (`gatherThePagesNamed`, `usePagesMentionSearch`, `pagesAtHand`) | Pages "at hand" to suggest before searching | What is loaded in the tree and recents, plus the server search that already exists |
| Titles and icons of embedded subpages (`pages.editor.subpage.lib`) | Title, icon and lifecycle by id | Batch `POST pages/lookup` |
| Synced blocks (`readBorrowedBlock`, `pages.editor.synced.lib`) | The **content** of other pages, read from the list | The server reads at once the pages cited by the open one and delivers them with it; new ones are requested with content `lookup` |
| A row's properties panel (`buildPanelLookups`, `relatedRows`) | Titles of the rows a relation points to | `POST pages/lookup` with the relation's ids |
| `buildEmbeddedCollections` | Title of each embedded collection | `lookup` of those ids |
| `listPageDestinationsAction` (destination selector) | All the active pages of the space | The selector requests by parent with the same `tree` and searches with the existing search |
| `listMoveDestinations` | Already a separate backend read | No change |
| `/trash` and `getTrashedPages` | Its own endpoint, with no window | The same endpoint, now paginated |
| `exportAsMarkdown` (backend) | Internal `list(...)` | No change. It is an export, it reads everything on purpose |

The backend is left with a single caller of the full list, the export. `GET spaces/:spaceId/pages` stops being part of the portal's read path.

### How a side menu should load

A side menu that scales loads the roots, the favorites and the path to the open page. Children arrive on expand, and each row brings whether it has children so the arrow can be drawn without loading them. A database's rows never appear in the menu. A page's content only travels when it is opened, and the titles of mentions and links are requested in batches by id and stored in the record cache. Others' changes arrive through the live channel and touch only the branch that changed.

### Measured goals

On the production build, in the 12,000-page space, with the administrator account.

| Measure | Today | Goal |
|---|---|---|
| Open page document | 40 MB | 1 MB or less |
| First paint on opening a page | 5.9 s | 1.5 s or less |
| Each tree request (roots, children, path, batch, ancestors) | 1,010 ms the list | 100 ms or less, p95 |

## Alternatives Considered

### How the tree is loaded

- **Keep the full list and remove the content.**
  - PRO: the smallest change. The list without document would weigh about 2 to 3 MB.
  - CON: it keeps growing with the space and keeps taking what it takes to build 12,000 readable entries (permissions row by row). At 100,000 pages the problem returns. It does not solve the server cost, which is what weighs, and keeps the menu of all spaces in the layout.
- **Load the full tree in the browser once and keep it with the live channel.**
  - PRO: no requests on expand.
  - CON: the first load is today's without the content, and the live channel would have to maintain 12,000 entries per tab. It reproduces the problem elsewhere.
- **Roots, favorites, open path and children on expand, with `hasChildren` (chosen).**
  - PRO: the cost depends on what the person sees, not on the size of the space. It reuses `listChildren` and `listAncestors`, which the MCP already tests with permissions.
  - CON: expanding asks the server the first time (covered by the ADR 029 local cache). Partial branches have to be maintained when others' changes arrive. Searching inside the menu no longer walks a complete tree, so it relies on the server search.

### How the menu finds out about others' changes

- **Invalidate the space's cache and request everything again (today's).**
  - PRO: no new code.
  - CON: with the partial tree it forces re-reading all the open branches, and it learns nothing until a navigation.
- **Polling every so often.**
  - PRO: simple.
  - CON: latency, constant load per tab and nothing that ADR 020 and 026 do not solve better.
- **A `tree-changes` notice through the existing live channel (chosen).**
  - PRO: the channel already delivers by permissions and knows about `previousParentId`, `hasAccessChange` and "too many", just like the ADR 026 collection notices. The menu applies only what changed.
  - CON: one more subscription to maintain (see "Confirmed decisions").

### Resolving titles of mentions, links and subpages

- **One `GET` per id.** CON: N+1 when opening a page with 40 mentions.
- **Embed the title in the document when writing.** CON: it goes stale on rename and touches the whole document of every page that mentions it.
- **Batch by ids with coalescing and cache (chosen).** PRO: one request per opening, regardless of how many mentions. The results go to the ADR 029 store with their `version`, so they are not requested twice and are corrected with `sync`.

## Decision

### Backend contracts

All under `JwtAuthGuard`, resolved with the same `PageOutlineReader` that the MCP already uses. None skips permission visibility or the token's scope. What the reader cannot open does not appear, is not counted and leaves no trace in a total.

- **`GET spaces/:spaceId/pages/tree?parentId=&skip=&take=`.** Children of a parent (or roots if `parentId` is missing), with a window (`take` default 100, maximum 200). Each entry carries `id`, `title`, `icon`, `order`, `lifecycle`, `hasOwnPermissions`, `hasChildren`, `isCollection` and `version`. The response brings `total`. `hasChildren` is a boolean and not a count, because counting the readable children of each row costs more than knowing whether there is one. A collection enters with `hasChildren: false`. Its rows never appear in the tree. Pages in the trash are not listed.
- **`GET spaces/:spaceId/pages/:pageId/path`.** The open path in a single round trip. It returns the ancestors from the root (with the redaction of `listAncestors` for those that cannot be read) and, for each level, the window of children that contains the next one, so that the open page always falls inside its window. A single request builds the open menu.
- **`GET spaces/:spaceId/pages/:pageId/ancestors`.** Only the chain, for breadcrumbs and for the side panel.
- **`POST pages/lookup`.** Body `{ ids }` (up to 100), at workspace level because a mention can point to another space. It returns `{ id, title, icon, lifecycle, spaceId, version }` for each readable id. A nonexistent id and one without access are answered the same (absent), so as not to leak their existence.
- **`POST pages/lookup-content`.** Body `{ ids }` (up to 20). It returns the document of those pages, with the same permission filter. It is the only bulk content read and synced blocks use it.
- **`GET spaces/:spaceId/pages/recent?take=`.** The last edited pages of the space that the reader can open (cap 50), for the space home.
- **`GET pages/trash?spaceId=&search=&skip=&take=`.** The current trash endpoint, now with a window and `total`. It is the only thing that lists deleted pages.
- **`GET spaces/:spaceId/pages`.** Kept for the export and for external clients, but the portal stops calling it.

If `listChildren` does not meet 100 ms with 12,000 siblings, the window is pushed to SQL (order by position, over-read for the permission filter) and the index the plan asks for is added. It is a small migration, formatted with biome on that file, and is noted here when done.

### Portal

- The layout stops reading pages. It delivers the spaces, the favorites (which already bring title and icon) and the roots of each visible space. Each space's tree lives in a client store (the ADR 029 one, with a schema record type `outline`) that stores, per parent, the list of children and its `total`. It is painted from IndexedDB and revalidated against `tree`.
- The page route reads the open page, the panel's page (if any) and `path`. The client component receives `page`, `panelPage`, `ancestors` and the titles that the server already resolved for that page. Never again a list with content. `PagesWorkspace` loses the `pages` prop.
- Breadcrumbs come from `ancestors`. The side panel uses the ancestors of its own page.
- Mentions, links, subpages and relations request batch `lookup`. A resolver gathers the ids requested in the same time window (one tick), deduplicates them against the store and sends a single request. The results are stored with their version. While they arrive, the document's text is drawn, without flicker.
- Synced blocks. When rendering the open page, the server extracts the `pageId`s of its synced nodes, reads them in a single `lookup-content` and delivers them along with the page. What is inserted later is requested with `lookup-content` at the moment of insertion.
- The destination selector and the "at hand" suggestions come from what the tree has loaded, the recents and the server search that already exists.
- The trash paginates with "Load more" over `pages/trash`.
- The space home uses the roots from `tree` and `recent`.

### Live

The block channel already notifies of each committed transaction (`NOTIFY`, ADR 020 and 022). A `subscribe-space-tree` subscription is added per expanded space, and the server responds with three messages, by analogy with ADR 026.

- **`tree-changes`.** Only pages that are not rows of a collection, with `id`, `parentId`, `previousParentId`, `title`, `icon`, `order`, `lifecycle`, `hasChildren` and `version`, filtered by what each subscriber can read. The client applies each entry. If the parent is loaded, it inserts, moves or removes. If it is not, it only corrects the `hasChildren` of the parent row that it does have loaded.
- **`tree-resync`.** When there are too many changes in a transaction, or an access change leaves doubts. The client re-reads the loaded parents with `tree`.
- **`tree-revoked`.** Access to a space was lost. The menu closes it and deletes its local copy (the ADR 029 rule for permissions).

Creating rows of a collection or editing a page's content does not generate `tree-changes`. Renaming, moving, reordering, icon, trash and restore do.

### Agents (agent first)

`list_pages` already walks by level with a window and cursor, and relies on `listChildren`. It does not load the space. It is verified in the implementation that no other tool does (`search`, `fetch`, `list_trash`, `move_page` and `create_page` are reviewed one by one) and that `list_trash` uses the same new pagination. Agents gain the same advantage as the portal with no extra work: the new contract and the MCP share repository and permissions. `list_pages` keeps its `childCount` per entry, which is more informative for an agent than the menu's boolean. The tool description still says how to walk the tree, because the guide lives in the MCP and not in the repository.

## Consequences

- Positive:
  - The open page's document stops depending on the size of the space. The server cost does not depend on it either: each request touches one branch.
  - The portal and the MCP share a single tree read path, with the same permissions.
  - The titles of mentions, links and relations stop depending on the cited page being in a loaded list. They work the same at any size and across spaces.
  - The menu corrects itself when someone else creates, moves, renames or deletes, without reloading.
- Negative:
  - Expanding a branch for the first time costs a request. The local cache hides it on later visits, but the first one is still there.
  - The tree is partial. Everything that today assumes "all the pages are there" (destination selector, at-hand suggestions, the space home) has to be rethought and some functions become searches.
  - One more subscription per tab and a new record type in the local cache.
  - Synced blocks no longer read another page's content from memory without requesting it. The server advances it, but a synced block inserted live carries a wait.
  - `PagesWorkspace` and its children change contract. It is a wide change in the portal (more than a dozen files) although conceptually simple.

## Governance

- An integration test with a space seeded with thousands of pages checks that opening a page does not request the full list, that the document stays under the cap and that each tree request meets the goal. This ADR's production measurement is repeated when the stage closes.
- A contract test walks each new endpoint with a reader without access to a branch and checks that the branch neither appears nor counts.
- No new component receives a list of pages with content. `PageSummary` with `content` only exists for the open page and the panel's.
- Everything new that the portal can do is reviewed against the MCP: if there is a menu path, there is a `list_pages` path.

## Confirmed decisions

1. **Menu connection.** Same endpoint and protocol of the live channel (`/api/v1/blocks/live`) with a new subscription type. A separate connection per tab is acceptable for now, because sharing it would rewrite `block-sync.session.lib`. **Noted debt:** unify the menu's socket and the editor's into one per tab.
2. **Collection rows out of the menu.** They remain reachable from the collection, the search, mentions and links.
3. **More than 100 siblings.** "See more" at the end of the list, in windows of 100.
4. **`recent` index.** If the query plan does not meet 100 ms, a small migration with the `(spaceId, updatedAt)` index on `Block`.
5. **Trash in the menu.** Pages in the trash never appear in the tree, except the open page that is in the trash, which is shown through the open path.

## Notes

- Author: El-Vitas (draft by Claude)
- Created: 2026-10-21
- Approved by: El-Vitas, 2026-10-21
- Modified: 2026-10-21 (implementation). Done and verified in the production browser with two people, on a space seeded with 12,000 pages (40 roots, 800 on the second level, 8,000 on the third, one page with 1,020 children and the rest further down). **Measurements.** Open page document, from 17.95 MB to 0.37 MB (the seeded space weighs less than the one in the ADR 029 measurement, which gave 40 MB; the proportion is the same). First paint (median of 5 to 7 runs, Chrome without cache): from 1,780 ms to 376 ms. Tree requests on the backend, median of three runs: roots 20 ms, 100 children of a page with 1,020 children 13 to 27 ms, open path 45 ms, 100 titles in a batch 16 ms, recents 21 ms, trash 14 ms, ancestors 20 ms. Opening a page with 1,020 children in the menu, 280 ms from the press to the paint. A change by another person reaches the menu in 260 to 530 ms (rename, create, send to the trash, move). **Deviations.** (1) The live notice is `tree-changed` with the **ids of the parents** whose list changed, and `tree-resync`; it carries no entries and there is no `tree-revoked`. If access is lost, re-reading that branch no longer brings anything. (2) The tree lives in the browser's memory; it is not yet stored in IndexedDB, so the first paint of the menu comes from the server and not from the local copy. (3) The names a page needs (mentions, subpages, relations, titles of embedded collections and content of synced blocks) are requested **in two requests when opening it**, on the server, and travel with the page. A name that appears later (a just-inserted mention) uses the label the node carries until the next opening; there is no client resolver that requests loose ids. (4) The destination selector for blocks and buttons lists the top of the space while nothing is typed, and the space search when typing. (5) The trash paginates 50 at a time with "Load more", and the MCP's `list_trash` stops reading each space's hierarchy. (6) The `(spaceId, editedAt)` index migration was not needed: `recent` takes 21 ms. **Errors found.** A move or send-to-trash transaction identifier (`page-move:<id>:<id>`, 83 characters) exceeded the maximum of 64 with which the server's notice was validated, so each move caused a re-read of the whole channel; now the server's notice does not impose the client's maximum. And moving a page from the top of its space did not notify that the top changed: the notice now carries `previousParentId: null`. **Debt.** (a) Searching "Pagina" among 12,000 pages (a word that is in all of them) takes 1.3 s in the existing search, which computes ancestors of each hit before limiting; searches with selective words take 7 to 190 ms. (b) `GET pages/move-destinations/:id` still lists all the readable pages of all the spaces (1.9 MB, 450 ms, only when opening the move dialog) and `GET pages/assigned` reads all the pages with properties of the workspace. (c) The MCP's `list_pages` takes 100 to 160 ms at the top of this space because it counts the readable children by reading them; the menu uses a cheaper path that the MCP could adopt. (d) A single socket per tab for menu and editor (debt noted in decision 1).
- Modified: 2026-10-22 (four corrections on the previous debt, measured in the same 12,000-page space). (1) **Search.** The statement no longer walks the ancestors of all the hits: it first sorts and limits a window of the best ones (8 times the requested rows) and only for those computes ancestors. For pages, it chooses the pages of the window and then brings **all** the hits of those pages (not just those of the window), so that the permission remains exact: a hit the person cannot read does not hide another that they can, and the unreadable rows are discarded by TypeScript as before, asking for more window if needed. If the window leaves few results and hits were left out, it widens according to the rate at which they survived (a probe counts the hits). The order of pages of equal rank now breaks ties by the page's best hit (for a titled page it matches its id) and not by the page's id, because only that way is the window a consistent prefix. The join with `Space` was replaced by a list of readable spaces resolved once, which lets the planner spread the walk across several processes. "Pagina" (in all pages): from 560 to 630 ms measured today (1.3 s in the previous measurement) to 120 ms; "Pag" from 380 to 52 ms; "Texto" from 420 to 73 ms; selective words from 17 to 27 ms. (2) **The MCP's `list_pages`.** It uses the same cheap path as the menu (`hasChildren`, without reading the children to count them) and respects the token's scope. The output changes: `childCount` becomes `hasChildren` (boolean), in `list_pages` and in the children of `fetch`. From 100 to 158 ms to 32 to 55 ms at the top and from 85 to 52 to 69 ms under the 1,020-child page. (3) **Move destinations.** `GET pages/move-destinations/:id?query=` no longer lists everything: without text, the top of each space (20 per space); with text, the page search, without the page itself or anything of its branch. It also returns the current parent's title. From 1.9 MB and 450 ms to 7 KB and 40 ms (the top) and 130 ms (a search that hits all of them). The panel's move dialog and the menu's move-several-pages dialog ask the server for what is typed, with a pause. (4) **Loss of access.** A change of permissions on a page at the top of the space did not reach whoever lost it, because the top has no parent to read and the page was no longer readable: now an access change is notified to all followers of the space (it only says that the top changed, it does not name the page). And whoever stops being able to read the entire space receives `tree-resync` on the space's next notice and stops being followed; that next notice is the limit: there is today no interface operation that removes someone from a space and no notice of its own is emitted. **New debt.** A change that happens between the server's paint and the socket's first subscription does not arrive: the first subscription does not re-read what is already loaded.
