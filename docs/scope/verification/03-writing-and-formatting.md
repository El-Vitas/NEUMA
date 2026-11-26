# 03 · Writing and formatting

What happens **inside** a block: writing, formatting, mentioning, searching and saving.

> Read this folder's `README.md` before using this document.
>
> Creating, moving and nesting blocks is in `01-blocks.md`. Which types exist, in `02-block-types.md`.

---

## ES-01 · It must allow writing fluidly

**How to test it:** open any page and write.

- [x] The cursor is placed in the body with a click
- [x] Typing shows the text with no perceptible delay
- [x] The text survives reloading the page
- [x] Writing a lot of text does not make the page feel slow
- [x] An empty page suggests how to start and mentions the `/` menu

## ES-02 · It must recognize Markdown shortcuts while writing

- [x] `#`, `##`, `###` for headings
- [x] `-`, `*`, `+` for bullets
- [x] `1.` for a numbered list
- [x] `[]` for a task
- [x] `>` for a quote
- [x] `---` for a divider
- [x] ` ``` ` for a code block
- [x] `**`, `*`, `` ` ``, `~~` for inline formatting
- [x] No conversion happens inside a code block
- [x] Ctrl+Z immediately afterwards reverts the conversion and leaves the text as is

## ES-03 · It must allow inline formatting

- [x] Ctrl+B bold, Ctrl+I italic, Ctrl+E code
- [x] Ctrl+U underline, and there is a shortcut for strikethrough
- [x] Formats combine on the same text
- [x] They are removed by applying the same shortcut again
- [x] Underline is visually distinguished from a link

## ES-04 · It must allow text color and highlighting

- [x] The color of the selected text is changed
- [x] A background color is set on the selected text
- [x] There is a limited palette, not a free picker
- [x] The colors read well in light and dark mode
- [x] The color can be removed and go back to the default

## ES-05 · It must offer formatting when selecting text

- [x] When selecting, a floating bar appears next to the selection
- [x] It offers bold, italic, strikethrough, code and link
- [x] It offers text and background color
- [x] It offers converting the block into another type
- [x] The buttons reflect the current state of the selection
- [x] The bar disappears when the selection is released

## ES-06 · It must allow links

- [x] Ctrl+K on selected text opens the link field
- [x] A URL can be pasted and it ends up linked
- [x] An internal page can be searched from the same field
- [x] Hovering over the link allows editing or removing it
- [x] Internal links open inside the app, without a full reload
- [x] An invalid link is rejected with a message

## ES-07 · It must allow mentioning another page

**How to test it:** type `@` after a space, in the middle of a sentence.

- [x] `@` opens the page finder
- [x] Typing filters by title
- [x] It works in the middle of a sentence, not only at the start of the line
- [x] An email like `juan@ejemplo.com` does **not** trigger the menu
- [x] The mention shows the page's title, not its identifier
- [x] Clicking navigates to the mentioned page
- [x] If the page changes title, the mention reflects it
- [ ] Whoever has no access to the target does not see its title
- [x] The mention appears as a backlink on the target page
- [x] The finder offers to create a new page with what was typed if it does not exist

## ES-08 · It must allow mentioning a person

- [x] `@` also offers people, not only pages
- [x] A person is visually distinguished from a page
- [x] The mention shows the person's name
- [x] Only people with access to the space appear
- [x] Hovering shows something about that person
- [ ] The mentioned person finds out

## ES-09 · It must allow mentioning dates

- [x] `@` allows inserting a date
- [x] There are shortcuts for today, tomorrow and yesterday
- [x] A calendar opens to choose another one
- [x] It is shown in the user's format and language
- [x] An already inserted date can be edited

## ES-10 · It must allow emoji and inline formulas

- [x] `:` followed by letters opens the emoji finder
- [x] Typing filters by name and Enter inserts
- [x] It works the same in the title and in the body
- [x] A formula can be inserted without leaving the paragraph
- [x] The formula renders next to the text without misaligning the line

## ES-11 · It must paste external content keeping the structure

- [x] Pasting from another page of the app keeps blocks and formatting
- [x] Pasting Markdown converts it into real blocks
- [x] Pasting HTML from a site keeps headings, lists and links
- [x] Ctrl+Shift+V pastes as plain text
- [x] Pasting a URL over selected text turns it into a link
- [x] Pasting huge content does not break or freeze the editor

## ES-12 · It must allow searching within the page

- [x] A shortcut opens search within the page
- [x] It highlights all the matches and indicates how many there are
- [x] It allows jumping from one to the next
- [x] It allows replacing one and replacing all
- [x] It finds text inside collapsed blocks and opens them on arrival

## ES-13 · It must show the page's structure

- [x] There is a panel with the page's headings
- [x] Clicking scrolls to it
- [x] It marks which heading one is at while reading
- [x] It reflects the hierarchy of levels
- [x] It can be hidden

## ES-14 · It must save without having to be asked

- [x] Changes are saved on their own, without a button
- [x] It indicates when it finished saving
- [x] If the connection is lost, a notice is given
- [x] When the connection returns, pending changes are sent
- [x] Closing the tab with recent changes does not lose them
- [x] A save error never appears without an explanation of what to do

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| 2026-08-16 | ES-05 | Reopened from use: the bar stayed floating over a text that nobody had selected anymore. ProseMirror keeps its selection when it loses focus —to give it back to you on return—, and the bar decided by looking at that remembered selection, so when clicking on the title, on the side menu or on any other field, the bar was still there, on top of the writing and in the way. Now the bar belongs to the moment of choosing: it goes away as soon as the reader moves to another part of the page. It does not go away, however, because they entered the bar's own menu —that is still the bar— nor because they left the whole window, which is not going somewhere else but stepping aside. Checked in the browser, all four cases: with the selection alive it is there; clicking the title it goes away; with its menu open it stays; and collapsing the selection with the arrows it goes away. | 6 of 6 |
| 2026-08-16 | ES-09 | It did not exist. Now `@` offers days next to pages and people, in the same list and ordered by what was typed: today, tomorrow, yesterday and pick another. The day is calculated in the reader's time zone and not in UTC, which is how "tomorrow" ends up being today: tested in the browser at 22:05 on the 15th in Santiago, `@today` wrote the 15th and "Tomorrow" the 16th, while in UTC it was already the 16th. It is shown in the reader's language and format. To pick another day or change one already written, the browser's own calendar opens —a real calendar, with keyboard, in the reader's language and without adding any dependency—, and what is chosen is written in a single transaction, rejecting a day that does not exist like February 30. When testing it, it turned out that a named date stretched its line from 27 to 44 pixels: it had been given the minimum size of a touch target, which is a rule for controls a finger must hit and not for a word inside a sentence. Now the date measures what the line measures. | 5 of 5 |
| 2026-08-16 | ES-08 | Naming a person with `@` was added. The same list offers pages, people and days, ordered by closeness to what was typed and not grouped by type, because whoever types `@ana` is not thinking "I am going to mention a person": they are looking for Ana. Only the members of that page's space appear, with the same access control as the rest. A person is distinguished from a page by their own icon, and hovering shows their name and, when the data is at hand, the address by which they can be reached. When testing it, it turned out that it said "Someone who is no longer here" about a person who had just been chosen: the data was looked up in a list that almost always arrives empty and the "I can't find her" was counted as "she left". That message was removed entirely, because with what the editor has there is no honest way to tell one thing from the other. It remains unchecked that the person finds out: there is no notification system in the product —not even a module in the backend—, and faking it would be worse than not having it. | 5 of 6 |
| 2026-08-16 | ES-10 | What was missing was completed. The inline formula is inserted from the `/` menu without leaving the paragraph, is written and rewritten in a field that the formula itself opens when pressed, and is saved in a single transaction. It is drawn by katex, which was already a dependency; a formula that katex does not understand is shown as it was written, saying why, instead of breaking the page or leaving a gap. And it does not misalign the line: measured in the app, a paragraph with a formula and another without it give the same height, even with a fraction and a root, which are the tallest things katex draws. The emoji finder now also works in the title, which is a plain text field and not the editor: it is announced as a text field and only becomes a dropdown list while it truly offers something. One edge is noted: inserting a formula from the menu leaves the gap written but does not open its field on its own, so it has to be pressed. | 5 of 5 |
| 2026-08-15 | ES-12 | Nothing existed: one could not search within a page. It was added, with Ctrl+F and with the same mechanism by which the page already asks things of itself. It highlights all the matches and says how many there are, jumps from one to the next wrapping around, and replaces one or all in a single undoable step. What was collapsed opens on arrival: a closed heading that hides a match opens on its own, and only that one —the first version also opened the neighboring folds in passing, and whoever had closed a section found it open without having touched it—. Searching does not dirty the history: undo must not give you back a search instead of your last sentence. Two things turned up when testing in the browser that no test saw: the case and accent folding assumed that folding a letter never changes the text's length, and with a letter that does change it all the positions shifted —the highlight fell on the wrong letters and the replacement would have cut where it should not—; and the search died silently when the editor changed state on connecting collaborative editing: the panel stayed open, with the word typed, counting "No matches". | 5 of 5 |
| 2026-08-15 | ES-11 | Only a pasted file and a loose address were handled. Now a paste is decided before touching the page: what comes from this same app is restored by the editor as is; what carries HTML from a site keeps headings, lists and links; Markdown is read and converted into the same blocks that are written by hand, with their marks; Ctrl+Shift+V pastes without formatting; and an address over chosen text links that text instead of replacing it. Huge content does not hang the editor: above a limit it is pasted as text and it says why. Two things came out of testing and not from reading. The first: pasting as plain text put everything in a single block, and since the page rejects a block longer than it accepts, the bigger the paste the surer it was that it could not be saved; now what is pasted joins the writing where it lands and only the middle part is a block of its own. Copying a heading and a list from a page of the app and pasting them into another leaves them as they are, checked in the browser. The second, and worse: when putting the translator in the paste's dependencies, each render created a new function and the whole editor was rebuilt with every key —the letter was lost and the focus died—; the label now lives in a ref, like the rest of the module, and there is a test that this function does not change between renders. | 6 of 6 |
| 2026-08-15 | ES-14 | Saving on its own was already done; everything around it was missing. Now the page says what state it is in: saving, saved at such a time, or that there is something unsaved, in a single place —the header— and not in two, which is what was left by adding it without looking at what was already there. Closing the tab with something unsaved warns, and only then. A save error never appears alone: it always says what to do. And the most serious failure of the night appeared, which no test could see: the connection state was read during the page's first draw, and since Node defines a `navigator` without `onLine`, the server decided it was offline and the browser that it was online; React redid that piece of the tree and the editor was left holding a node that was no longer on the page, so one could not write anywhere in the application. Nothing that depends on the browser is read during the first draw anymore. The two connection points were checked in the browser, end to end: the connection is removed and the page says "No connection. What you write is saved as soon as it comes back."; one writes and not a single request goes out —checked beforehand that the request detector did see one when there was a connection, so as not to trust a zero that might be the method's—; and when restoring it, it says "The connection is back: what was pending is being saved." and right away "Saved at 21:08", with a single request. One edge is noted: on a newly created page, while the page list is still the old one, the save notice does not appear —it is saved anyway, checked against the database: what was written seconds after creating it was stored— but whoever writes does not see that it was saved until reloading. | 6 of 6 |
| 2026-08-15 | ES-13 | Four of five were already there from the rail that was built with the TB-19 index: the panel exists, leads to each heading, marks which one one is at while going down —checked going down to the end of a long page— and reflects the hierarchy with each level's indentation (0, 12 and 24 pixels for H1, H2 and H3). And now it can be hidden: a button next to the index's title closes it leaving in its place what is needed to bring it back, says with `aria-expanded` what state it is in, and the choice is remembered on reload in the same way as the side menu's —read after mounting, never during the first draw—. | 5 of 5 |
| 2026-08-15 | ES-10 | Half: the emoji finder. `:` followed by letters opens it —never a lone `:`, nor inside `12:30`, nor in `http://`— and filters by name in Spanish and English, regardless of accents or case, so `:corazon` and `:heart` reach the same place. Enter writes the character, which is text and not a new block. The list is written by hand, without adding any dependency. What needs a new contract is left for the next wave: the inline formula, whose node is already in the shared contract, and having the finder also work in the title, which today is a plain text field and not the editor. | 2 of 5 |
| 2026-08-15 | ES-07 | One thing out of ten was missing: the finder did not offer to create the named page, it just disappeared. Naming a page that does not exist yet is how a page usually begins —first the thought and then the page—, so now, when none is called that, the last entry of the finder is to make it: it is created hanging from the page where it was written and is mentioned in the same place. When testing the rest two things turned up. One, fixed: following a mention reloaded the whole browser, because what answers the click was placed on the node and a mention is drawn with its own view; now the editor answers, and a page named in the middle of a sentence is followed the same as a link. The other, not fixed and noted separately: two projections —search and backlinks— read the same event inbox and the first that takes one marks it as done, so with both running each save reaches only one. With the link projection running, the backlink appears. It remains unchecked that whoever has no access to the target does not see its title: today the mention stores the name it was inserted with and shows it when it cannot read the page, so the title leaks; distinguishing "you have no access" from "it is in another space" requires the server to say so. | 9 of 10 |
| 2026-08-14 | ES-06 | The whole hand-made link was missing: the mark existed in the contract and the Markdown rule `[text](url)`, but there was no way to put a link on something already written. A field was added that opens with Ctrl+K or from the bar, and that asks a single question —where does this go— because from where one stands, an address and the name of a page answer the same thing: if what was written is an address it is linked, and if not, the pages are searched and one is chosen. What is not anywhere is rejected by saying so, instead of being left written as a broken link. An already written link is reached by leaving the pointer over it: a bubble appears with where it goes and the only two things that can be done to it, change it or remove it, because putting the cursor inside a link is also the way to follow it. And following a link to a page of the app itself no longer reloads the whole browser. When testing it, it turned out that the contract only accepted absolute addresses, so an internal page could not be saved; now a link can also lead to a site of this app, and that truth was left in the shared package instead of being written twice. | 6 of 6 |
| 2026-08-14 | ES-05 | The bar already appeared and already reflected the state of what was chosen, but two things from what the list asks for were missing it: the link and —the same, seen from another side— that the link button said that what was chosen is already a link. It was added to the main row, next to bold, italic, underline, strikethrough and code, and it was given the mark that makes it respond like the others. In addition, the bar and a link's bubble no longer step on each other: over the same words there can only be one thing floating, and while the pointer rests on a link the bubble rules. | 6 of 6 |
| 2026-08-14 | ES-04 | Inline color did not exist: only a whole block could be painted, when whoever chooses four words and looks for a color wants those four. The two marks were added —writing color and background color— with the same limited palette of eight colors that blocks already use, plus "no color" to go back to the default; there is no free picker, so nothing can end up illegible over the page's paper. Each color has its day and night reading, and both were checked over the same text: the background is a tint, not a solid block. The two colors combine over the same words and survive reloading. | 5 of 5 |
| 2026-08-14 | ES-03 | Almost everything was missing: no mark responded to the keyboard —neither bold, nor italic, nor code— and neither underline nor strikethrough existed in the contract, so there was nothing to apply. The two marks and the five shortcuts were added, and they were left in the same list that the editor obeys and the shortcuts panel shows, so a shortcut cannot be set without being stated nor stated without working. Marks combine over the same text and are removed by repeating the shortcut. Underline is drawn in the writing's color and not a link's: on a page where every link is underlined, the only thing left to tell them apart is that one of the two is not a link. Tested in the browser, including the comparison of an underline and a link on the same screen. | 5 of 5 |
| 2026-08-14 | ES-02 | The block shortcuts already worked —all six— but inline formatting did not exist: `**bold**` stayed as it was. The four rules were added (`**`, `*`, `` ` ``, `~~`), which take the signs with them, because leaving the asterisks would be answering what was asked for halfway. Inside a code block no conversion happens: what is written there is what was meant, sign by sign. And two things appeared when testing undo. The first: undoing right after a conversion also took the whole line with it, because what the library remembers to give back the typed sign is erased by any later change, and handing out identities to new blocks is a change; now that handing out carries with it what the page has just remembered. The second, in passing: converting a line into a heading changed its identity —it gave it a new block—, when typing `# ` in front of a line changes its shape and not which line it is; now it keeps who it is, its colors and what was commented on it, just like when converted by hand from the menu. | 10 of 10 |
| 2026-08-14 | ES-01 | Nothing was missing. The cursor enters with a click, the empty page says how to start and names the `/` menu, what is written survives reloading, and writing does not drag: forty-four letters in 268 ms on an empty page and forty-two in 214 ms on one of two hundred blocks, that is five milliseconds per key in both. | 5 of 5 |
