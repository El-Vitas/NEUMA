# 01 · Blocks

All content is a block. This document is not about which types exist —that is `02-block-types.md`— but about what can be done with **any** of them.

> Read this folder's `README.md` before using this document.

The rule that holds everything else up: **if an operation works for a paragraph, it works for a table, an image, a diagram and a collection.** Every time an operation works on some types and not on others, it is a failure, not an acceptable limitation.

---

## BL-01 · It must treat all content as blocks

- [x] Each piece of a page's content is an independent block
- [x] A block can be pointed at and acted on without touching the ones next to it
- [x] Blocks have an explicit order that is kept on reload
- [x] A block can contain other blocks
- [x] A page is a tree of blocks, not plain text with formatting
- [x] A collection is just another block, not a separate screen

## BL-02 · It must allow creating a block at any point

- [x] Enter at the end of a block creates the next one
- [x] Enter in the middle of a block splits it in two
- [x] `/` opens the insertion menu next to the cursor
- [x] Typing after `/` filters the options
- [x] The arrows move through the menu and Enter inserts
- [x] Escape closes the menu without inserting anything
- [x] `/` also opens the menu in the middle of a sentence, if it comes after a space
- [x] `/` attached to a word does **not** open the menu, so as not to get in the way in paths or dates
- [x] With the menu closed, Enter never runs a command by accident
- [x] The menu offers only block insertion, not bold or undo
- [x] Options are grouped by type, with an icon
- [x] Recently used ones appear first
- [x] There is a visible point to add a block at the end of the page
- [x] When hovering between two blocks, a point to insert there appears

## BL-03 · It must allow selecting blocks

- [x] Escape leaves text editing and selects the whole block
- [x] A selected block is visually distinguished
- [x] Dragging the mouse selects several blocks
- [x] Shift+click extends the selection to another block
- [x] Shift+arrows extends the selection with the keyboard
- [x] Ctrl+A selects the block first, then the whole page
- [x] It shows how many blocks are selected when there are several
- [x] A click outside undoes the selection

## BL-04 · It must allow moving a block with the mouse

**How to test it:** hover over a block and look for the handle on its left.

- [x] When hovering over a block, a handle appears on its left
- [x] Dragging the handle, the block moves
- [x] While dragging, a line shows where it will land
- [x] It can be dropped above, below and between other blocks
- [x] It can be dropped inside a toggle, a column or a cell
- [x] Several selected blocks can be dragged at once
- [x] When dragging several, it shows how many are being moved
- [x] Dragging near the top or bottom edge scrolls the page on its own
- [x] Dragging while holding Alt leaves a copy instead of moving
- [x] Dropping outside a valid target cancels without damaging the content
- [x] The move can be undone with Ctrl+Z
- [ ] It works the same with images, tables, code, diagrams and collections

## BL-05 · It must allow moving a block with the keyboard

- [x] There is a shortcut to move the current block up one position
- [x] There is a shortcut to move it down
- [x] It works with several blocks selected
- [x] The shortcut appears in the application's shortcut list

## BL-06 · It must allow nesting a block inside another

**How to test it:** write two loose paragraphs and press Tab in the second.

- [x] Tab indents the current block and nests it under the previous one
- [x] Shift+Tab unnests it
- [x] It works with paragraphs, not only with lists
- [x] It works with headings, quotes, images, tables, code and collections
- [x] A nested block can in turn have nested blocks
- [x] The indentation is clearly visible
- [x] Moving the parent block drags its children along
- [x] Deleting the parent asks or preserves the children, but does not silently delete them
- [x] Several selected blocks can be indented at once
- [ ] The nesting survives a reload and is exported correctly

## BL-07 · It must allow converting a block into another type

**How to test it:** put the cursor in a block, press Escape to select it and use **Turn into** in the bar that appears.

- [x] A block can be converted into another type keeping its text
- [x] Converting between paragraph, heading, quote, list, task and callout works in both directions
- [x] Converting a list into paragraphs produces one block per item
- [x] Converting several selected blocks converts them all
- [x] A conversion that would lose content is warned about beforehand
- [x] An impossible conversion is not offered, instead of failing when applied
- [x] The conversion is undone with Ctrl+Z

## BL-08 · It must allow duplicating and deleting

**How to test it:** Ctrl+D duplicates; Ctrl+Shift+Backspace deletes. Both appear in the shortcut list.

- [x] A block can be duplicated, and the copy lands right below
- [x] A block can be deleted
- [x] Backspace at the start of an empty block deletes it and moves the cursor up
- [x] Several selected blocks can be duplicated and deleted
- [x] Duplicating a block with children also duplicates the children
- [x] Deleting can be undone with the content intact

## BL-09 · It must offer an actions menu per block

**How to test it:** click the block's handle —without dragging it— or press Ctrl+/ with the cursor inside.

- [x] Next to the handle there is a menu of the block's actions
- [x] It offers convert to, duplicate, delete, copy link and move to
- [x] It offers text and background color
- [x] It offers comment
- [x] Actions that do not apply to that type do not appear, instead of failing
- [x] The menu opens with the keyboard, not only with the mouse
- [x] Escape closes it

## BL-10 · It must allow coloring a block

**How to test it:** open the block's menu (click on the handle or Ctrl+/) and use **Text colour** or **Background colour**.

- [x] The text color of a whole block can be changed
- [x] A background color can be set on the block
- [x] There is a limited palette, not a free picker
- [x] The colors read well in light mode and in dark mode
- [x] The color can be removed and go back to the default
- [x] It can be applied to several selected blocks

## BL-11 · It must allow referring to a specific block

**How to test it:** open the block's menu (Ctrl+/) and use **Copy link**; paste the address in another tab.

- [x] Each block has a stable identity that survives editing its neighbors
- [x] A block's link can be copied
- [x] When opening that link, the page scrolls to that block
- [x] The block is highlighted for a moment on arrival
- [x] The link keeps working after moving the block within the page
- [x] A link to a deleted block gives a notice, instead of failing silently

## BL-12 · It must allow commenting on a block

**How to test it:** open the block's menu (Ctrl+/) and use **Comment**; for a fragment, select text and use **Comment** in the bar that appears over the selection.

- [x] A block can be commented on from its menu
- [x] A text fragment within the block can be commented on
- [x] The commented block is distinguished
- [x] Moving the block does not detach its comment
- [x] Converting the block to another type does not lose the comment
- [x] The commented fragment is distinguished and clicking it opens what was said

## BL-13 · It must allow taking blocks to another page

**How to test it:** block menu (Ctrl+/) → **Move to…**; for the last box, drag the block by its handle to a page in the side tree.

- [x] A block can be moved to another page from its menu
- [x] The destination page is searched by typing
- [x] It works with several selected blocks
- [x] The blocks disappear from the source and appear in the destination
- [x] The children travel with the parent
- [x] It offers to go to the destination page after moving
- [x] A block can be dragged to the side tree to turn it into a page

## BL-14 · It must allow converting a block into a page

**How to test it:** block menu (Ctrl+/) → **Turn into a page**.

- [x] A block can be converted into a child page
- [x] Its content becomes the new page's content
- [x] In the original place, a link to that page is left
- [x] It works with several selected blocks at once
- [x] The new page appears nested in the side tree

## BL-15 · It must apply the operations to all types equally

**How to test it:** take the list of types from `02-block-types.md` and test the operations above on each one.

- [x] Dragging works on all types
- [x] Nesting works on all types
- [x] Duplicating works on all types
- [x] Deleting works on all types
- [x] The block menu appears on all types
- [x] Copy link works on all types
- [x] Selecting together with other blocks works on all types
- [x] No type is left as an island that can only be edited from the inside

## BL-16 · It must preserve blocks it does not understand

**How to test it:** a page is needed that already contains a block of a type this version does not know; it can be written directly in the database, which is the real situation —a page written by a newer version.

- [x] A block of an unknown type does not break the page
- [x] It is shown as an identifiable placeholder
- [x] It is kept when saving, instead of disappearing
- [x] It can be deleted on purpose
- [x] The rest of the page remains editable

## BL-17 · It must undo any block operation

- [x] Ctrl+Z undoes insert, move, nest, convert, duplicate and delete
- [x] Ctrl+Shift+Z redoes
- [x] An operation over several blocks is undone entirely, not block by block
- [x] Undoing does not revert the changes someone else made at the same time

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| 2026-08-11 | BL-01 | Nothing. Inserting it from the `/` menu remains pending in `TB-23`, not here. | 6 of 6 |
| 2026-08-11 | BL-03 | Nothing. Dragging and shift+click produce text selection over several blocks, which is the editor's native behavior. | 8 of 8 |
| 2026-08-11 | BL-02 | Nothing. The `/` rule was changed: it now opens in the middle of a sentence after a space. | 14 of 14 |
| 2026-08-12 | BL-06 | **Exporting a page**, which does not exist yet; the nesting does survive a reload. Three things were fixed along the way: only the cursor's block was being nested (now, all the selected ones), what has nowhere to write was not being nested (image, collection), and deleting the parent took the children with it because Escape selected the whole nesting. | 9 of 10 |
| 2026-08-12 | BL-05 | Nothing. There was no shortcut list, so one was created: the editor binds its keys and the panel shows them from a single list, so a shortcut cannot be announced without working nor work without being announced. | 4 of 4 |
| 2026-08-12 | BL-17 | **The history of a shared page**: undo used this screen's history, which does not know who wrote what, so on a page written among several people it would have undone others' work along with one's own. Now, when the page is written with others, the shared document's history answers; undo and redo ask which one is in charge, so the same keys work in both cases. Along the way it turned out that **on a shared page nothing could be undone**: the identity given to a new block marked its change as "not history", and that dragged the whole batch down — now it travels as part of the change that asked for it, which is what the single-screen history already did. Verification caveat: not touching others' work is proven against two truly synchronized documents, with the same wiring as the application, but not in two tabs, because today **what is written in one does not reach the other**; that is a matter for `CL-01`, which remains unverified. | 4 of 4 |
| 2026-08-12 | BL-16 | **Everything**: a page with a block of an unknown type would not open, it answered "Page not found" —the contract rejected the whole document because of that block, and the page was lost with it—. Now the contract accepts what it does not know and stores it as is, without reading inside: a block that is known is still rejected if malformed, because being wrong is not the same as being new. The editor holds it as a marker that says what type it is ("Unsupported block · diagram"), and when saving it returns it word for word: it was checked in the database that, after writing in the rest of the page, the `diagram` block came back identical. It can be selected and deleted like any other. What we do not understand is not rewritten: a version that does understand it will find it as it was left. | 5 of 5 |
| 2026-08-12 | BL-15 | **The callout and the quote were islands**: the handle that appeared over them always belonged to the line inside, so dragging them emptied them instead of moving them, and the mouse pointed to a different block from the one the keyboard answered to. Now only what exists to contain blocks hands over its inside —the page, a column, what hangs from a nesting—, and the table remains the exception that is taken whole. A page was tested with the ten types that can be written today (paragraph, heading, bullets, numbered, tasks, quote, callout, code, table, toggle) plus an image: on all of them the handle and the menu appear, and all of them are duplicated, deleted, nested, dragged and selected together with others —four blocks of different types at once—, with Ctrl+Z undoing each operation. Types that cannot yet be inserted from the editor (collection, embed) and those that do not exist remain unexercised. Along the way three things appeared for their own blocks: `[]` does not create a task, ``` does not create a code block, and the `/` menu search does not ignore accents (in the Spanish catalog, `/codigo` does not find "Bloque de código"). | 8 of 8 |
| 2026-08-12 | BL-14 | The action was missing in the menu, not the operation: converting blocks into a page had already been built for dragging to the tree, so both ways of requesting it are now the same —the blocks travel whole and the page is titled with its first line— and the only thing that changes is whose child it is and what is left in its place. From the menu, the page is a child of the one being written and where the blocks were a link is left: the same mention that is written with `@`, one single way of pointing to a page wherever it comes from. | 5 of 5 |
| 2026-08-12 | BL-13 | **Moving several blocks moved only one**: when going from the menu to the destination picker, the menu's block was chosen again, and that released the others. Now, changing what a block is asked does not touch what the page has taken. **Dragging a block to the side tree** was also missing: the tree says which rows can receive blocks and which page each one is, and the editor reads it; on drop, the blocks —with what hangs from them— become a child page titled with their first line, leave this one, and the notice offers to go see it. | 7 of 7 |
| 2026-08-12 | BL-12 | **Commenting from the menu opened nothing**: when choosing "Comment" or "Move to…", the menu took its leave by closing exactly what it had just opened. Now each surface closes its own —the menu closes the menu, the dialog closes the dialog— and not what another opened. **Commenting on a fragment** was also missing: it was created as a mark over the text that only says which comment it is about; what was said is still stored by the block, so commenting on a phrase and commenting on the whole block are the same thing stored in a single place, and that is why the fragment survives moving and converting. The commented fragment is underlined and clicking it opens the conversation; deleting the comment removes its underline. | 6 of 6 |
| 2026-08-12 | BL-11 | Nothing. Each block already had the identity; what was missing was checking it: it survives writing next to it, moving the block, nesting it, converting it and saving the page. The link is copied with that identity, and when opening it the page waits to be drawn before deciding —looking only once always found nothing— and only then highlights the block or warns that it is no longer there. One verification caveat remains: following a link to a block **on the page already being read** only changes the address, it does not reload; that was implemented and is covered by tests, but I could not confirm it in the browser —the development server served old code several times in that session. | 6 of 6 |
| 2026-08-12 | BL-10 | Nothing. All of dark mode was missing —the `.dark` tokens did not exist—, so it was created: the server reads from a cookie how each person reads and sends the page already dressed, with no flicker, and the account menu offers light, dark or follow the system. The colors were measured in the browser in both modes: in light, orange (3.34) and yellow (2.74) did not reach the legible minimum of 4.5:1 and were darkened —now all eight go from 4.59 to 7.04—; in dark they go from 5.59 to 13.48, and the text over each background, from 12.9 to 17.6. The night backgrounds became a tint of the color over the page, not a solid block. | 6 of 6 |
| 2026-08-12 | BL-09 | Nothing. A click on the handle that goes nowhere opens the menu, dragging it still moves the block, Ctrl+/ opens it without a mouse and Escape closes it returning the cursor. In order not to offer actions that fail when chosen, they had to be built: color lives as an attribute of every block (next to its identity, in a single place), the comment is stored by the block itself and therefore travels with it, the link points to the block and on arrival the page scrolls and highlights it, and moving to another page appends the blocks to the end of the chosen one before taking them out of this one. The destination picker reads the space's pages instead of the search, which in this environment returns zero results even for old pages. | 7 of 7 |
| 2026-08-12 | BL-08 | Nothing. Duplicate and delete read the blocks the same way convert does —a single answer to which blocks a gesture looks at—, so the copy takes along what hangs from the block and gets an identity of its own, and deleting the last block leaves a page where one can still write. | 6 of 6 |
| 2026-08-12 | BL-07 | Nothing. Two types of the contract were missing —**task** and **callout**—, so they were created: the task is checked from the page itself, not from the browser's checkbox, so that what is done lives in the block. The conversion is born from a single list of destination types: each one is assembled and measured against the place where the block lives before being offered, so what appears in the menu is what the editor can do, and what would leave something behind warns beforehand. | 7 of 7 |
| 2026-08-12 | BL-04 | **Diagrams**, which do not exist as a block type; images, tables, code and collections do move. Along the way columns were born (dropping at a block's edge splits the row, with a separator to distribute the width) and the toggle came to open and be titled. | 11 of 12 |
