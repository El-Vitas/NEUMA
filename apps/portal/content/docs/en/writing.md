---
title: Writing on a page
summary: What each block in the menu does, what turns into something as you type, the shortcuts and each block's own menu.
order: 3
---

A page is a stack of blocks. Every paragraph, image and table is one, and all of them move,
nest and duplicate the same way. There are three ways to put one down: the `/` menu, writing
that turns into something on its own, and the **Add a block** button at the end of the page.

Type `/` on an empty line and the list appears. Keep typing to narrow it — `/tab` leaves the
table and the table of contents — and choose with Enter or the mouse. What follows is every
option on that list, in the order it appears.

## Text

### Blockquote

Indents the paragraph and puts a line down its side. It is for reproducing something somebody
else wrote, not for highlighting something of your own.

### Callout

A box with a mark on the left, for what should not be missed. It holds anything inside,
including other blocks. Which mark it carries is chosen from the block's actions, so a warning
and an aside do not look the same.

### Heading 1, 2 and 3

They cut the page into sections. All three show up in the side contents and carry an arrow
that folds the whole section, so a long page can be walked through closed. Typing `#`, `##`
and `###` gets them without opening the menu.

## Lists

### Bullet list

Items with no order among them. Tab nests an item under the one before it and Shift+Tab pulls
it back out, and each level changes the bullet.

### Numbered list

The same, but counting. The numbering redoes itself when items are added or removed in the
middle.

### To-do list

Each item carries its box, and ticking it is saved on the page like any other change. It is
for what gets done once. For what is followed over time, with an owner and a date, there is
the collection.

## Media

### Image

Uploads a file and leaves it on the page. A description is written underneath, and the width
is adjusted by dragging its edge. Every other file — a PDF, a spreadsheet — is attached from
the button at the end of the page.

## Advanced

### Button

A block that does something when pressed. You write what it says and choose what it does:

- **Write what it holds inside.** Whatever you put inside the button is written onto the page
  each time somebody presses it. For a shape that repeats, like the minutes of a meeting.
- **Add a row to a collection.** You choose which one, and every press creates a row.

### Code block

Code with its highlighting. The language is chosen in the block's bar, among `plain`, `bash`,
`css`, `html`, `java`, `javascript`, `json`, `latex`, `markdown`, `mermaid`, `python`, `sql`,
`typescript` and `yaml`. Inside the block, Tab writes an indent instead of jumping to the next
block.

Choosing `mermaid` or `latex` makes the block stop showing code and start drawing the diagram
or setting the formula.

### Diagram

A drawing that is written rather than drawn. What can be drawn, and how it is written, is in
[Diagrams](diagrams).

### Table of contents

The list of the page's headings, each one a link. It redoes itself as you write, so there is
nothing to maintain. It belongs at the top of a long page.

### Formula and Formula in line

Maths written in LaTeX. The first takes a block of its own and the second sits in the middle
of a sentence. Both are explained in [Formulas](formulas).

### Subpage

Creates a child page and links it here in one go. It hangs from this one in the side tree. It
is what to reach for when a topic grows enough to get in the way inside the page.

### Collection

A new collection, with its first property and its first view, created as a child page.
Everything that can be done with one is in [Collections and views](collections).

### Collection from elsewhere

Shows here a collection that already lives on another page. If it has several views, you are
asked which one goes in this spot, so the same data can sit as a chart next to the paragraph
that comments on it and as a table further down. It is not a copy. What is edited here is
edited in it.

### Link to a page

A link to a page that already exists, found by its name. Unlike writing the address out, the
link follows the page if it is moved, and the linked page finds out: it shows up among its
backlinks.

### Person

A mention of somebody in the space.

Typing `@` opens the same menu, and from there a page or a date can be mentioned too. Dates
are offered as **today**, **tomorrow**, **yesterday** or whichever day you pick on the
calendar.

### Emoji

An emoji found by its name, without leaving the keyboard.

### Divider

A line across the page. Typing `---` does the same.

### Table

A grid of cells written by hand. From its bar rows and columns are added and removed, and you
decide whether the first row is a header.

It is for data that is not the rows of a collection: a comparison of three options, a
timetable. When what you have is things that get filtered, sorted or moved between states,
that is a collection and not a table.

### Toggle

A folded block that opens when touched, with anything inside. You write it a summary, which is
all that shows while it is closed. For what gets in the way when read straight through but has
to be there, like the detail behind a figure.

## What is not in the menu

| How it appears | What you get |
|---|---|
| Pasting a link | You are asked whether to leave it as a link, a card or embedded, when the site allows it |
| Dragging a block beside another | The two end up in columns, and the width is shared by dragging the middle |
| Dropping a file on the page | It is attached, and if it is an image, video or audio it is shown |
| Typing `@` | Mentions a person, a page or a date |

## What turns into something as you type

Typing these characters changes the block without touching the menu.

| You type | You get |
|---|---|
| `# `, `## `, `### ` | Heading 1, 2 or 3 |
| `- `, `* `, `+ ` | Bullet list |
| `1. ` | Numbered list |
| `[] ` or `[ ] ` | To-do list |
| `> ` | Blockquote |
| `---` | Divider |
| ` ``` ` or ` ```js ` | Code block, with its language when you name it |

And inside a line, without leaving it:

| You type | You get |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | `code` |
| `~~struck~~` | struck through |
| `[text](https://…)` | a link |

If what you wanted was the character and not the turning, Ctrl+Z right afterwards undoes the
turning and leaves what you wrote.

## Each block's own menu

With Ctrl+/ — or from the handle that appears on the left as the mouse goes past — every block
offers what is its own.

| Action | What it does |
|---|---|
| Turn into | Changes the block's type without losing what is written |
| Text colour and Background colour | Tint the block |
| Duplicate | A copy right underneath, with whatever hangs from it |
| Copy link | An address that leads to that block, not just to the page |
| Move to… | Takes the blocks to the end of another page |
| Sync into another page… | The same block comes to show there too, and editing it in either one changes both |
| Turn into a page | The blocks leave for a new page, and the link stays here |
| Comment | Opens a thread on that block |
| Delete | Removes the block and whatever hangs from it |

## Keyboard shortcuts

On a Mac, Ctrl is ⌘.

| Shortcut | What it does |
|---|---|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+Shift+S | Strikethrough |
| Ctrl+E | Code |
| Ctrl+K | Link |
| Ctrl+F | Find on the page |
| Ctrl+/ | Open the block's actions |
| Ctrl+D | Duplicate the block, with whatever hangs from it |
| Ctrl+Shift+↑ and Ctrl+Shift+↓ | Move the block one place up or down |
| Tab and Shift+Tab | Nest the block under the one before it, or pull it out |
| Escape | Select the whole block |
| Ctrl+A | Select the block and, again, the page |
| Ctrl+Shift+Backspace | Delete the selected blocks |
| Ctrl+Z and Ctrl+Shift+Z | Undo and redo |

The same list lives behind the **Keyboard shortcuts** button at the end of every page.
