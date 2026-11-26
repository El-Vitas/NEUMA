# 02 · Block types

The catalog. Which types exist and what each one does inside.

> Read this folder's `README.md` before using this document.
>
> What **all** types must allow —dragging, nesting, converting, duplicating, commenting, linking— is in `01-blocks.md` and is not repeated here. When you review a type, also test that list on it.

---

## TB-01 · Paragraph

- [x] It is the default type when writing
- [x] Enter creates a new, separate paragraph
- [x] Shift+Enter makes a line break inside the same paragraph
- [x] When writing, no background or color appears that was not requested
- [x] An empty paragraph indicates that one can write there, without cluttering the reading

## TB-02 · Headings

- [x] `#`, `##`, `###` + space produce the three levels
- [x] The three are visually distinguished from each other and from normal text
- [x] From the `/` menu the level can be chosen, not only a fixed one
- [x] A heading can be made collapsible
- [x] Collapsing it hides the content up to the next heading of the same level
- [x] The collapsed state is kept when navigating
- [ ] When exporting or printing, what is collapsed is included anyway

## TB-03 · Bulleted list

- [x] `-`, `*` or `+` + space start the list
- [x] Enter creates the next point
- [x] Enter on an empty point leaves the list
- [x] Tab and Shift+Tab nest and unnest
- [x] The nested levels look different from each other

## TB-04 · Numbered list

- [x] `1.` + space starts the list
- [x] The numbering continues on its own
- [x] Starting at another number respects that start
- [x] When nesting, the inner numbering restarts
- [x] Inserting a point in the middle renumbers what follows

## TB-05 · Task list

- [x] `[]` + space creates a checkable box
- [x] A click checks and unchecks
- [x] Checked text is distinguished from unchecked
- [x] The state survives reloading
- [x] Enter creates the next task
- [x] Tasks can be nested inside tasks
- [ ] If another person checks a box, it is seen without reloading

## TB-06 · Toggle block

- [x] It is inserted from the `/` menu
- [x] The triangle opens and closes it
- [x] Its title can be written
- [x] It accepts other blocks inside, not only text
- [x] Closed, it hides its content completely
- [x] The open/closed state is not annoyingly lost when navigating

## TB-07 · Quote

- [x] `>` + space creates it
- [x] It is visually distinguished from the paragraph
- [x] One can leave it and keep writing normally

## TB-08 · Divider

- [x] `---` creates the dividing line
- [x] It is also inserted from the `/` menu
- [x] It is deleted with backspace
- [x] It takes its own line without interrupting what follows

## TB-09 · Callout block

- [x] It is inserted from the `/` menu
- [x] It has an icon on the left that can be changed
- [x] The background color can be changed
- [x] It accepts several lines and other blocks inside
- [x] It is clearly distinguished from a quote

## TB-10 · Code block

- [x] It is inserted from the `/` menu and with ` ``` ` + space
- [x] The language can be chosen
- [ ] The code is colored according to the language
- [x] Enter makes a line break, it does not leave the block
- [x] Tab indents instead of moving the focus
- [x] There is a button to copy the content
- [x] The text is not reformatted or autocorrected inside
- [x] Line wrapping can be toggled

## TB-11 · Simple table

- [x] It is inserted from the `/` menu
- [x] One writes in each cell and Tab advances to the next
- [x] Rows and columns can be added and deleted after it is created
- [x] The first row can be marked as a header
- [ ] The column width can be adjusted
- [x] A wide table scrolls inside itself without breaking the page
- [ ] A simple table can be converted into a collection keeping its data

## TB-12 · Image

- [x] It is uploaded from the `/` menu, by dragging the file, or by pasting
- [x] While uploading, the progress is visible
- [x] If it fails, it explains why
- [x] It can be resized and aligned left, center or right
- [x] It can be set to full width
- [x] It accepts a caption and alternative text
- [ ] It stays visible on reload and for another person

## TB-13 · Attached file

- [x] It is inserted at the exact point where the cursor is
- [x] It shows name, type and size
- [x] It is downloaded with one click
- [ ] When deleted, it also disappears from the page's attachments list
- [ ] Whoever has no access to the page cannot download it either

## TB-14 · Video and audio

- [x] A video can be uploaded and plays inside the page
- [x] An audio can be uploaded and plays inside the page
- [ ] The link of an external video can be pasted
- [x] The playback controls work
- [x] The video player can be resized

## TB-15 · PDF

- [x] It is uploaded and seen embedded
- [x] One turns pages inside the viewer
- [x] It can be downloaded and opened full screen

## TB-16 · Embeds and bookmarks

- [x] YouTube, Vimeo, Loom and Figma are embedded, and play inside
- [x] Pasting a link offers choosing between plain link, card or embed
- [x] Any link can be shown as a card with title and icon
- [x] A disallowed URL is rejected with a clear message
- [x] A preview that cannot be obtained degrades to a plain link

## TB-17 · Diagrams

**How to test it:** insert a diagram block and paste a Mermaid `flowchart`.

- [x] It is inserted from the `/` menu
- [x] Writing Mermaid code draws it
- [x] It supports flow, sequence, Gantt, class, state, entity-relationship, mind map and pie
- [x] One toggles between code, drawing, and both side by side
- [x] The drawing updates while writing
- [x] A syntax error is explained with the line, without breaking the page
- [x] It expands to full screen, with zoom and pan
- [x] The code can be copied and the drawing downloaded as an image
- [x] A wide diagram scrolls inside its block
- [x] It reads well in light and dark mode
- [ ] Another person sees the drawing, not the code

## TB-18 · Formulas

- [x] A formula is inserted as a block
- [x] It is rendered, it does not stay as raw text
- [x] An already inserted one can be edited again

## TB-19 · Page index

- [x] It lists the page's headings
- [x] It updates on its own when they change
- [x] When clicking, the page scrolls to that heading
- [x] It reflects the hierarchy with indentation

## TB-20 · Columns

- [x] A zone can be split into two columns and more added
- [x] A block can be dragged from one column to another
- [x] The relative width of each column is adjusted
- [x] On a narrow screen the columns stack

## TB-21 · Subpage

- [x] From `/` a child page is created at the cursor's point
- [x] It appears in the body as a link with its title
- [x] Clicking opens that page
- [x] It appears nested in the side tree
- [x] Changing its title updates how it looks in the parent
- [x] Deleting the block does not silently delete the child page

## TB-22 · Link to an existing page

- [x] From `/` a link to a page that already exists is inserted
- [x] It is searched by typing the title
- [x] It is shown with that page's icon and title
- [x] If the page changes title, the link reflects it
- [x] It is distinguished from a subpage created here

## TB-23 · Collection

A collection is just another block. Its internal behavior —properties, views, filters— is in `05-collections-properties-views.md`.

- [x] A collection is inserted from the `/` menu in the middle of the content
- [x] It coexists with text above and below
- [x] It can be dragged like any other block
- [x] It can be nested inside a toggle or a column
- [x] A view of a collection that lives elsewhere can be inserted
- [x] It can be converted between embedded collection and full page
- [x] It can be duplicated and deleted like any block

## TB-24 · Synced block

- [x] The same block can appear on two pages
- [x] Editing it in one updates it in the other
- [x] It is visible that the block is synced
- [x] The sync can be broken, leaving an independent copy

## TB-25 · Button

- [x] A button that creates predefined content is inserted
- [x] It is configured which blocks it adds and where
- [x] It can create a row in a collection instead of blocks
- [x] When pressed, the content appears immediately
- [x] Its configuration can be edited afterwards

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| 2026-08-14 | TB-25 | The button did not exist. What it writes is what it holds: it is a block that holds other blocks, written there the way one writes anywhere on the page, instead of being filled in by a form of its own —a button that had to be filled in from outside would be the only block on the page in which one cannot write—. Its three settings —what it is called, what it does and where it writes— live behind "Set up", because a page full of buttons showing their guts reads like a machine and not like a page. When pressed it writes a copy of what it holds: a copy, not the same block, so who each block was and what was commented on it stay inside the button. It can write below itself, at the beginning or at the end of the page. And it can do something else instead of writing: add a row to a collection, chosen from the block's menu —and the chosen page is asked whether it truly is a collection before noting it down, because a button pointing to a page that stores nothing only fails when someone presses it, which is the worst moment to find out—. The row is named like the first line the button would have written, which is the only thing there is to name it, and the rest stays inside it. That is where the only thing that had to be fixed appeared: the collection can demand a value from each row, so its defaults are asked for, leaving out those that would be empty —an empty value reads as an answer and the collection rejects it, and whoever pressed the button has nothing to do with that refusal—. Where it writes stops being offered when the button makes rows, because a row does not land on the page. Tested in the browser: inserted from `/`, renamed, its content written, pressed —it appeared below—, changed to "at the beginning" and pressed again —it appeared above—, reloaded with everything kept, and with a collection chosen, pressed until seeing the row "Fila creada por el boton" inside Tasks. | 5 of 5 |
| 2026-08-14 | TB-24 | The synced block did not exist. It was added as a type that stores no writing (`synced`): it stores where what it shows lives —which page and which block of it—, so that what is read is what that page says now. The original block does not change at all: it remains an ordinary block of its page, and from its menu "Sync into another page…" is requested, which chooses the page from the same list used to move blocks and adds the reference there; what travels is not the block but where it lives. On the other page it is drawn set apart, with its mark —"Synced"— and the link to where it lives, and one does not write there: one writes where it lives, because the same block edited from two sides is a block that at some point loses half of what was written. Breaking the sync leaves a copy that no longer belongs to anyone else: the same writing, without who the other block was or what was commented on it, because a comment left on the one that stays belongs to that one and a block cannot be two. A block whose page no longer has it says so, instead of showing an empty box. Tested in the browser: written on one page, synced on another, corrected on the first and seen corrected on the second, and the link broken, leaving a copy that survives reloading. What it does not do is stated: what is drawn of a borrowed block is its writing, so a block that draws itself —a diagram— looks like its code and not like its drawing. | 4 of 4 |
| 2026-08-14 | TB-23 | The contract knew the embedded collection and the editor knew how to draw it, but there was no way to place one: two entries were added to the `/` menu, "Collection" and "Collection from elsewhere". A collection is a page with a shape, so it is created just like a page —in one go, page and shape together, because a page that was going to be a collection and was left without a shape is indistinguishable from any other— and it starts with the minimum: the name, which is the title of the page that each row is, and a column of its own. No guessed columns. The other entry shows a collection that lives elsewhere: the page is chosen from a list and, if that page is not a collection, it says so instead of leaving a gap. Switching between the two ways of naming a page was also added —keeping the collection in view or leaving only the link— from the block's menu, and going back to the collection asks whether the page still is one, because a shape can be removed long after the block was written. Tested in the browser, all seven: inserted in the middle of the text and kept on reload, with text above and below, dragged like any block, put in a column and then inside a toggle, the one from elsewhere —"Tasks"— shown with its real columns, back and forth between collection and link, and duplicated and deleted. Three things appeared when testing it. One in saving: what is inserted is left selected, so the first key replaced it and the block was silently lost; now a place to keep writing below is left, as the divider already did. Another on screen: two identical collections on a page —or just one, for an instant, while dragging— were drawn with the same name, and the browser complained about two things called the same; now each place where a collection is drawn has its own name. And two in reading: the embedded collection repeated the "Rows" heading that a collection carries on its own page, when here the section is the writing around it —now it says which collection it is and through which view it is being looked at, and leads to it—; and its table came out with overlapping columns, because the rules of the page's table —fixed-width, draggable columns— fell on any table drawn inside the writing: now those rules belong to the page's table and a collection's one adjusts to what it has. | 7 of 7 |
| 2026-08-14 | TB-22 | Naming an already written page existed halfway: it was done with `@` in the middle of the sentence, it looked like any link —without saying that what is linked is a page— and it said the name copied on the day it was inserted, so renaming the page left the link lying. Now it stores only which page it is and asks for the name each time, just like the subpage; the old name is left as a backup for a page that cannot be read from here, for example one from another space. A page's mark was put in front of it, which is what says what kind of thing is being named. It was added to the `/` menu, which is where people look for everything else: choosing it writes the `@` and opens the same search, so as not to have two different ways of searching for the same thing. Along the way it became clear that the search found nothing because the search index projector is a separate process that was not running; with it running, searching by title finds. The two are left quite distinct: the link lives inside the sentence, underlined and in the links' color; the subpage takes its line and reads as part of the page, without underline until the pointer is passed over it —for that it had to be taken out of the rule that underlines every link written among the words, along with the card and the document, which are also drawn on their own. | 5 of 5 |
| 2026-08-14 | TB-21 | The subpage did not exist: there was no way to create a child page from the writing. It was added as a block of its own (`subpage`), and not as a mention inside a paragraph, precisely so that it is distinguished from a link to a page that already exists: the one created here takes its own line, with a page's mark in front. What the block stores is which page it is; the name is asked each time it is drawn, so renaming the child —which is done on the child, like on any page— changes what the parent shows. The name written when inserting it is left only as a backup, for a child that can no longer be read from here. A page cannot be written, it has to be made first, so the `/` menu asks for a child the same way it asks for an image: the writing does not know how to create pages, only the page knows, and what comes back is the line that leads to it. When creating it the side tree refreshes, and the child appears hanging from its mother. Deleting the block does not touch the page: it stays in the tree and still opens. Tested in the browser: created from `/`, opened with a click, renamed to "Hija con nombre" and the parent came to say that, the block deleted and the child stayed where it was. | 6 of 6 |
| 2026-08-14 | TB-20 | The columns were already made and the four boxes were met in the browser, without touching anything of what they do. A block is dragged against the side of another and that zone is split in two; repeating the gesture against a column —or against the margin that follows the whole row— adds a third, and so on up to as many as wanted. A block is taken from one column to another, and the column left with nothing withdraws on its own instead of leaving a gap. The width is distributed by dragging the separator between two columns: it is not stored in pixels but as the share that falls to each one, so that the same page reads the same on a smaller screen; tested that it survives reloading. Under 640 pixels the columns stack in the order they are read, each takes the full width, the separator disappears —there is no width to distribute— and nothing goes off the screen. The only thing that had to be fixed was what the separator says about itself: it was announced as "select the block", which is something else, and being an ordinary `div` nobody announced it; now it says that it distributes the width between those two columns and presents itself as what it is, a vertical separator. | 4 of 4 |
| 2026-08-14 | TB-19 | The index did not exist. It was added as a block of its own (`table_of_contents`) that stores nothing: the page stores that there is an index, and what the index says is read from the headings on each visit. Storing the list would be storing the same thing twice and it would go stale at the first title that is corrected. It updates while writing because the index does not find out on its own —a block that holds nothing is not redrawn when another block changes—, so a watcher goes through the headings on every change and notifies it when the list stopped being what it was. Each line is a real button: it is reached with the tab key, activated with Enter, and when using it the cursor stays on that heading and the page scrolls to it —whoever arrives at the heading usually wants to write there. The hierarchy is drawn with indentation, three quarters of a line per level, and the index of a page without headings says so instead of staying blank. Tested in the browser: inserted from the `/` menu, the three levels listed and indented, a corrected title changed the line instantly, the click scrolled to the heading, it survived reloading, and the empty index filled up when writing the first heading. Afterwards the index that does not have to be inserted was added: every page shows it at the side, it is built on its own from what is written, it marks the heading being read and it appears only where there is spare width —on a narrow screen the page keeps everything—. Two things appeared while doing it. One in reading: marking what is read by looking at whether a heading crosses a narrow strip of the screen leaves the mark stuck where it was when none crosses it, so now the last heading that passed the reading line is marked, which is how it is done everywhere; that also fixed the documentation's index, which had the same defect. The other, in the jump: the first click after opening a page moved the cursor but scrolled nothing, because the browser did not yet have the writing taken and the engine did not know which box to scroll; now the writing is taken before moving, and with that the block's first click was also fixed. | 4 of 4 |
| 2026-08-14 | TB-18 | Formulas did not exist. The same decision as with diagrams was followed, which is the one already proven: a formula is a code block written in the language in which formulas have been written for fifty years, so what the page stores is the text —it is searched, copied, corrected, and remains a formula even if someone else typesets it tomorrow— and it inherits without writing anything the three modes (only the formula, only the code, both), copying, full screen, the notice with its line when badly written, and typesetting itself again on its own when switching from light to dark. The modes' names change with what is in the box: where a diagram says "drawing", a formula says "formula". Downloading is not offered, because a formula is not a drawing that can be saved apart. The letters it is typeset with travel with the page, so a formula looks the same on a machine without access to the internet. Tested in the browser: inserted from the `/` menu, typeset —integral, summation, root and fraction—, corrected afterwards and kept on reload. | 3 of 3 |
| 2026-08-14 | TB-17 | The diagram did not exist. No new type was created: a diagram is a code block written in the language of diagrams, so what the page stores is the text —it is searched, copied and a version that does not know how to draw keeps it whole— and the drawing is derived from it on each visit, never stored. It is drawn when the writing settles and not on every key, because a half-written diagram is almost always a syntax error and redrawing it makes the page flicker for whoever is writing. One can see only the drawing, only the code or both, and that choice is saved with the page. An error is explained with its line, inside the block, without bringing the page down; the same when switching an ordinary code block to the diagram language. The code can be copied —with a notice that it was copied— and the drawing downloaded, which is saved as a drawing and not as a photograph. The drawing is colored for the background on which it is read and is redrawn on its own when switching between light and dark: one left in the night's colors is illegible by day and nobody thinks of rewriting it to fix that. Two things appeared when testing it: the drawing shrank until it fit the column —a seven-step diagram ended up at half its size and could not be read—, so now it is shown at the size at which it was drawn and its own box is what scrolls; and what is taken to full screen can be zoomed with the wheel and dragged to be explored, which was what was missing from that box. All eight tested on screen: flow, sequence, Gantt, class, state, entity-relationship, mind map and pie. Afterwards all the families the engine knows were gone through, and two more things appeared. One: block diagrams were never drawn, and not because of what was written —the engine converts the whole diagram to text for a note of its own, that diagram reaches the page's root, and what the interface hangs there points to itself, so the conversion never ends; that was left out of what is walked and they were drawn again. Two: what does not come with the engine was added to it —the stamps of the known things and the general-purpose ones, a second way of laying out a graph for those the ordinary one piles up, and the only family that is distributed separately—, and the stamps travel with the page, so naming one in a diagram is never asking anything of an outside server. A diagram can also set its own theme, and it is respected. Afterwards the whole catalog was gone through looking at each drawing, and five more things came out of that. The first, and the one that matters: a diagram could make the browser of whoever reads it request an image from an outside server —a tag with an image, or a style of its own with an address inside—, which turns any page into a snitch of who is reading it; cleaning the finished drawing came too late, because the engine puts it on the page for an instant to measure it, so now what is written is cleaned before drawing and the drawing after, and not a single request goes out. The other four are about reading: the text overflowed its box because it was measured with one typeface and drawn with another; the arrows' labels came with a gray background that cannot be read; two families —the tree and the systems one— are drawn for white paper and write black on black; and a large diagram shrank until it was illegible, so now it is shown at the size at which it was drawn, scrolls, and offers fitting to the box to see it whole at a glance. Along the way it turned out that thirty-five diagrams drawing at once step on each other's configuration, and now they are drawn in a queue. It remains unchecked that another person sees the drawing and not the code: it depends on live collaboration, document `06`. | 10 of 11 |
| 2026-08-14 | TB-16 | The contract knew the embeds, but the editor drew them as an empty `div` and there was no way to create any. Each service is shown at the address with which it plays itself —`watch?v=` is seen at `embed/`— and Figma is given the whole address. Pasting a link now writes it as a link and offers the three forms —link, card, embed—, so that continuing to write leaves what was pasted. The card is a new type (`bookmark`) that stores what was read from the link instead of asking again: a page has to read the same tomorrow. What a link says about itself is asked by the server and never by the browser, only over https and reading a few lines. A link that cannot be embedded and one from which nothing could be read are left as a link, each with its notice. Along the way it turned out that the editor lets blocks be put where the contract does not accept them —an embed inside a quote broke saving—: now the block goes up to where it does fit, asking the contract itself. Tested in the browser: YouTube and Figma embedded, a card for `example.com` that survives reloading, and the two rejections. The three forms stopped living only at the moment of pasting: the block's menu offers **What to do with the link** on a link, a card or an embed, and applies the choice to the live block —before, it remembered the one from when the menu was opened and, if the selection had moved, the choice was silently lost and it looked like slowness—. Writing a link the way it is written everywhere, `[name](url)`, was also added, and a link now looks like a link, which it did not. About the title: YouTube writes its own past the six-hundred-thousandth character and only the first 512 KB were read, so the card fell back to the site's name; now up to 2 MB are read. About the description: the one YouTube gives to whoever requests the page without a session belongs to another video, so it stopped being read —a card that cites something false is worse than one that cites nothing— and only the name and the icon are stored. | 5 of 5 |
| 2026-08-14 | TB-15 | The PDF was only a line to download it. No new type was created: it is the same attachment, drawn as a document when it is one, with the browser's own viewer —which turns pages, saves and prints without anything having to be built—. Three things prevented it: the server delivered everything as something to be saved (now a document travels `inline`, and the rest keeps traveling to be saved), the portal denied with `X-Frame-Options: DENY` the frame the viewer needs (now it is allowed only for attachments and only from the same origin), and the viewer swallowed the pointer, so not even the block's handle appeared (now it does not listen until the block is chosen). **Show as** —document or file— was added because the same PDF is something that is read on one page and something that is saved on another; the option is not offered where it cannot be met. Along the way: uploading something with a block selected replaced it —what was there was lost—, now it is inserted below; and the block's menu opened above the block, far from the handle that opened it and off the screen on tall blocks: now it opens at the height of its buttons. | 3 of 3 |
| 2026-08-14 | TB-14 | Neither video nor audio existed: they were added to the contract (`video` and `audio`, both with width), to the editor and to the distribution of what is uploaded, and the server came to accept mp4, webm, mpeg, ogg and wav. None of this was being saved: a block that holds nothing was being written empty content and the contract rejected it —the same stumble as the divider, now with a test that pins it down—. The browser's controls were replaced by our own (play, playback point, time, mute, full screen), drawn with the house's colors and strokes, over the same `<video>`/`<audio>` as always. Neither could be skipped forward: the server delivered the whole file and ignored the request for a piece, so the ranged response was implemented and the portal lets it through. A player without a width of its own takes the column, but a video is never stretched beyond its own resolution; both are adjusted from the edge, which is now the same drag as the image's. Neither could move within its column either, always stuck to the left: alignment stopped being the image's business and became that of any block that is not writing (`PAGE_BLOCK_ALIGNMENTS`), so a video or a recording stands at the left, center, right or full width, and it is saved with the page. It remains unchecked pasting the link of an external video: that is embedding, from TB-16. | 4 of 5 |
| 2026-08-13 | TB-13 | The block only showed the name: the file's type and size, which already came when uploading, were added to the contract, and now they are read as they are named (TXT, PDF) instead of as they are sent (`text/plain`). The link downloads the file with one click, with its original name. Two remain: **deleting the block does not remove it from the attachments list** —doing so implies deleting the file from the server when undoing an edit, and I do not make that decision alone—, and that whoever has no access cannot download it, for which it is proven that without a session it answers 401 and that the service denies the download without permission, but the test with a second user is missing. | 3 of 5 |
| 2026-08-13 | TB-12 | One could only upload through the paperclip, and the image admitted nothing else: where it stands and how much it takes up were added to the contract, the "Image" entry in the `/` menu, and pasting from the clipboard. The line written under the image is at once its caption and the text read to whoever cannot see it: asking for the same phrase twice is how a page ends up with a caption and no alternative text. The width is dragged from the edge and stored as part of the page, not in pixels. Only half of one box remains unchecked: it stays visible on reload (tested), but "for another person" depends on live collaboration, document `06`. | 6 of 7 |
| 2026-08-13 | TB-11 | The table was a single cell without headers, `Tab` took the focus out of the page and there was no way to add or remove rows or columns. `prosemirror-tables` was adopted (authorized) with these interaction decisions: it is inserted 3×3 with a header and the cursor in the first cell, `Tab` goes through the cells and in the last one adds a row, and the table scrolls inside its own box without dragging the page. The header is always the first row, wherever the menu is opened. What is missing is for El-Vitas to test by hand the dragging of the column edge, and converting to a collection, which belongs to document `05`. | 5 of 7 |
| 2026-08-13 | TB-10 | Almost everything was missing except Enter and not reformatting inside: ` ``` ` + space (with the language written right there), the language choice, the copy button, line wrapping and having `Tab` indent instead of taking the focus out of the page were added. Coloring according to the language remains unchecked: it needs a new library and dependencies are not touched without instruction. | 7 of 8 |
| 2026-08-13 | TB-09 | The mark on the left was missing, which did not exist. It was added to the contract as the **type** of notice (idea, information, warning, done, blocked, pinned) and not as the symbol: the page says the same for everyone, and each person sees the drawing that falls to them. It is chosen from the block's menu, next to the color, which already worked. | 5 of 5 |
| 2026-08-13 | TB-08 | The divider did not exist anywhere: it was added to the contract (`divider`), to the editor, to the `/` menu and to `---`. Since the line holds nothing, inserting it at the end of the page leaves a paragraph below to keep writing. Along the way it was fixed that a block that holds nothing, arriving with content, broke validation with a technical error instead of rejecting it. | 4 of 4 |
| 2026-08-13 | TB-07 | Only starting it by writing was missing: `>` + space did nothing because the rule did not exist. The rest was already there: it is distinguished from the paragraph by its bar and its color, and two Enters leave it. | 3 of 3 |
| 2026-08-13 | TB-06 | The title could not be written: it was inside a `<summary>`, which keeps the focus, and no key arrived. Writing it as editor content did not work either —the keyboard answers to whoever has the focus and the editor reads each key as writing on the page—, so the title became a field of its own and the arrow, a real button. The rest already worked; the block is drawn without `<details>` and what it holds is indented under the title. | 6 of 6 |
| 2026-08-13 | TB-05 | Three things were missing, all three done: `[]` + space did not create anything, Enter split the paragraph instead of giving another task (and the new one is born unchecked even if the previous one is done), and checking a task also struck through the ones hanging from it. It remains unchecked that what another person checks is seen: two clients connected to the same page do not see each other —neither the text nor the presence—, even though each one saves correctly against the shared document. That is the collaborative layer, document `06`. | 6 of 7 |
| 2026-08-13 | TB-04 | Nothing was missing: it numbers on its own, starting at `5.` respects the start and survives reloading, interleaving a point renumbers what follows, and when nesting the inner numbering restarts at `a.`. Nesting became available with what was done in TB-03. | 5 of 5 |
| 2026-08-13 | TB-03 | Nesting was missing: `Tab` used the general nesting, which inside a list reads the whole list and did nothing. Now a point hangs from the point above, and the three levels are distinguished by their mark (dot, circle, square). Tested in the browser, with saving and reload. | 5 of 5 |
| 2026-08-13 | TB-02 | The folding test was repeated on a new page: it survives reloading and navigating, folded and unfolded. It was not the collaborative layer: the backend had the old contract in memory and rejected the save with 400. Only the export remains unchecked, which does not exist in the product (document `09`). | 6 of 7 |
| 2026-08-13 | TB-02 | The three levels in the `/` menu were missing (it was fixed at 2) and the collapsible heading, both implemented. Remaining unchecked: that the folding survives reloading (`collapsed: true` is saved and the POST goes out, but it comes back as `false` — the collaborative layer is suspected, the same area as CL-01) and the export, which does not exist in the product (document `09`). | 5 of 7 |
| 2026-08-13 | TB-01 | `Shift+Enter` was missing (the `hard_break` node did not exist in the contract) and the invitation to write in an empty paragraph. Both implemented and tested in the browser. | 5 of 5 |
