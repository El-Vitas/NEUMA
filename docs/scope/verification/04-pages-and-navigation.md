# 04 · Pages and navigation

Creating pages, organizing them, finding them again.

> Read this folder's `README.md` before using this document.

---

## PG-01 · It must allow creating a page

- [x] There is a visible button to create a page from the space
- [x] There is a button to create a child page from any page in the tree — the "+" on the row and "Create child page" in the three dots
- [x] The new page opens ready to write, with the cursor in the title
- [x] It does not force filling in a form before starting to write — the page is created empty and one lands inside it; the title is saved on its own (verified against PostgreSQL without pressing anything)
- [x] It appears immediately in the side tree
- [x] It can be created with a keyboard shortcut — `Ctrl`/`Cmd` + `Shift` + `N`, in the space where one is; it carries Shift so as not to fight with the browser's shortcut, and it stays silent while writing
- [ ] When creating it, a template can be chosen instead of starting blank

## PG-02 · It must allow nesting pages without limit

- [x] A page can contain child pages
- [x] A child can have its own children, and so on — verified with a real grandchild
- [x] The hierarchy is seen in the side tree with indentation
- [x] Each branch can be collapsed and expanded
- [x] The collapsed state is kept when navigating between pages
- [x] A deep branch remains legible — the indentation stops growing from the sixth generation, so a deep branch keeps the width of the name; long names are cut with an ellipsis and are read in full on hover

## PG-03 · It must allow titling the page

- [x] The title is written above the content, not in a separate field
- [x] Enter in the title goes down to the body — the cursor enters the editor and what is typed lands there
- [x] The title updates in the side tree while writing
- [x] A page without a title shows a clear placeholder text ("Untitled")
- [x] The title appears in the browser tab — "Page name · Neuma", both on server load and when renaming live

## PG-04 · It must allow putting an icon on the page

**How it should feel:** the button appears when hovering over the header and takes no space when the page has no icon.

- [x] There is a button to add an icon above the title
- [x] An emoji can be chosen
- [x] An image can be uploaded as an icon
- [x] There is a random icon option — per tab: in Emoji it draws an emoji, in Icons a symbol
- [x] The icon is seen in the side tree, at the same size as the default mark
- [x] The icon is seen in search results and in mentions
- [x] It can be removed

**Beyond what was asked:** there are 1910 icons from the library in a second tab, searchable by name and by
meaning in Spanish and English, with a color to choose. The icon is also changed and the page is renamed from
the three-dots menu of the tree, without opening it.

**Spaces also carry an icon** (same window, without the image option: at that size a photo cannot be read) and
are renamed from the same menu. It is seen both in the tree and in the collapsed bar.

## PG-05 · It must allow a cover image

**Withdrawn on 2026-08-17 and rebuilt on 2026-08-18 at El-Vitas's request** — "make it work well since it
was not working". What got in the way and no longer does: the button took a row of its own above the title on **every**
page without a cover; the whole image was a slider that moved and saved with any drag; and
`touch-none` was always set, so on touch the finger did not scroll the page over the band.

**Where to look at the interaction:** same reference as PG-04.

- [x] There is a button to add a cover — it lives among the controls on the right, next to information and typography; it reserves no space of its own
- [x] An image of one's own can be uploaded — verified with a real 6000×3375 photo (7.6 MB)
- [x] It can be repositioned vertically — it is a mode that is entered and left; with arrows and drag, and it **does not save until asked**
- [x] It can be changed and removed — verified against PostgreSQL and against the disk: the previous image is deleted
- [x] It does not push the content in a way that gets in the way of writing — without a cover, the first element is the header: zero space reserved

## PG-06 · It must show where one is standing

- [x] Above the page the path from the space to this page is seen
- [x] Each segment of the path is navigable with a click — the current segment is not a link, as it should be
- [x] A very deep path is shortened without losing the last segment — with nine segments the space, the last two ancestors and the page are shown; the intermediate ones unfold from "…"
- [x] The path updates when moving the page — verified moving to grandchild and back to root

## PG-07 · It must allow moving a page

- [x] It can be moved to another parent — from "Location" in the page's panel
- [x] It can be moved to another space — verified against PostgreSQL, there and back
- [x] It can be converted into a root page of the space
- [x] The destination is searched by typing, not in an endless dropdown — a list grouped by space that narrows as one types
- [x] Child pages move together with the mother — verified with a real child: it changed space with its mother, and the index received its own notice
- [x] A page cannot be moved inside itself or its descendants — its own branch does not appear among the destinations, it is not only rejected afterwards
- [x] After moving, existing links and mentions keep working — an address with the old space leads to the page in its new space
- [x] When moving it to a space where someone loses access, a warning is given beforehand — it says how many people and asks for confirmation; if nobody loses access the move happens without any extra step

## PG-08 · It must allow duplicating a page

- [x] There is a duplicate option
- [x] The copy keeps the content, the properties and the icon
- [x] The title indicates that it is a copy
- [x] One can choose whether child pages are also duplicated
- [x] The copy ends up next to the original in the tree

## PG-09 · It must allow sending a page to the trash

- [x] There is a delete option accessible from the page and from the tree
- [x] It asks for confirmation before deleting
- [x] The page disappears from the tree and from search results
- [x] The children go to the trash with it
- [x] It warns how many child pages are going to be deleted
- [x] Mentions of that page in other pages indicate that it was deleted — they are struck through, say "deleted" and explain on hover; a mention of a page the screen does not have at hand is drawn normally, because not knowing is not knowing that it was deleted

## PG-10 · It must allow viewing and recovering what was deleted

- [x] There is a screen that lists the pages in the trash
- [x] It shows when each one was deleted and by whom
- [x] The trash can be searched
- [x] A page can be restored and it returns to its original place
- [x] If its parent no longer exists, the restore explains where it ended up — it says whether it returned under its mother or to the root of the space. The case of the mother deleted **forever** is left out: `parentId` has `ON DELETE SET NULL`, so when deleting her the link is lost at that instant and on restoring there is nothing left that distinguishes that child from one that always lived at the root
- [x] Restoring a mother offers to also restore her children

## PG-11 · It must allow deleting permanently

- [x] From the trash a page can be deleted forever
- [x] The confirmation makes it clear that there is no going back
- [x] The whole trash can be emptied
- [x] That page's attached files are also deleted — verified against the disk: the file disappeared from `uploads/file-assets`, and the confirmation warns about it

## PG-12 · It must allow marking pages as favorites

- [x] There is a star or similar on the page
- [x] Favorites appear in a section of their own above the tree
- [x] Favorites can be reordered
- [x] A page can be removed from favorites from both places

## PG-13 · It must allow going back to what is recent

- [x] There is a list of recently visited pages
- [x] It is one click or one shortcut away
- [x] It shows the space each one belongs to ("In Engineering")
- [x] It does not repeat the same page several times — visited several times, it appears only once

## PG-14 · It must show the page's data without getting in the way

- [x] Properties are seen above the content, compact — checked with a real row of the "Tasks" collection: status, owner, priority, date and description, above the editor
- [x] A page without properties does not show an empty panel — the emptiness is no longer announced, and the button stopped calling the location and the attachments "properties", which they are not
- [x] Each property is edited in the same place where it is seen, without opening another screen — edited in the field and persisted in the database without opening anything
- [x] With many properties they fold and there is a "show more" — tested with "Show 2 more properties"
- [x] The location and the attachments are seen right there, not in a separate panel
- [x] The block does not push the content down so far that one has to scroll to write — folded by default
- [x] On a narrow screen it remains usable — walked through at 320 px without overflow

## PG-15 · It must allow attaching files to the page

- [x] Files can be uploaded to the page
- [x] Name, type, size and who uploaded it are seen
- [x] They can be downloaded — real download executed
- [x] They can be deleted — with confirmation
- [x] A notice is given if the file exceeds the allowed size — with 11 MB: "This file is larger than 10 MB and cannot be uploaded."
- [x] The upload progress is seen — a bar without a percentage, on purpose: the system does not know one and does not invent it
- [x] A file inserted in the content also appears in this list — checked by dropping a file onto the editor: it stays in the content and in the list. It was not broken; it was untested

## PG-16 · It must report on the page

- [x] Who created it and when can be seen
- [x] Who last edited it and when can be seen
- [x] The word count can be seen
- [x] This information does not take up permanent space on screen

## PG-17 · It must allow adjusting how the page looks

- [~] The page can be switched to full width — it is no longer chosen: every page is full width since 2026-08-18, because the alternative added nothing
- [x] The text size can be reduced
- [x] The typography can be chosen among a few options — System / Serif / Monospace, applied without reloading
- [x] The choice is saved per page, not globally
- [x] The change is applied without reloading

## PG-18 · It must allow locking a page

- [x] A page can be locked against accidental edits
- [x] Locked, the content is read but not edited
- [x] It is clearly seen that it is locked
- [x] Whoever has permission can unlock it
- [x] The lock also applies to the properties

## PG-19 · It must allow acting on several pages at once

- [x] Several pages can be selected in a list — explicit selection mode in the tree
- [x] They can all be moved together to another parent or space
- [x] They can all be sent to the trash together — selecting a mother and a child does not act twice: the mother's cascade already covers it
- [x] They can all be exported together — they come out archived, with their attachments and the folders where they lived
- [x] It is seen how many are selected — in view and announced by `aria-live`
- [x] The action can be canceled before being applied

## PG-20 · It must allow knowing whether a page is trustworthy

> What is reviewed here is **whether** a page is trustworthy. What that
> requires —that a verified page with owners stop accepting direct editing and
> its changes go through approval— is reviewed in
> `14-change-review-and-approval.md`.

- [x] A page can be marked as verified
- [x] Who verified it and when is seen
- [x] A date can be defined on which the verification expires — the chosen day counts whole, it does not expire at midnight
- [ ] When it expires, the page indicates it and notifies whoever maintains it — the page **does** indicate it ("Verified · expired"), verified by moving the date into the past without touching the page. The notice to whoever maintains it was not built: there are no notifications or scheduled tasks in the system
- [x] A person responsible for the page can be assigned
- [x] Search can be filtered by verified pages — the filter is resolved against `now()` at the moment of the query, so a page that expires stops appearing without anyone rewriting it

## PG-21 · It must report on the page's use

- [x] How many times the page has been viewed can be seen — the same person does not count twice within half an hour
- [x] Who viewed it and when can be seen
- [x] Whoever has no permission to administer does not see this information — the control is not drawn for them, and the server also rejects whoever asks for it on their own
- [x] This log can be turned off — turned off it stops **storing**, not only showing: checked by visiting pages with the log off and seeing that the count did not move

## PG-22 · It must allow a page to be more than a document

> A page does not change nature depending on how it is shown. It is the same
> page, with the same name, the same place in the tree and the same permissions,
> and the only thing that changes is what takes up the screen when opening it.
> That is why going from one presentation to another cannot lose anything.
>
> What is seen **inside** a page that is presented as a collection is reviewed
> in `05-collections-properties-views.md`.

- [ ] When creating a page, one chooses what it will be: document, collection or canvas
- [ ] An existing page can be changed from document to collection
- [ ] An existing page goes back from collection to document without losing the rows or their values
- [ ] A warning says what is left out of view before changing presentation
- [ ] The side tree distinguishes by its icon what each page is
- [ ] A page that is not a document keeps name, icon, cover, permissions and trash just like any other
- [ ] An entry text can be written at the top, whatever the presentation
- [ ] Opening a row or a card leads to a normal page, with its editable body
- [ ] A mention of a page shows what it is before opening it

## PG-23 · It must offer a page as a canvas

> The canvas is the same page looked at in another way, not a separate file.
> What was written as a document is still there when looked at as a canvas.

- [ ] A page can be seen as a free-space canvas
- [ ] One toggles between document and canvas without losing content
- [ ] One chooses which of the two is that page's main form
- [ ] On the canvas, text, images and shapes are placed wherever one wants
- [ ] One can zoom in, zoom out and frame everything there is
- [ ] Two elements are connected with an arrow that follows them when they are moved
- [ ] Another page can be brought onto the canvas and seen inside it
- [ ] A collection view can be brought onto the canvas
- [ ] What is done on the canvas is saved on its own, just like the document
- [ ] Two people on the same canvas see each other work

---

## NV-01 · It must offer a side tree with the whole structure

- [x] The tree shows the spaces and, inside them, the nested pages
- [x] There is a single tree, not several lists competing
- [x] The open page is highlighted in the tree
- [x] When opening a deep page the tree unfolds down to it — reloading directly on a grandchild, it appears visible and highlighted
- [~] The tree can be hidden to gain reading width — the dedicated control was withdrawn on 2026-08-18 for duplicating the bar's collapse; collapsing the bar is the gesture
- [x] The tree's width can be adjusted by dragging
- [x] A tree with many pages scrolls without getting slow — 600 expanded pages: 145 fps on average, worst frame 9 ms

## NV-02 · It must group content into spaces

- [x] A space can be created
- [x] It can be given a name and description — both in the space's configuration; the description is read on its entry, and deleting it returns the space to saying nothing
- [x] Only the spaces one has access to are seen — a restricted space does not appear for whoever is not a member, neither in the tree nor in the search filter
- [x] One can switch spaces without losing the navigation context — the tree keeps its state
- [x] An empty space explains how to start instead of showing a blank screen

## NV-03 · It must allow reordering the tree with the mouse

- [x] A page can be dragged to change its position among its sisters — a row's edge leaves it beside, the center puts it inside; the mark says which of the two is going to happen, and the order withstands reloading
- [x] A page can be dragged inside another to nest it
- [x] A page can be dragged to another space
- [x] While dragging, where it will land is seen
- [x] On dropping, the order is kept on reload
- [x] Dragging a mother brings her children along
- [x] Dropping a page inside its own descendants is not allowed

## NV-04 · It must allow searching content

- [x] Search is by title and by body content
- [x] Results show a fragment with the term highlighted
- [x] It is seen which space and which parent page each result belongs to
- [x] Only pages one has access to appear — their content is not found, and their direct address answers "This address doesn't exist" without betraying that it exists
- [x] The text of mentions is also findable
- [x] A search without results says so clearly
- [x] Results appear quickly and do not block writing

## NV-05 · It must offer a quick keyboard finder

- [x] A shortcut opens the finder from any screen
- [x] It finds pages by typing part of the title
- [x] One navigates with arrows and opens with Enter
- [x] Escape closes it
- [x] It also offers actions, not only pages (create page, go to a space)
- [x] It shows recent pages before anything is typed ("Recently viewed")

## NV-06 · It must allow refining the search

- [x] It can be filtered by space
- [x] It can be filtered by author
- [x] It can be filtered by edit date
- [x] Filters can be combined
- [x] Applied filters are seen and can be removed one at a time

## NV-07 · It must allow moving around like on any website

- [x] The browser's back button works
- [x] Each page has its own shareable address
- [x] Opening a link in a new tab works — the tree uses real links
- [x] Reloading keeps the reading position
- [x] A nonexistent address shows a clear error, not a broken screen — "This address doesn't exist", with a way out to home

## NV-08 · It must offer an entry to the space

- [x] Each space has a home screen
- [x] It shows its main pages
- [x] It shows its recent activity
- [x] From there the members and the space's configuration are reached — the members are seen on the entry itself, and "Settings" leads to where the space is named and described

## NV-09 · It must allow peeking at a page without opening it

**How to test it:** hover over a mention, and then open it without leaving the current page.

- [x] When hovering over a mention a preview is seen with its title and a fragment
- [x] The same when hovering over an internal link
- [x] The preview shows the icon and the main properties — the icon is the page's, not an emoji read from the title
- [x] It appears with a small delay, not when brushing it by accident — brushing for 200 ms it does not appear; resting on it it does
- [x] It disappears when moving the cursor away
- [x] The preview does not appear if one has no access to that page — it says "This preview cannot be shown because you do not have access" without leaking the title or a fragment; checked with the control in both directions, one reachable link and one not

## NV-10 · It must allow opening a page at the side

**How to test it:** open a row of a collection and check that the collection is still behind.

- [x] A page can be opened in a side panel without losing the one being read — the address remembers it (`?panel=`), so a shared link or a reload reopens the same thing
- [x] The page behind remains visible and keeps its reading position — two editors mounted at once, each with its own reading box
- [x] Inside the panel one can edit normally
- [x] Inside the panel the properties are seen and edited
- [x] From the panel one can switch to the full page
- [x] The panel's width can be widened — from 480 to 952 px, and the width is remembered
- [x] One can navigate inside the panel to another page and go back — within the same space; a page from another space does not open the panel (known limit)
- [x] When opening a row of a collection it opens this way by default
- [x] One can choose to open in full page instead of at the side
- [x] The panel closes with Escape and with a click outside — without trapping focus: it is not a modal dialog, the page behind keeps being read
- [x] When closing it, the changes were already saved — typed and closed with Escape immediately; the change was in the database
- [x] What is edited in the panel is reflected immediately in the view behind — the table of the collection behind showed the change
- [x] On a narrow screen the panel takes the whole screen instead of shrinking — at 320 px it takes the 320 without overflowing

## NV-11 · It must offer a personal starting point

- [x] There is a home screen of each person's own
- [x] It shows the recently visited pages
- [x] It shows what is assigned to them
- [ ] It shows the pending updates — there is no notion of read/unread in the system
- [x] It can be reached from anywhere

## NV-12 · It must separate what is private from what is shared

- [x] Each person has a private area that nobody else sees — it is created on its own the first time someone looks at their spaces; not even an administrator sees someone else's
- [x] A private page can be shared afterwards — only its owner, from the start of the space itself; whoever receives it cannot share it again
- [x] There is a section with what other people shared with one — "Shared with you", apart from one's own spaces and only when there is something inside
- [x] It is distinguished in the tree what is private, what belongs to the space and what is shared — with a mark and with a word, not only with an icon
- [x] A private page does not appear in anyone else's searches — checked in both directions: invisible to whoever is not of the house, findable for its owner

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| 2026-08-17 | PG-10/11/12/13/16/17, NV-04/05 | The UI checked listing, search, restoring, permanent deletion, emptying, star, order, information, appearance, recents, search and actions. Removing favorites from the portal was fixed and tested again; the `sourceType=inventado` filter is ignored and the quick finder did not show recents when opened. The remaining blocks were not run. | Partial: one failure recorded |
| 2026-08-17 | PG-09, PG-10, NV-09 | Cascade when sending to the trash and restoring with children **verified against PostgreSQL** (mother + 3 children, there and back); the confirmation says the real count of children. The hover preview shows title and fragment, and goes away when moving away. Missing: that the page disappears from the tree (fixed in consolidation, not tested again), that mentions say it was deleted, that it can be deleted from the header, and that the restore explains where it ended up if the parent no longer exists. | Partial |
| 2026-08-17 | NV-05 (correction of the previous row) | The quick finder **does** show recents: after visiting a page, Ctrl+K opens the "Recently viewed" group with it inside. The earlier observation was due to the browser profile —recents live in `localStorage` under `portal.recent-pages`— and not to a defect. | Correct |
| 2026-08-18 | PG-04, NV-01, NV-02 | Page and **space** icon verified in the browser against PostgreSQL: 1929 symbols searchable by meaning, color, random per tab, change and renaming from the tree's three dots without opening the page. The space's icon is also seen with the bar collapsed. Missing: that the icon appear in search results and mentions. The cover (PG-05) and the button to hide the tree were withdrawn: it said the same as collapsing the bar and used its same symbol. | Partial: one box pending |
| 2026-08-18 | Cross-cutting (responsive) | Walkthrough at 320 px of home, spaces, space, new page, page, search, trash, users, account and documentation. Fixed: the editor gained 40 px of writing (the handles' rail responds to the mouse and does not appear on touch), the trash no longer overflows, the space's name went from 74 to 256 px, the documentation's tables scroll inside their box, the title in Recents went from 126 to 218 px, the mobile panel no longer leaves a strip with the X floating and that X went from 16 to 44 px. Missing: measuring the sign-in without an active session. | Partial: one screen unmeasured |
| 2026-08-18 | PG-01/02/03/06/07/11/13/14/15/17, NV-01/02/05/07 | Verification walkthrough in the browser with a real QA page: created, moved to grandchild and to root (the path updated), with an attachment uploaded, downloaded, rejected for 11 MB, deleted, and at the end page and file deleted forever —the file disappeared from the disk—. Typography tested live; quick finder with arrows, Enter and Escape; clear 404; persistent tree collapse. **Open findings:** Enter in the title does not go down to the body; the browser tab never says the title; creating requires title+button before writing; the move destination is a dropdown (it cannot be searched by typing) and does not cross spaces; search results do not say space or mother; NV-06 has no filter interface; the title duplicates `id="page-title"` in a hidden node. | Partial: findings noted |
| 2026-08-18 | PG-01, PG-03, PG-05, PG-07 | Walkthrough with a real page, everything checked against PostgreSQL and against the disk. **Creating** no longer asks for a form: the page is created empty and one lands in the title, which is saved on its own. **Enter** in the title goes down to the body. The **tab** says the page's name. The **cover** came back and was verified entirely with a 7.6 MB photo —upload, change, reposition without saving until asked, remove (deletes the file)—, and without a cover it reserves no space. **Moving** reaches another space, is searched by typing, drags the descendants along and leaves the old addresses working. The title's duplicated `id` was reproduced and fixed: the router keeps the previous page mounted, so two fields shared a name. **Three new defects found and fixed:** the server actions accepted 1 MB when the interface promises 10 (it blew up any medium-sized attachment, not only the cover); private images gave 401 when passing through Next's optimizer, which requests them without a session (it also affected image icons); and moving between spaces left the person at an "This address doesn't exist". | Correct |
| 2026-08-18 | NV-04, NV-06 | It was checked **in the code** that they are already built (the results show space and mother; there are filters for space, type, tags, author and date, combinable and with chips). The earlier QA walkthrough took them as absent against an old development server. **They are not checked off**: seeing them in the browser is missing. | Pending verification |
| 2026-08-18 | PG-08, PG-18, NV-03, NV-08, NV-11 | **Built, unverified in the browser.** Duplicating a page (with or without its descendants; the copy lands next to the original). Locking a page: the backend **rejects** writing and renaming a locked one, it is not just that the screen is dimmed. Dragging a page to another space, and **reordering spaces by dragging** (new `order` column; migration applied by hand because an earlier migration was modified after being applied and Prisma asked to reset the database). Space home screen with main pages, recent activity and members. "Assigned to you" on the personal home, reading the properties the collection calls person. Missing from NV-11: the pending updates, which have nothing to rest on yet. Missing from NV-08: the space's configuration (the members are seen). | Pending verification |
| 2026-08-19 | PG-08, PG-12, PG-18, NV-03, NV-04, NV-06, NV-07, NV-08, NV-11 | Walkthrough in the browser against PostgreSQL of everything built the previous day. **Duplicating** keeps content, properties and icon, says "(copy)", asks about the children only if there are any and leaves the copy next to the original. **Locking** turns off editor, title and properties, is visible, is reverted with the same button, and the backend answers `PAGE_LOCKED` 409. **Filters** by space, author and date combined, with chips that are removed one at a time. Results say space and mother. **Dragging** nests, warns where it lands, is announced by `aria-live`, rejects dropping into one's own descendants, crosses spaces and drags the descendants; reordering spaces persists. Space home and "Assigned to you" checked with three people. **Two defects found and fixed:** the header's star did not follow the server —removing the page from the sidebar left it saying "Remove {name} from favorites", and the next click asked to remove something that was no longer there—; and the reading position was never restored because it was saved and requested on `window`, when what scrolls is the reading box inside the viewport. **Missing:** order among sisters with the mouse, the space's configuration and pending updates; none of the three exists yet. | Correct |
| 2026-08-19 | PG-02, PG-04, PG-06, NV-01, NV-02, NV-04, NV-09 | Verified with volume and with a second person. A **restricted** space does not appear for whoever is not a member —not in the tree, not in the space filter, not in the results—, and its direct address answers "This address doesn't exist" without betraying that it exists. An **eight-level** branch and a tree of **600 expanded pages**: 145 fps on average, worst frame 9 ms. The nine-segment path is shortened with "…" and keeps the last one. **Four defects found and fixed:** the tree's indentation grew without a cap and at eight levels left 93 px for a title of 354, so now it stops growing at the sixth generation; **renaming a page and changing its icon did not notify the index**, so a renamed page kept being found by its old name forever; deleting from the index asked to forget with `Number.MAX_SAFE_INTEGER` against an `integer` column, so the query blew up, the event retried endlessly and **a page in the trash kept appearing in the results**; and the preview escaped when going down to read it —entering it did not cancel the close and the 40 px gap was no man's land—. The preview is now reachable, carries a link to the page inside, and shows the page's icon instead of an emoji read from the title. The icon travels to the search results and to the mentions, where it is drawn live. The 97 pages were reindexed: all of them now have space and mother. | Correct |
| 2026-08-20 | PG-07, PG-09, PG-10, PG-15, NV-09 | Five blocks built in parallel by four agents and verified **one by one in the browser against PostgreSQL**. Sending to the trash from the page itself (a 44×44 button in the header, reuses the dialog that already existed, takes the person out of the page and persists). Mentions of a page in the trash are struck through and say "deleted"; a mention of a page the screen does not have at hand is drawn normally. On restoring it says where it ended up: "went back under" Demo ES-01 a ES-07 or "went back to the root of" Engineering. A file dropped into the content also appears in the attachments list. When moving to a more closed space it warns with the number of people and asks for confirmation; if nobody loses access, the move happens with no extra step. **Underlying finding:** `Page.parentId` has `ON DELETE SET NULL`, so deleting the mother forever erases the link on the spot and the "nonexistent mother" case cannot be explained without remembering where the page came from. **Two of our own texts fixed:** the plural of the access notice left the verb in the singular, and the restore notice said "no longer available" about a mother that is still in the trash. **Unverified:** that the preview does not appear without access — a reliable control with the second person was not achieved, so the box stays unchecked. | Correct |
| 2026-08-20 | PG-14 | The properties panel verified with a real row of the "Tasks" collection: five compact properties above the content, each one editable where it is seen —I wrote in the description and it was in the database without opening any screen—. **Fixed:** the panel said "This page has no properties" while still showing the location and the attachments, and the reveal button counted those two sections as if they were properties. Now no emptiness is announced and the button only says how many things are left to see. | Correct |
| 2026-08-20 | PG-19, PG-20 | Two blocks built in parallel and verified in the browser against PostgreSQL. **Trustworthiness:** marking as verified stores who and when, the badge says without opening anything whether it is current or expired, and the search filter discriminates —checked in both directions, not only the negative one—. The filter is resolved in SQL against `now()`, not against a boolean frozen at indexing: I moved the expiry into the past directly in the database and the badge updated itself, **without rewriting the page**. Responsible person assigned and persisted. **Bulk actions:** explicit selection mode with 54 boxes, counter in view and announced by `aria-live`, and batch sending that dragged along the cascade of a collection with fifteen descendants. The controller does not act twice on a page that its mother's cascade already covers, walking the real chain of parents. **Fixed during the review:** a cache tag duplicated in two modules —if they diverge, invalidation breaks silently— unified in `shared/`; a `catch` that swallowed the batch's errors leaving no trace; and the responsible-person picker, which offered nobody because people were only requested when the parent schema had a person-type property. **Not built, for lack of foundations:** notifying whoever maintains an expired page (there are no notifications or scheduled tasks) and exporting (there is no export of any kind). | Correct |
| 2026-08-20 | NV-10, NV-12, PG-21 | Three blocks built in parallel and verified in the browser against PostgreSQL. **Side panel:** it opens at the side without losing the one behind, with the address as memory (`?panel=`), widens from 480 to 952 px, closes with Escape and with a click outside without trapping focus, and what was written right before closing was in the database. At 320 px it takes the whole screen. **Private:** each person's area is created on its own; not even an administrator sees someone else's —checked in the tree, in search and by direct address, and with the inverse control that its owner does find it—. Sharing it makes it appear in "Shared with you", apart from one's own spaces. **Usage:** it counts visits with who and when, it is turned off, and turned off it **stops storing**, not only showing: two pages were visited with the log off and the count did not move; when reactivating it, it counted again. Whoever does not administer does not see the control, and the server rejects whoever asks for it on their own. **Security defect fixed:** the search engine did not use the common visibility filter and evaluated in TypeScript whether a role could read restricted spaces, interpolating the result as a literal in the SQL — for an administrator the clause ended up as `OR true`, nullifying the whole guard: they saw pages from any space, and would have seen other people's private areas. Rewritten tying each branch to its visibility, with a test that fails if someone leaves a loose `true` again. **Also fixed:** the owner of a private area could not rename it, because renaming required permission to create spaces. | Correct |
| 2026-08-21 | PG-19 (export) | Export to Markdown, verified in the browser against PostgreSQL. One chooses how much comes out: one page, a page with everything hanging from it, or the whole space. A page without children is asked nothing; one with children is asked, and both answers were checked: "Tasks" alone came out with a single page mark, and with its subpages it came out with fourteen, the exact number the database has under that mother. The whole Engineering space came out in a 42 KB file with the pages in the tree's order and each one opened by the path where it lived. What Markdown already knows how to say was written with its own syntax; what it does not —mentions, people, dates, formulas, callouts, columns, collections, toggles, bookmarks— came out as a link with its destination or as a `:::type` fence with its data, including a block the schema does not know, which was kept instead of being lost. **Access checked in both directions:** a Worker who does not belong to the restricted space "Direccion" receives 403, and the same space —which has two pages, one with a secret word— comes out whole for whoever can read it. Without a session, 401; an invented scope or a page without saying which, 400. **Defect found and fixed:** the formula came out empty (`$$`) because the writer looked for `attrs.expression` and the schema stores `attrs.latex`; the test that was written repeated the same mistake, so it was only seen when opening the real file. | Correct |
| 2026-08-21 | PG-01, NV-02, NV-03, NV-08, NV-09 | Five loose boxes closed and verified in the browser. **Shortcut:** `Ctrl`/`Cmd` + `Shift` + `N` creates a page in the space where one is; it carries Shift so as not to step on the browser's shortcut, and it stays silent while writing —control checked—. **Space configuration:** a screen of its own with name and description, linked from the space's entry; the description is read there and deleting it returns the space to saying nothing. **Order among sisters:** dropping at a row's edge leaves the page beside, dropping at the center puts it inside, and the mark says which of the two is going to happen before dropping; "Review portal content" went from third to first and withstood the reload. **Preview without access:** it says "This preview cannot be shown because you do not have access" without leaking title or fragment, checked with a control in both directions —the reachable link does show its content—. The decision of what dropping means was extracted into a pure function, like the one for repositioning in a list, which pages and spaces now share instead of having it written twice. | Correct |
| 2026-08-28 | PG-04 (icons) | When upgrading the icon library to version 1, the **19 brand symbols** (GitHub, Slack, Figma, Twitter, YouTube and others) ceased to exist: whoever publishes them withdrew them. They were removed from the picker, which goes from 1929 to 1910 symbols. No page in the example used them. Bringing them from another library remains a pending decision. | Correct |
