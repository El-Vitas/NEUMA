# Functional Verification — Neuma

What the product **must be able to do**, written as behaviors observable in the interface, so they can be reviewed one by one.

## What this is for

This is not an inventory of what is done. It is the list of what must work. That something already exists in the code changes nothing: it is still tested, and still checked off. Several things already built are not convincing, and that is exactly the reason to review them.

Each item is written so it can be verified **by looking at the screen**, without reading code.

## The model being verified

**All content is a block.** A page is a tree of blocks; a paragraph, an image, a table and a collection are all blocks and support the same operations. The documents are ordered according to that model, not according to how the product is built inside.

That is why `01` does not talk about content types but about what can be done with any block, and a collection appears as one more block type before getting its own document.

## How to use it

1. Take a capability block (for example `BL-04`).
2. Test it in the running application: `bun run dev`, portal at `http://localhost:3010`.
3. Check each box that is met. The ones that are not stay unchecked.
4. What remains unchecked is implemented or fixed.
5. The whole block is tested again until all the boxes are checked.
6. Only then do you move on to the next block.

**Rules for whoever accompanies the review:**

- No block is considered good until El-Vitas has tested it. An agent's opinion about whether "it's already done" closes nothing.
- One block at a time. No bundling five features into a single round of comments.
- If testing reveals an expected behavior that is not on the list, it is added as a new box. The list grows with what is discovered by using the product.
- The boxes describe behavior, never implementation. If an item can only be verified by reading code, it is badly written.

## Documents

| Document | Covers |
|---|---|
| `01-blocks.md` | The block as a unit: create, select, drag, nest, convert, link |
| `02-block-types.md` | The type catalog, collection included |
| `03-writing-and-formatting.md` | Writing inside a block: markdown, formatting, mentions, saving |
| `04-pages-and-navigation.md` | Create, nest, move, trash, favorites, tree, search |
| `05-collections-properties-views.md` | Property types, table, board, filters, sorting, calculations |
| `06-collaboration-and-permissions.md` | Simultaneous editing, comments, history, permissions, publishing |
| `07-knowledge-graph.md` | Mentions, backlinks, unlinked mentions, graph |
| `08-agents-and-experience.md` | MCP, dark mode, shortcuts, mobile, empty states |
| `09-import-and-export.md` | Markdown, PDF, CSV, bulk export, importing from other tools |
| `10-templates.md` | Choosing when creating, factory and custom templates, row templates |
| `11-administration-and-account.md` | Invitations, roles, groups, audit, profile, sessions |
| `12-automation-and-integrations.md` | Triggers, buttons, recurrence, reminders, AI |
| `13-performance-and-limits.md` | Large collections, long pages, memory, limits |
| `14-change-review-and-approval.md` | A verified page with owners is not edited: changes are proposed, and they approve, reject or request changes |

## Suggested order

From what holds everything else up to what is used least:

1. `01` — blocks. This is the foundation: if moving or nesting does not work, nothing that follows feels finished.
2. `02` — block types.
3. `03` — writing and formatting.
4. `04` — pages and navigation.
5. `05` — collections and views.
6. `10` — templates. It goes after collections because a template reproduces them.
7. `07` — knowledge graph.
8. `06` — collaboration and permissions.
9. `14` — review and approval. It goes right next to `06`: it relies on its suggestion mode (`CL-10`), its comments and its history, and cannot be tested before them.
10. `11` — administration and account.
11. `09` — import and export.
12. `12` — automation and integrations.
13. `08` — agents and detail.
14. `13` — performance. It is reviewed last, but the data volume is seeded from the start.

One warning that follows from this: that a collection is a block **inside** a page —and not a whole page— is the step that `../../architecture/adr/008-adopt-single-page-primitive.md` deliberately left out. The boxes are written anyway, because they describe what the product must do; meeting them implies revisiting that decision.

## How the result is recorded

At the end of each document there is a log. It records the date, the block, and what was missing. A block with no row in the log is a block that has not been reviewed.
