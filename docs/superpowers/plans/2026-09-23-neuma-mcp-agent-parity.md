# MCP · Let the agent do what a person does

> Status: approved. F0, F1 and F2 done; F3 pending.
>
> Executes level 3 of the ladder in `docs/architecture/adr/008-adopt-single-page-primitive.md`
> and the contract in `docs/architecture/mcp-content-authoring.md`. Closes `AG-01`,
> `AG-02` and `AG-03` of `docs/scope/verification/08-agents-and-experience.md`.

## What is sought

An agent connected with a token works in Neuma like a person with the
permissions of that token:

- it finds a specific block, knows which page and section it lives in, and gets to it;
- it receives a page or block URL copied from the portal and opens it;
- it writes on a page without overwriting whoever has it open;
- it operates a board: creates tasks, changes their properties, moves them
  between statuses, creates views and changes columns.

Today it has three read tools (`list_spaces`, `read_page`,
`search_neuma`). It sees each page as a lump, search answers
"it is on this page" and not "it is in this block", and it cannot write anything.

## What was found when reviewing the code

These four findings decide the design.

1. **Collaborative editing syncs nothing.** Checked in the browser
   on 2026-09-23: with the same page open in two tabs, what is typed in one
   does not reach the other even though both say "Collaborative editing connected", and
   `CollaborationSnapshot` is empty. In Hocuspocus 4, `handleConnection` no longer
   listens to the socket: whoever connects it forwards each message with `handleMessage`
   and the close with `handleClose`, as the library's own `Server.ts` does.
   `collaboration.transport.ts` only calls `handleConnection`, so the
   server never receives a message. What it saves today is the autosave, on
   `Page.content`.

   **Fixing it exposes the next problem.** The editor seeds the collaborative
   document from `Page.content` only when it is empty
   (`pages.collaboration.session.lib.ts`). As soon as Yjs really saves, a
   direct server write to `Page.content`, like the one in
   `addBlocksToPageAction`, will not show up in the editor and the next autosave
   will erase it. ADR 008 warns about this case: "if a Yjs session's state can ever
   diverge from `Page.content` without an autosave reconciling it, the canonical
   record is wrong". That is why the transport and the server writer are
   fixed together, never the first alone.
2. **Autosave sends the whole properties from the local copy.**
   `pages.editor.tsx` sends the complete `propertyValues` with each save. If the
   agent moves a task to "Done" while someone has it open, the
   next autosave returns it to its previous state. Today the same happens between
   two people.
3. **The ProseMirror schema lives in the portal** (`pages.editor.schema.ts`,
   949 lines, with the DOM rendering mixed in). To write to Yjs from the server,
   the backend needs the schema.
4. **The block foundation is already there.** The editor gives each block a UUID, the link
   to a block already exists in the block menu (`…/pages/<page>#<block>`), and
   there is a Markdown exporter in `packages/shared`, although it only covers ten
   block types. The `id` is optional in `pageContentSchema`, so there can
   be content without ids.

## Design decisions

- **The MCP is an adapter.** Each tool calls the same services the portal
  uses, with the same validations. It never queries Prisma directly.
- **The reference is `(page, block)`.** Every block has an id, and every
  response names the page and the block.
- **Markdown with anchors is read; structured blocks are written.** The model
  reads Markdown better and cheaper than the editor's JSON. Writing goes in typed
  blocks, as the authoring contract sets, and the text inside each block
  admits inline marks (bold, italic, code, link, mention).
- **Every content write goes through the collaborative document.** A server
  writer opens a direct Hocuspocus connection, applies the change in a
  single Yjs transaction and writes `Page.content` and its `PageVersion` with the
  result. Whoever has the page open sees it live, and the agent's next
  read already brings it. `addBlocksToPageAction` switches to the same
  writer.
- **Properties are saved by key.** The server merges only the keys that
  arrived, atomically, and autosave stops sending the ones that did not
  change.
- **Everything the agent references goes through the token's rules.** A
  mention, a subpage, a synced block or an embedded collection that
  points to a page the token cannot reach is answered as nonexistent. ADR
  008 demands this same thing for the titles of mentions.
- **Every write is recorded** with the owning person, the token and the block
  it touched. Without a record there is no write.
- **Parity with a person, no more.** A locked page is not written. What
  document `14` decides about verified pages will apply equally to the
  agent, with no separate path.

## Links to pages and blocks

- **Block:** "Copy link" already exists in the block menu.
- **Page:** missing. "Copy link" is added in the page menu and in the
  page menu in the sidebar tree.
- **Shape:** `https://<portal>/<locale>/spaces/<space>/pages/<page>#<block>`.
  The agent accepts the full URL, just the path, or loose ids. The locale
  and the domain do not change the result.
- A link to a block that no longer exists answers "the block does not exist; this is
  the page", not a silent error (`AG-03`).

## Tools

Each tool requires a token permission, evaluated on the page where it acts
with the nearest rule.

### Read (`pages:read`, `collections:read`)

| Tool | Input | Returns |
|---|---|---|
| `search` | text, filters (space, root page, type), cursor | blocks: snippet, block id, page, page path and the heading it sits under |
| `fetch` | URL, or page id, or block id; cursor | **page**: title, path, properties if it is a row, Markdown with each block's id, subpages, backlinks and comments. **Block**: the block, its section and the page it belongs to |
| `list_pages` | space or parent page, cursor | the tree one level deep, with how many children each page has |
| `list_spaces` | — | already exists |
| `get_collection` | collection | columns with their types and options, and views with their configuration |
| `query_collection` | collection, a view or a filter and order of its own, cursor | rows with their typed properties |

`fetch`'s Markdown covers **all** the schema's block types, not just
today's ten. A type that cannot be written comes out as a marker with its id and
its type; it never disappears.

### Write pages (`pages:write`)

| Tool | What it does |
|---|---|
| `create_page` | creates a page in a space or under another page, with optional initial blocks |
| `insert_blocks` | adds blocks before or after a block, inside one (children), or at the start or end of the page |
| `update_block` | replaces a block and keeps its id |
| `update_table_cell` | changes a cell by table, row and column (authoring contract) |
| `move_blocks` | moves blocks within the page or to another |
| `delete_blocks` | deletes blocks by id |
| `update_page` | title and icon |
| `move_page` / `duplicate_page` | same as in the portal, with the same access warning |
| `comment_on_block` | leaves a comment on a block |

There is no `rewrite_page`. Each write returns the state that was saved,
so the agent does not have to read again.

### Operate collections (`collections:write`)

| Tool | What it does |
|---|---|
| `create_row` | creates a row (a page under the collection) with title, properties and optional blocks |
| `update_row_properties` | changes one or several properties. **Moving a task between statuses is this** |

Values are validated against the collection's schema: an option that does not
exist is rejected with the valid options, instead of being half saved.

### Configure collections (`collections:configure`)

| Tool | What it does |
|---|---|
| `update_collection_schema` | adds, renames or removes columns and options (renaming an option rewrites the rows, as today) |
| `create_view` / `update_view` / `delete_view` | table, board, list, gallery, calendar or chart, with filters, order, grouping and visible columns |

### Trash (`pages:trash`)

`trash_page` and `restore_page`, with the same preview as the portal.

### Left out, on purpose

Deleting forever, emptying the trash and managing members and spaces. They are
administration acts, and no token permission covers them. Verifying,
locking and assigning an owner started here and entered in F3, with their own
permission (`pages:manage`).

## New data

- **`PageBlock`**, the level 3 projection: block id, page, space,
  parent block, order, type, text, heading path and page version.
  The same search projector fills it, from the `PAGE_*` events.
- **Search indexes blocks.** Each block with text is a `SearchDocument` row
  that stores its page. The token's filter now looks at the block's
  page, so exclusions keep applying without being rewritten.
- **Id backfill.** A migration assigns an id to every block that lacks one, in
  `Page.content` and in the stored Yjs document, using the same writer. From
  then on, `id` becomes mandatory in the schema.
- **Agent action log.** A table with token, person, tool,
  page, blocks, result and time.

## Security

Each case carries its integration test, like today's 32, and it is verified that
the test fails when the filter is broken.

- A block of an excluded page does not appear in `search` nor open with `fetch`,
  even with its id or its URL.
- A mention, subpage, synced block or embedded collection pointing to an
  inaccessible page reveals neither title nor content.
- An inaccessible URL or id answers the same as a nonexistent one.
- Nothing is written to a page without `pages:write` on it, nor is a row created in
  a collection with only `collections:read`.
- `move_page` and `move_blocks` require write at the source and at the destination.
- A locked page rejects every write.
- Property values are validated against the schema. Blocks, against
  `pageContentSchema`. Anything invalid is rejected whole, never half saved.
- There are caps per call (blocks, text and rows), in addition to the rate
  limit that already exists.
- If the owning person loses access, the token loses it on the next
  call.

## Phases

Each phase closes by testing it with Claude really connected, with its business
rules in `fea-tok` and `fea-mcp`, and with `check` and the tests at zero.

**F0 · Write foundations.** The collaboration transport forwarding
messages and closes to Hocuspocus, the ProseMirror schema in `packages/shared`
(structure without DOM; the portal adds the rendering), the Yjs writer,
`addBlocksToPageAction` on top of the writer, and properties by key. It fixes
findings 1 and 2 for people too.

> **Done on 2026-09-27**, verified in the browser. Besides what was planned,
> the following appeared and were resolved:
>
> - `UUID_PATTERN` only accepted UUID v1 to v5, and page ids are v7: every
>   live connection was rejected with `permission-denied`.
> - Each browser seeded the document when finding it empty; two at once
>   duplicated it. Now the server seeds in `onLoadDocument`.
> - With several tabs open, each one saved the content and cut its
>   own version. Now the server saves, in `onStoreDocument`, and does not cut a
>   version if nothing changed.
> - A locked page could be written through Yjs: only the editor
>   respected the lock.
> - `updateProperties` rewrote the content and read outside the transaction.
>   Now it locks the row and touches only the properties.
> - Autosave stayed marked as pending forever in development
>   (React's double mount left `isMountedRef` false) and warned about
>   "unsaved changes" on leaving.
>
> `PATCH /pages/:id` was retired, the only path that wrote content without going
> through the live document. Content is written with `PUT …/content` and
> `POST …/blocks`; the title with `PATCH …/title`; properties with
> `PATCH …/properties`.

**F1 · Read and find your bearings.** Mandatory ids and backfill, `PageBlock`, search by
block, Markdown for all blocks, `fetch`, `search`, `list_pages`, URLs, and
page "Copy link". Closes `AG-01` and `AG-03`.

> **Done on 2026-09-28**, tested with a real MCP client against the
> development server and in the browser. It ended up like this:
>
> - The tools are `search`, `fetch`, `list_spaces` and `list_pages`. The earlier
>   ones, `read_page` and `search_neuma`, were retired.
> - `fetch` opens a portal link (with or without locale), a page id or a block
>   id. A page arrives in Markdown with each block's id, its
>   properties if it is a row, its comments, what hangs from it and who
>   links it; a long page arrives in chunks, with a cursor. A block arrives with
>   its section and its page.
> - `search` returns blocks with their page, section and link, plus the
>   pages that match by title, and can be filtered by space, by root
>   page and by block type. It tolerates typos.
> - "Copy link" is in the page header, for everyone, and in its tree
>   menu.
>
> It departed from the plan in three points:
>
> - **Blocks do not go to `SearchDocument`.** A block id is only unique
>   within its page, because duplicating a page or moving blocks keeps the
>   ids, and `SearchDocument` requires a source id unique across the whole database. `PageBlock`
>   has the (page, block) key and its own text index. The portal's search
>   is still per page.
> - **The backfill is not a migration.** A separate process would overwrite the live document of
>   whoever has the page open. It is a maintenance task that runs inside the
>   backend, run by whoever administers the workspace (`POST /maintenance/pages/blocks`):
>   it gives ids to the pages that lack them and projects all of them. It can be run as
>   many times as needed.
> - **`id` is still optional in the schema.** The server assigns it on every
>   write (create, seed the live document and write to it), so content
>   without ids no longer gets in. Making it mandatory when reading would break stored
>   content the backfill has not touched yet, with nothing gained.
>
> Noted for later: a person property is delivered as the person's id,
> not their name; and search and backlinks read the same event
> queue, so with both projectors running one can take events away from the
> other.

**F2 · Collections.** `get_collection`, `query_collection`, `create_row`,
`update_row_properties` and the configuration of columns and views.

> **Done.** It departed from the plan in four points:
>
> - The action log (`AgentAction`) arrived in F2 and not in F3, because F2 is the
>   first phase that writes. It records what was done, rejected and failed.
> - `update_row_properties` ended up as `update_row`, which also changes the title.
>   Moving a task between columns is changing its status there.
> - The configuration ended up in four tools: `update_collection_columns`,
>   `create_view`, `update_view` and `delete_view`.
> - So that the agent follows the same rules as the portal, the key of a new column
>   (`buildPagePropertyKey`) and two view rules
>   (`removeSchemaView` and `makeSchemaViewDefault`) moved to `shared`.
>
> Haiku agents tested it with natural questions and only the MCP. Two more
> instructions were needed: note the team's tasks in Neuma and not in the
> agent's own list, and that a board can have its name in another language.
>
> A row's title and properties are saved in a single write
> (`updateProperties` accepts the title), so both things happen or neither.

**F3 · Write pages.** The `pages:write` and `pages:trash` tools.
Closes `AG-02`.

> **Done on 2026-09-30**, tested with integration tests against the real database,
> with haiku agents that receive vague requests and only the MCP, and in the browser.
> It ended up like this:
>
> - **Blocks.** `create_page`, `insert_blocks`, `update_block`, `move_blocks` and
>   `delete_blocks` write the whole block menu: text, headings, lists,
>   tasks, quotes, callouts, code, diagrams, formulas, tables, toggles,
>   index, subpages, embedded collections, buttons, columns, link
>   cards, embedded videos and synced blocks. Everything goes through the live
>   document, so whoever has the page open sees it instantly.
> - **Formatting.** Text carries bold, italic, code, strikethrough, underline,
>   color and highlight, and `update_block` paints a whole block. `fetch` returns
>   the same thing that is written: underline and colors as inline HTML, and
>   a block's colors in its anchor.
> - **Tables.** `update_table` changes cells, adds rows and removes them, without touching
>   the identity or the comments of the rest.
> - **Comments.** `comment_on_block` comments a block or some of its words,
>   signed by the person who owns the token; `delete_comment` removes it. `fetch`
>   shows each comment with its id.
> - **Whole pages.** `update_page` (title, emoji, remove the cover,
>   lock, verify and owner), `move_page`, `duplicate_page`, `trash_page` and
>   `restore_page`.
> - **Drawings checked on the server.** Before saving, the backend reads each
>   diagram with the same Mermaid as the portal (in a separate worker), each formula
>   with KaTeX and each icon against the packages the portal draws, and checks that
>   an architecture diagram groups correctly. If something fails, nothing is written and
>   the agent receives the error with the block number.
>
> It departed from the plan in five points:
>
> - `update_table_cell` ended up as `update_table`, which also adds and removes rows.
> - **Verifying, locking and assigning an owner got in**, in `update_page`, although this
>   plan left them out as trust acts. That is why they ask for a permission of
>   their own on the token, `pages:manage`, separate from writing: the full level
>   brings it and the read-and-write one does not, and only someone who can write grants it.
> - Sending to the trash, moving and copying with children ask for the permission across the whole
>   tree: if a page below has its own rule that does not allow it, nothing
>   is done and that page is named.
> - The action log opens the action as pending before writing and
>   closes it afterwards, so no write is left unrecorded.
> - What the agent cannot do: upload images, videos, audio and files, nor
>   set a new cover, because of the risk of the server fetching addresses
>   given by the agent. Page icons are emojis only; the portal's
>   symbols are left for later.
>
> Along the way the following were fixed in the portal: multi-line text that
> was cut off inside a diagram's boxes, a diagram frame that spilled off
> the screen (now bounded, with an adjustable height that is saved and zoom for whoever
> is looking), a synced diagram or formula that showed as code, and the
> "does not exist" on the first visit to a page created outside the portal.

F0 goes first because F2 and F3 write, and without F0 those writes are lost.

## To decide

1. **Write format.** Structured blocks with inline marks inside the text,
   as this plan proposes, or full Markdown as a shortcut too.
   The current contract asks for the former.
2. **Live properties.** With key-wise merging, nobody overwrites anybody. Making the
   agent's change show up live in an open task requires moving the
   properties into the Yjs document. This plan leaves that for after F3.
