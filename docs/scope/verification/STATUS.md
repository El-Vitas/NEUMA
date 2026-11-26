# Status of the verification documents

Review of 2026-08-22. How up to date each document is and why.

## The diagnosis, in one line

Documents `05` through `13` **are not written with the old model**: they talk
about blocks and about rows that are pages, which is the right model. What
happened to them is something else — they were written on the day of the turn
and nobody opened them again while the product moved forward. Their `0/756`
does not say "nothing is done", it says "nobody has measured".

## How this came about

`git log` over the folder: documents `05` through `13` and the `README` all
have the same date, the date of the turn to the block model. Documents `01`
through `04` kept changing afterwards, as things were built. The other nine
were left there.

## What was corrected in this review

- **Nine of thirteen titles did not match their file's number** — a fossil
  from when the three block documents were inserted at the beginning and the
  files were renumbered without touching the headings. Fixed.
- **A wrong business rule was corrected, and the mistake was an agent's.** It
  said that several pages come out in a single file. Nobody decided that: it
  was a design choice made while building the export and recorded as if it were
  a product decision. What was decided is **one file per page**, and several
  pages in an archive whose folders are their hierarchy — a collection always
  archived, because each row is a page. The old rule is left `superseded`;
  document `09` asks for the right thing again.
  **And it was built:** one page comes out as Markdown, several come out
  archived with one file per page and the folders as hierarchy. Checked against
  the API on 2026-08-22.
- **What was missing from `09` and could be built was built.** Exporting a
  loose selection of pages from the sidebar; attachments travel inside the
  archive, in an `assets` folder; and links between exported pages point to the
  neighboring file by relative path, leaving the link to a page that did not
  travel intact. Checked in the browser on 2026-08-22.
  The progress notice for a large export **was not built**: it needs background
  tasks, which do not exist.
- **A box in `04` was wrongly checked, and I was the one who checked it.**
  "They can all be exported together" lives under *acting on several pages at
  once*, that is, on the selection. The export exists, but per page, per branch
  or for a whole space: selection mode offers move and trash, not export.
  Returned to unchecked.

## What remains to be measured, document by document

Nobody has run these documents against the application. This is what is known
from reading the code, and it is useful for knowing where to start — **it does
not replace testing it on screen**.

| Doc | Built | Not built |
|---|---|---|
| `04` pages | create, nest, move, trash, cover, icon, lock, multi-select | a page being a collection or a canvas (`PG-22`, `PG-23`) |
| `05` collections | 8 property types; table and board with a view bar; dragging cards between columns, also by keyboard; configuring the shape after creating the collection (adding and removing properties, options and colors); filtering, sorting and grouping on the server; embedded collection | column handling, choosing the grouping from the screen, on-screen filters, what a card shows, changing a property's type, link/email/phone, files as a property, relations, calculations, formulas, automatic data; list, gallery, calendar and timeline views |
| `06` collaboration | simultaneous editing, block comments, versions, space visibility, private | publishing outward, navigable history |
| `07` graph | mentions, backlinks | unlinked mentions, visual graph |
| `08` agents | MCP, dark mode, shortcuts | to be measured |
| `09` import/export | export to Markdown (page, branch, selection, space), with attachments and relative links | importing anything, PDF, HTML, CSV, copy as Markdown, print, progress notice |
| `10` templates | nothing | everything |
| `11` administration | users and roles | groups, invitations, audit |
| `12` automation | the button block | triggers, recurrence, reminders, AI |
| `13` performance | nothing measured | everything |
| `14` review and approval | the loose pieces: verifying a page, a responsible person, manual lock, block comments | everything else — protecting the verified page with owners, proposing instead of editing, approving, rejecting, requesting changes with a comment, applying, trail |

## What was put in order

- **The gap at `CO-04` was closed** by renumbering what came after it. The
  numbering of the thirteen documents is left with no gaps or repeats, and each
  title matches its file's number.
- **Each document from `05` to `13` now says, in its header, what exists built
  and what does not.** With a warning that cannot be skipped: that is useful
  for knowing where to start testing, **not for skipping the test**. Nothing is
  checked off for having read the code.
- **The expensive part of `05` was set aside.** Relations, calculations,
  formulas, calendar and timeline are left in a section of their own: while it
  exists, the document is considered complete without them. They are not more
  properties — they need a dependency graph and recalculation, which is half a
  database engine.
- **`VW-03` was added, the handling of the board's columns.** Dragging cards
  was already there; being in charge of the columns was not. Adding, renaming,
  reordering, coloring, collapsing, limits per column and subgroups — which is
  what makes a board a kanban and not a list in columns. It goes right behind
  the board, not at the end.

## The direction taken on 2026-08-22

The product aims to be composable, and not to add loose features. That rests on
three separations:

- **The data does not know how it looks.** A set of pages with properties is
  drawn as a table, board or calendar without the data changing.
- **The view is a piece, not a place.** The data view lives apart from the block
  that hosts it, with its view types and its property types pluggable. Adding a
  calendar does not force touching the block.
- **Where it is mounted is another decision.** The same view works occupying a
  whole page or tucked inside another, and the data is the same in both cases.

Three new verification blocks came out of that: `PG-22` (a page can be a
document, a collection or a canvas), `PG-23` (the page as a canvas) and `CO-07`
(the collection looks the same wherever it is).

What is missing is separating that piece. We have the right page model
—a collection **is** a page, and its rows are its children— with the view
wired into a component that only knows how to draw itself at the end of the
page.

## What remains to be decided

1. **Documents `10` and `12` describe a product that does not exist** except
   for the button block. They already say so in their header, but it has to be
   decided whether they are the next stage or whether they wait.
2. **`13` is not pruned, it is run.** Everything in it is measured over what
   already exists.
3. **`14` has nothing left to decide.** Its four questions —who can bypass the
   protection, who chooses the approvers and how many are needed, what happens
   when the seal expires, and whether applying a proposal renews it— were
   answered on 2026-09-10 and written down in that same document. What remains
   is building it, and it cannot be started without `CL-10`.
   **Its business rules are not recorded yet.** The `docs/business-rules/`
   registry only accepts `active` rules, and an active rule about something
   nobody built lies to whoever consults the registry. The distinction holds
   for this whole folder: **these documents say what the product must do; the
   rules registry says how it behaves**. When a block is built and verified,
   that is when its decisions become rules.
