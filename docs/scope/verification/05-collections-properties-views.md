# 05 · Collections, properties and views

The structured part. A collection is **a block that carries a schema**: typed properties and views over a set of rows, where each row is a full page.

> Read this folder's `README.md` before using this document.
>
> That the collection behaves like any other block —dragging it, nesting it, duplicating it, inserting it in the middle of a text— is reviewed in `01-blocks.md` and `02-block-types.md` (`TB-23`). What is reviewed here is what happens **inside** it.

## How it is built today

A collection **is not a separate entity**: it is a page that carries a schema,
and its rows are its child pages. The properties of each row live in the page
itself. That is why a row is opened, moved and linked like any page — because
it is one.

There are eight property types (title, text, single select, multiple select,
person, date, checkbox and number) and two views (table and board).

The server already knows how to filter, sort and group. Each option of a select
carries its name and its color. The shape of a collection is changed after
creating it, from the button next to the view tabs: adding properties of one's
own, renaming them, removing them, and deciding which options a select offers
and what color each one is.

A board moves: a card dragged to another column changes the value that column
represents, and the same is done with the keyboard. Which property the board
groups by is chosen from that same configuration, and the board writes the
property that falls to it, whichever it is. Each view also decides which
properties it shows, and that choice belongs to it and not to the collection.

Above the rows there is a bar with two buttons: what the view lets through and
in what order they come out. Each one says how many conditions it has set
without opening it, and what is chosen is saved in the view, not in whoever is
looking.

A board can also group by two properties at once: the second draws
**crossing bands** across the board, and each band repeats all the columns so
that they read aligned. It groups by anything —also by a date or a number,
which do not declare options—, deriving the groups from what the rows have set.

In the table, a cell is answered where it is: it becomes its own field when
touched and only the property that was touched is sent. And each column can say
at the foot whatever it wants about all its rows together —count them, sum
them, average them—, always over the ones the view let through.

From the board one is in charge of the columns: one is added, renamed —and the
new name is also written into every row that carried the old one, in the same
operation—, painted, and removed warning how many rows it leaves without a
value. A column **is** a value of the property, so what is done to it is seen
in all the views, not only in the one in front.

Each view also stores how whoever is looking at it is viewing it: which columns
it has folded, what limit it put on each one, and whether it hides the one for
rows without a value. That does not change what the rows store, so it is not
seen from the other views.

The table is also in charge of its columns: the width is dragged from the edge,
the place is changed by taking them from the handle, and the first ones can be
kept still when scrolling sideways. That belongs to the view, not to the
collection.

A table also groups if asked: each group opens with a strip that says what it
is about and how many rows it carries, folds, and closes with the same count
that the view chose applied to its own. Crossing in bands remains the board's,
which is what draws two dimensions.

The list and the gallery already exist: they read the same rows as the table,
one after another or in groups, and what changes is how much room they give
each one. The calendar too: it puts each row on the day it says.

**What is missing now** is the timeline, and from the calendar, the ranges:
that does depend on a date being able to be a from-to and not a single day.

None of that counts as verified: it is written here to know where to start
testing, not to skip the test.

## What is left for a second stage

These four capabilities —`PR-10` relations, `PR-11` calculations, `PR-12`
formulas and `VW-07` timeline— **are not measured yet**.

The first three are not more properties: they need a dependency graph between
collections and recalculation when something changes, which is building half a
database engine. The timeline draws bars between two dates, so it depends on a
date being able to be a from-to.

`VW-06` left here on 2026-09-14: the calendar turned out not to depend on any
of that, because placing by a single day only asks for the date that already
exists.

They are written here so as not to lose them, but they count separately: while
this section exists, the document is considered complete without them.

---

## CO-01 · It must allow converting a page into a collection

- [ ] From any page a schema can be added and it becomes a collection
- [ ] The action is findable without knowing beforehand where it is
- [ ] When doing so, it offers to start from a template or from scratch
- [x] The collection still has a page body: one can write above the table
- [ ] The schema can be removed and it goes back to being a normal page
- [ ] When removing it, a warning says what happens to the existing rows

## CO-02 · It must treat each row as a full page

- [ ] Clicking a row opens it as a page, with its editable body
- [ ] It can be opened at the side without losing the collection's view
- [ ] Inside the open row its properties are seen and edited
- [ ] A row can have long content, attachments and subpages
- [ ] Rows appear nested under the collection in the side tree
- [ ] One can choose per collection how its rows open: at the side, in the center or in full page
- [ ] In the open row, properties without a value can be hidden
- [ ] When editing a row, the collection's view updates without reloading
- [ ] If another person edits a row, the change is seen in the open view

## CO-03 · It must allow adding rows from the view

- [ ] There is a button to add a row at the end
- [ ] A row can be added inside a group and it inherits that group's value
- [ ] The new row's title can be written without leaving the view
- [ ] The new row appears immediately, without reloading
- [ ] A row can be created from a collection template

## CO-04 · It must allow organizing the collection like any page

- [ ] It appears in the side tree as one more page
- [ ] It can be moved to another space
- [ ] It can be duplicated, and the copy keeps the schema and the views
- [ ] It can be sent to the trash, and it warns that it drags its rows along
- [ ] There is no separate "databases" section outside the tree

## CO-05 · It must allow hierarchy inside a collection

- [ ] A row can have subrows within the same collection
- [ ] The table view allows folding and unfolding the subrows
- [ ] A row can be turned into a subrow of another

## CO-06 · It must allow moving content in and out of the collection

- [ ] An existing page can be dragged into the collection and it becomes a row
- [ ] When entering, it is assigned the schema's properties empty, without losing its content
- [ ] A row can be taken out of the collection and it goes back to being a normal page
- [ ] When leaving, a warning says that the property values are lost
- [ ] Several rows can be moved at once
- [ ] A row can be moved to another collection with the same schema

## CO-07 · It must look the same wherever it is

A collection can be looked at in two places: occupying its own page, or tucked
inside another page as one more block. It is the same data with a different
frame, so what is done in one is seen in the other. That the page itself can be
the collection is reviewed in `04-pages-and-navigation.md` (`PG-22`).

- [ ] A collection occupies its own page, with the view bar at the top
- [ ] The same collection can be inserted inside another page
- [ ] Editing from either of the two places changes the same data
- [ ] Both places offer the same actions on the rows
- [ ] One goes from one place to the other without losing views, filters or values
- [ ] A view inserted in another page can carry its own filter and sorting, without touching the collection's
- [ ] The view of a collection that lives in another space can be inserted, if one has permission
- [ ] Whoever cannot read the collection does not see its data wherever it is inserted

---

## PR-01 · It must allow defining the collection's properties

> It is reached from the button next to the view tabs, and only whoever can
> write the page sees it. Nothing travels until it is saved. Checked in the
> browser on 2026-08-25.
>
> The whole cycle was redone on 2026-08-28 against PostgreSQL: "Área" was added
> —whose key ended up as `area`, derived from a name with an accent—, it was
> given the option "Backend" in green, that value was assigned to a row from the
> panel, and afterwards the property was removed; the schema went back to its
> six properties without leaving the row stuck.

- [x] A property can be added — of any type except title, with the key derived from the name
- [x] It can be renamed — it changes the label, not the key under which the rows stored
- [x] Its type can be changed, and a warning says what happens to the existing data — it says that what is already stored stays as it is and has to be answered again
- [ ] When changing from select to text, the values end up as readable text
- [ ] When changing from text to select, the existing values become options
- [ ] When changing to number, what is not a number ends up empty and a notice says how many rows are lost
- [ ] A type change with no possible conversion is rejected instead of silently emptying the column
- [ ] The type change can be undone
- [ ] It can be deleted, with confirmation — it is deleted, but without asking first
- [ ] It can be reordered by dragging
- [ ] It can be marked as required
- [ ] A property can be duplicated with its configuration
- [x] There is always a title property, and it is the one that opens the page
- [x] The title property cannot be deleted or duplicated — the panel does not offer it and the server would reject it
- [x] The title property can be renamed
- [ ] Changing the row's title changes the page's title, and the other way around

## PR-02 · It must offer text and number

- [ ] Text: it accepts several lines and is not cut off when losing focus — a single line
- [x] Number: it rejects letters — the field is numeric and does not admit them
- [ ] Number: it allows choosing a format (integer, decimal, currency, percentage)
- [ ] Number: it can be shown as a progress bar
- [x] Both are edited directly in the table cell

## PR-03 · It must offer single and multiple select

> An option is stored with its name and its color, from a closed set of
> nine. Color never says anything by itself: the name always travels beside it.
> Recorded in `docs/business-rules/fea-clc.yaml`.

- [x] The available options can be defined — from the collection's configuration, adding and removing
- [x] Each option has a color — chosen from a palette of nine, with all of them in view
- [ ] A new option can be created by typing it from the cell — from the configuration, and as a column from the board
- [x] Options can be reordered and renamed — both from their column on the board, which is what an option is there
- [x] Renaming an option updates all the rows that use it — the shape and the rows are rewritten in the same operation
- [x] Multiple select allows removing values one at a time
- [x] Options are seen as colored labels, not as plain text

## PR-04 · It must offer status with phases

- [ ] There is a status type, distinct from select
- [ ] Options are grouped into phases (pending, in progress, done)
- [ ] The board can group by these phases
- [ ] Progress is seen visually

## PR-05 · It must offer people

- [ ] Assignment is done by searching by name — it is chosen from a list, without typing to filter
- [x] The person's **name** is shown, never their identifier
- [x] The right name is seen both in the table and in the properties panel
- [ ] Only people with access to the space appear
- [ ] Several people can be assigned
- [ ] An assignment can be removed
- [ ] The assigned person finds out in some way

> Checked in the browser on 2026-08-28, and fixed right there. The table and the
> cards showed the person's raw identifier —`019fd484-862c-…`— while the side
> panel did say their name: only the panel received the space's directory. Now
> the table and the board receive it too, and all three say "Worker User".
> Someone the directory no longer recognizes is named as an unknown member, in
> words; while the directory has not arrived nothing is said, because showing
> the identifier is the one thing that cannot happen.

## PR-06 · It must offer dates

- [ ] It is chosen from a calendar
- [ ] The date can be typed by hand
- [ ] It admits a date range (start and end)
- [ ] It admits including the time
- [ ] It is shown in the user's format and language
- [ ] The value can be cleared
- [ ] A reminder can be set

## PR-07 · It must offer a checkbox

- [x] It is checked and unchecked with a click on the cell
- [x] The value is reflected immediately — it is drawn before the server answers, and goes back only if it answers no
- [ ] It can be grouped and filtered by checked / unchecked — grouping yes, checked; filtering is built but untested

## PR-08 · It must offer link, email and phone

- [ ] Link: it opens in a new tab on click
- [ ] Email: it opens the email client
- [ ] Phone: it allows calling from mobile
- [ ] All three validate the format and warn if it is wrong

## PR-09 · It must offer files as a property

- [ ] Files can be uploaded to a cell
- [ ] A thumbnail is seen if it is an image
- [ ] They can be downloaded and deleted
- [ ] It admits several files in the same cell

## PR-10 · It must offer relations between collections

- [ ] A property that points to rows of another collection can be created
- [ ] The target row is searched by typing
- [ ] Several rows can be related
- [ ] The target collection shows the inverse relation
- [ ] One can navigate to the related row with a click
- [ ] Deleting a related row does not leave a visible broken reference

## PR-11 · It must offer calculations over relations

- [ ] A value can be brought from the related rows
- [ ] It can sum, count, average, and take minimum and maximum
- [ ] The value is recalculated on its own when the source changes

## PR-12 · It must offer formulas

- [ ] A formula that uses other properties can be written
- [ ] There is help for the available functions while writing
- [ ] Formula errors are explained instead of showing an empty value
- [ ] The result is recalculated when the source data changes

## PR-13 · It must offer the page's automatic data

- [ ] Created by
- [ ] Creation date
- [ ] Last edited by
- [ ] Last edit date
- [ ] These values cannot be edited by hand
- [ ] They can be used to filter and sort

## PR-14 · It must understand what is typed or pasted into a cell

**How to test it:** copy a date from a spreadsheet and paste it into a date-type cell.

- [ ] Typing text in a date cell interprets it as a date
- [ ] Typing text in a number cell interprets it as a number
- [ ] Typing in a select cell chooses the option, or creates it if it does not exist
- [ ] Typing several comma-separated values in a multiple-select cell assigns them all
- [ ] What cannot be interpreted is rejected with a notice, without erasing what was there
- [ ] Copying a cell delivers readable text, not an identifier
- [ ] A range of cells can be copied and pasted elsewhere
- [ ] A whole column can be pasted from a spreadsheet

---

## VW-01 · It must offer a table view

- [x] The rows are seen with their properties in columns
- [x] A cell can be edited without opening the row — the cell becomes its own field, and only what was touched travels
- [x] The width of the columns can be adjusted — by dragging their edge, and also with Alt and the arrows
- [x] The columns can be reordered by dragging — from their handle, and also with Alt and the arrows
- [x] The first columns can be frozen when scrolling — from the column's menu up to the one indicated
- [x] A calculation can be shown at the foot of each column — chosen right there and saved in the view
- [x] The calculations include count, count empty and count with value
- [x] On numeric columns they include sum, average, minimum, maximum and median
- [x] On checkbox columns they include the percentage checked
- [x] The calculation respects the applied filter
- [x] With grouping, each group shows its own calculation — the same one the view chose, over that group's rows
- [x] A wide table scrolls inside itself without breaking the page — it measures what its columns add up to and scrolls in its frame

## VW-02 · It must offer a board and allow moving cards with the mouse

**How to test it:** open a collection in board view and drag a card from one column to another.

- [x] The rows are seen as cards grouped in columns
- [x] One chooses which property to group by — from the configuration, and it only offers those that can be grouped
- [x] A card can be dragged from one column to another
- [x] On dropping it, the property's value changes on its own
- [x] The change persists on reload — checked against the database, not only on screen
- [x] A card can be reordered within its same column
- [x] While dragging, where it will land is seen — the gap between the two cards where it would fall is marked
- [ ] Another person viewing the same board sees the movement — there is no real time in collections
- [x] A card can be created directly in a column — it is born with that column's value set
- [x] One chooses which properties are shown on the card — and the property it groups by is not repeated on it
- [x] Empty columns can be hidden — requested in the view, and while dragging a card they appear again
- [x] The count of cards per column is seen
- [x] Each column is seen with the color of the option it represents
- [x] If no grouping property is configured, it explains what to do
- [x] A card can be moved without a mouse, with only the keyboard — with Alt and the arrows
- [x] When moving it with the keyboard, where it ended up is announced
- [x] Dragging toward the edge scrolls the board on its own

> Checked in the browser on 2026-08-25. A card dragged from `todo` to
> `in_progress` changed the value in the database, and the board was rebuilt
> without reloading. The same with the keyboard, announced by `aria-live`.
> Dropping a card in its own column writes nothing. Whoever can only read is not
> allowed to drag, and the server rejects the attempt made from outside with 403.
>
> Extended on 2026-08-28. The grouping is changed from the configuration: the
> view went from grouping by `Status` to grouping by `Priority`, the board was
> rebuilt into columns `low`, `medium`, `high` and unassigned, and `groupBy` was
> saved in the database. **The board writes the property it groups by, whichever
> it is:** with that grouping, moving a card changed its `priority` and left its
> `status` intact. What a card shows is also chosen there: removing
> `Description` took it out of the cards and out of the saved record, and the
> property by which it groups is never repeated inside the card that is already
> in its column.

## VW-03 · It must allow handling the board's columns

Dragging cards is half of a board; the other half is being in charge of the
columns. A column **is** a value of the property it groups by, so touching it
here touches that property across the whole collection — and that has to be
seen coming before it happens.

**How to test it:** in a collection grouped by status, add a column, rename it,
move it to another place and delete one that has cards inside.

- [x] A column can be added from the board, and it appears as a new value of the property
- [x] A column can be renamed, and the value changes in all the rows that had it
- [x] A column can be reordered by dragging it, and the order persists — from its handle, and also with Alt and the arrows
- [x] A column can be painted a color, and that color travels with the value to the other views
- [x] A column can be folded to leave it as a narrow strip
- [x] A folded column still says how many cards it has — and what it is called
- [x] When deleting a column with cards inside, a notice says how many will be left without a value
- [x] The rows of a deleted column are left without a value, they are not deleted
- [x] There is a column for rows without a value, and it can be hidden — it is hidden only while it is empty: hiding a column never hides rows
- [x] A limit of cards per column can be set
- [x] Past the limit, the column says so without preventing dropping
- [x] One can group by a second property and see bands that cross the columns — each band repeats all the columns, so they read aligned
- [x] What is changed about the columns belongs to the view, and does not alter what the other views of the same collection see — folding them, their limits and hiding the one without a value belong to the view; the name and the color belong to the value and are seen in all of them, and that is said before touching them

> Checked in the browser on 2026-09-10 against PostgreSQL. **Renaming drags the
> rows along:** the option was renamed in place and with its color set, and the
> row that said the old name came to say the new one in the same operation. The
> new name is also seen in the table, because it belongs to the value and not
> to the view. **Removing a column** asks first, saying how many rows it leaves
> without a value, and on confirming the row keeps everything else: it loses only
> that property and lands in "Unassigned". **Two columns with the same name**
> are not allowed: it says which is the one that already exists, without even
> asking the server. The column for rows without a value offers no actions,
> because it is not a value that can be touched.
>
> Extended the same day with what belongs to the view and not to the value.
> **Folded**, a column stays in a 44 px strip that still says what it is called
> and how many it carries, and unfolds when touched; it is saved in the view.
> **The limit** is written in the header itself, the count comes to read "2/1",
> and when exceeded it says so without preventing dropping: a card was dragged
> to a column with limit 1 and it went in anyway, with the notice in place.
> **The column without a value** is hidden and shown again from the board, and
> comes back on its own as soon as some row is left without a value: hiding a
> column never hides rows. **Its place** is changed by taking it from its handle
> and dropping it over the column in front of which it should stay —or over "add
> column" to leave it at the end—, and also with Alt and the arrows, because
> dragging cannot be the only way. That order belongs to the property, so it is
> the same in all the views.

## VW-04 · It must offer a list view

- [x] It shows the rows as a simple list, without a grid
- [x] One chooses which properties accompany each entry
- [x] It is comfortable to read for content pages, not only data

## VW-05 · It must offer a gallery view

- [x] It shows the rows as large cards
- [ ] The size of the cards is chosen
- [x] The card reads without an image — covers were withdrawn from the scope on 2026-08-18

## VW-06 · It must offer a calendar view

- [x] Rows are placed by a date property — which one is chosen in the view's configuration
- [x] One navigates between months — and without going to the server, because the rows are all already on screen
- [x] An entry can be dragged to another day and the date changes — and also with Alt and the arrows
- [x] A row can be created by clicking on a day — it is born with that date set
- [ ] A date range is seen extended over the days it covers — a date is a day, not a from-to (`PR-06`)

## VW-07 · Timeline — out of this pass

`../future-scope.md` declares it, and `../current-scope.md` says that calendar and
timeline do not enter the current completion round. The calendar was brought
forward because the date already existed and grouped; the timeline also needs a
date to be a from-to (`PR-06`). It will be reviewed when it is opened as its own
work, with its boxes written then.

## VW-08 · It must allow filtering

- [x] One can filter by any property
- [x] Each type offers the conditions that correspond to it (contains, is, is empty, before)
- [x] Several filters can be combined with "and" / "or"
- [x] Groups of conditions can be nested — a group inside the one above, which are the three levels the contract admits
- [x] Applied filters are seen at the top and removed one at a time — the button says how many are set
- [x] The filter is saved with the view
- [x] It is seen how many rows were left out of how many — "0 of 3 rows", next to the filter and sort buttons
- [x] A filter that lets nothing through explains that there are hidden rows — and says how many they are and what to do to see them again

> Checked in the browser on 2026-08-28 against PostgreSQL. A condition
> `Status is done` left 4 rows out of 13, and the filter was saved in the view.
> The operators offered are those of that class of property —a date does not
> "contain"—, and the value field disappears when the operator asks for none. A
> select offers its options instead of asking for them to be typed.
>
> **Defect found and fixed along the way:** the filter was saved but did not
> come back. When reading the configuration, the backend discarded the `null`s,
> and a condition without a value —the one just created, or any with "is
> empty"— lost its `value` field; without it the condition stopped validating
> and with it the whole filter, which came back as if nobody had filtered.

## VW-09 · It must allow sorting

- [x] One can sort by any property
- [x] Ascending and descending
- [x] One can sort by several properties in a chain
- [x] The order is saved with the view
- [x] One can go back to manual order — removing the sort, the rows go back to their own

> Checked in the browser on 2026-08-28. Sorting by `Due date` put the rows from
> oldest to newest, reversing it turned them around, and both things were saved
> in the view. A property already used is not offered again: sorting twice by
> the same thing does not sort more.

## VW-10 · It must allow grouping

- [x] One can group by a property in any view — the board always, the table when asked
- [x] Only the properties that make sense to group by are offered for grouping
- [x] Grouping by date allows choosing the span: day, week, month — it is chosen next to what it groups by, and only appears with a date set
- [x] Grouping by checkbox produces two groups, checked and unchecked
- [x] Grouping by select creates one group per option, including "no value"
- [x] Each group shows its count
- [x] Groups fold and unfold — the board's columns and the table's strips, and it is saved in the view
- [x] Groups can be reordered — the board's by dragging their column, a table's with the arrows on its strip
- [x] Empty groups can be hidden — requested in the view, and it holds the same for a table's strips and a board's columns
- [ ] When dragging a row between groups, the value changes on its own only if that property admits writing — today all of them do: none is calculated on its own (`PR-11`, `PR-12`)
- [ ] If it does not admit it (for example a calculation), dragging is not allowed and it explains why — there is no case to test until calculated ones exist

## VW-11 · It must allow choosing what is shown

- [x] A property can be hidden in a view without deleting it
- [x] Each view saves its own visible properties
- [x] What is shown can be reordered — by moving the table's columns, which is the same thing said from where it is seen

> Checked in the browser on 2026-08-28. Removing `Description` from the board
> took it out of the cards and left the table intact, with each view saving its
> own list. A view that never chose shows everything, which is different from
> choosing to show nothing.

## VW-12 · It must allow several views of the same collection

- [x] Several views can be created over the same rows — from the configuration, at any time
- [x] One switches between them with tabs — the open view goes in the address, so a board is sent by link
- [x] Each view has a name and an icon — an emoji, which accompanies the name in its tab
- [x] Each view keeps its own filter, sort and grouping — and the three are changed from that view's configuration
- [x] A view can be duplicated, renamed and deleted — the copy lands next to the original and never takes the lead
- [x] One can define which is the default view — it is the one that opens when the address names none
- [x] A table view can be converted into a board, and the other way around — and to list or gallery, which are classes like the others
- [x] When converting, what still applies is kept: filters, sort and visible properties
- [x] What does not apply to the new type is discarded with a notice
- [x] Converting a view does not alter the rows

## VW-13 · It must allow searching within the collection

- [x] There is a search of the collection's own — above the table, and it responds as one types
- [x] It searches in the title and in the text properties — without accents or case getting in the way
- [x] The results respect the applied filters — it searches among what the filter let through, and says how many it found out of how many

## VW-14 · It must offer charts over the collection's data

- [x] A chart can be created from a collection — it is one more view class, chosen when creating it
- [x] One chooses which property goes on each axis — the grouping is the bottom axis, and what it measures is the side one
- [x] There are bars, lines and pie
- [x] One can group by a property — it groups like any view, and that is why the axis is that grouping
- [x] The chart respects the view's filters
- [x] It updates when the data changes
- [x] It can be inserted inside another page — choosing which of its views goes there
- [x] It reads well in dark mode — each tone lightens, and the pie says its numbers beside it

## VW-15 · It must allow reordering by dragging across the whole collection

- [x] The table's columns can be reordered by dragging
- [x] The properties can be reordered in the configuration panel — with the arrows on each line; the name's one does not move
- [x] The options of a select property can be reordered — from the board's columns, which is what those options are
- [x] The saved views can be reordered
- [x] The board's columns can be reordered
- [x] Each of these orders survives reloading

## VW-16 · It must allow editing several rows at once

- [x] Several rows can be selected with checkboxes — the checkbox accompanies the name, without a column of its own
- [x] The same property value can be assigned to all the selected ones — with the same field that answers a single row
- [x] They can all be deleted together — they go to the trash, which is where one returns from
- [x] They can all be duplicated together
- [x] It is seen how many are selected
- [x] Select all respects the applied filter — it checks what is being seen, not what the collection stores
- [x] The operation can be undone — from the notice, which stays for twelve seconds because it is a way back and not just any notice

## VW-17 · It must allow adjusting how the table looks

- [x] The height of the rows can be chosen — short, medium or tall
- [x] Long text can be made to wrap over several lines or be cut off
- [x] A column's content can be aligned — from that column's menu
- [x] These preferences are saved with the view

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| 2026-08-28 | PR-01, PR-05, VW-02, VW-11 | Walkthrough in the browser against PostgreSQL of what was already built and this document took as absent. **Grouping:** it was changed from the configuration from `Status` to `Priority`, the board was rebuilt and, with that grouping, moving a card wrote `priority` without touching `status` — the board writes the property it groups by, not a fixed one. **What each view shows:** removing `Description` took it out of the cards and left the table intact; the property by which it groups is not repeated inside its column. **Schema:** "Área" was added (key `area`, derived from a name with an accent), with option "Backend" in green, assigned to a row and the property removed, without locking the row. **Defect found and fixed:** the table and the cards showed the assigned person's identifier while the panel said their name, because only the panel received the space's directory; now all three receive it, and whoever the directory does not recognize is named in words instead of showing the identifier. **Not built:** handling the board's columns, and filtering and sorting from the screen. | Correct |
| 2026-08-28 | VW-08, VW-09 | Filtering and sorting from the screen, verified against PostgreSQL. `Status is done` left 4 rows out of 13; sorting by `Due date` put them from oldest to newest and reversing it turned them around; both things were saved in the view and survived reloading. Each class of property offers the operators that correspond to it, the value field disappears when the operator asks for none, and a select offers its options instead of asking for them to be typed. **Defect found and fixed:** the filter was saved but did not come back —when reading, the backend discarded the `null`s, and a condition without a value lost the `value` field its contract demands, so the whole filter stopped being read—. **Missing from these two blocks:** nesting groups of conditions (the contract admits three levels, the screen offers one) and saying how many rows were left out of how many. | Correct |
| 2026-09-10 | VW-02, VW-03, VW-10, VW-12, VW-15 | Walkthrough against PostgreSQL of what was built since the last entry, and checking off what already complied without being checked. **Views:** they are created, renamed, deleted, ordered and one chooses which opens by default, all from the configuration and at any time; the order stopped being the server's alphabetical one and became a column of its own, so moving a view is seen and survives reloading. **Second grouping:** a board can group by two properties. It was resolved as **crossing bands** —each band repeats all the columns— and not as strips inside each column, so that the columns stay aligned from band to band; the block's text was adjusted to what was actually built. Dragging between bands writes both properties in a single call. **Grouping by anything:** a property without declared options —date, number— already groups, deriving the groups from what the rows have; a checkbox always gives two groups. **Board:** reordering a card within its column works, and while dragging the gap where it would fall is marked (checked by row identifier, not by title, because the test cards were named the same). Creating a card in a column leaves it with that column's value. **Defects found and fixed:** the server demanded that a select have at least one option, which blocked adding a new property before being able to give it options; a newly created board was rejected for not bringing a grouping, and now it is born grouped by the first property that will do; and the save button was left outside the visible window because the panel measured by the document and not by what is seen. **Missing:** handling the board's columns, grouping in the table, and the spans (day, week, month) when grouping by date. | Correct |
| 2026-09-10 | VW-01, PR-01, PR-02, PR-07 | **The cell is answered where it is.** A table cell becomes its own field when touched and goes back to being text when the answer is given; only the property that was touched travels, not the whole row. What is chosen —a select, a checkbox— is answered in the same gesture; what is typed is saved when leaving the field or with Enter, and Escape repents without writing anything. Checked against PostgreSQL over text, date, select, number and checkbox, and also checked that Escape leaves no trace. **Calculations at the foot.** Each column says whatever it wants about all its rows together: count, count with value, count empty, and over numbers sum, average, minimum, maximum and median; a checkbox says what share is checked. Only what that class of property admits is offered —a date does not sum—. It is counted over the rows the view let through: with `Status is done` the count dropped from 3 to 1. What is chosen is saved in the view and survives reloading. Checked with 3, 8 and 4: sum 15, median 4, and one of three boxes checked gave 33 %. **Changing a property's type** is now offered, saying that what the rows stored stays as it is. **Defect found along the way:** the running backend was serving an old version of `shared` and rejected any view change —also sorting, which already worked—; the development stack was restarted and with the contract up to date everything went back to saving. **Missing from this block:** column width, reordering them, freezing them, and a calculation per group, which needs the table to group. | Correct |
| 2026-09-10 | VW-03, PR-03 | **Being in charge of the board's columns.** A column is added, renamed, painted and removed, from the column itself. Renaming was what could not be done without breaking anything: the shape alone does not distinguish a rename from a remove and add, so it was built as an operation that says which name it comes from, and the server rewrites the shape and the rows in one transaction. Checked against PostgreSQL: the option was renamed in place and with its color, the row that said the old name came to say the new one, and the new name is also seen in the table. **Removing** a column asks first saying how many rows it leaves without a value; on confirming, the row loses only that property —it keeps the rest and lands in "Unassigned"—, which is the opposite of deleting it. **Edge cases:** two columns cannot be called the same, and it says which is the one that already exists without even asking the server; the column for rows without a value offers no actions, because it is not a value that can be touched; and a board grouped by date or number does not offer them either, because those columns come from what the rows have set and not from declared options. **Its place** is changed for a board column by taking it from its handle and dropping it over the one it should stay to the right of, or over "add column" to leave it at the end; and with Alt and the arrows, because dragging cannot be the only way —the accessibility warning that fired when doing it only with dragging was resolved by giving it its own handle and keyboard, not by silencing it—. That order lives in the property, so it holds for all the views. With that `VW-03` is complete. | Correct |
| 2026-09-11 | VW-01, VW-15 | **Being in charge of a table's columns**: width, place and which ones stay still. All three belong to the view, not to the collection. The width is dragged from the column's right edge and follows the hand, being saved on release —sending one per pixel traveled would be one call per movement—; it is also adjusted with Alt and the arrows. The order is changed by taking the column from its handle, and it is that of the properties the view says to show: a view that never chose is written out in full as it was being seen before moving anything. Freezing is requested from the column's menu and holds up to it. **Three defects found in the browser and fixed:** the width handle was left half outside its cell and the neighboring column covered it, so it could not be taken; the browser stretched the table to its frame and gave the surplus to the last column, which then ignored whatever width it was given —now the table carries written how much its columns add up to and scrolls inside its frame—; and the foot did not stay still with the others, so its cells passed underneath and the frozen column was left with a hole. **Environment defect, not of the code:** adding keys to a view's contract made the running backend —with the old version of `shared`— reject with 400 *any* view change; the stack was restarted. **Missing from this block:** grouping in the table, and with it a calculation per group. | Correct |
| 2026-09-13 | VW-01, VW-10 | **Grouping in the table.** How the rows arrive stopped being said only by the view class: now it is said by the class and what the view has set, so a table reads its rows one after another until it is asked to group and then reads them in groups, with the same operation that builds a board. Each group opens with a strip that crosses the table saying what it is about and how many rows it carries, and closes with the same count that the view chose applied to its own; at the very bottom the total follows. Folding a group is saved in the view, and holds the same for a board's columns —that is why what is saved came to be called `collapsedGroups` and not `collapsedColumns`: it is the same group looked at another way—. **Two things that had to be fixed:** the server demanded that the view *have to* group instead of *be able to*, so it rejected the table and left it with the sign "the grouping property is missing"; and crossing in bands was explicitly limited to whoever reads in groups by what it is, because a table draws a single dimension. **Fixed after El-Vitas tested it:** folding took as long as the trip to the server took, because nothing was drawn before the answer; now it folds on touch —24 ms measured— and what the server answers replaces that. **Missing:** reordering a table's groups, hiding the empty ones, and the spans (day, week, month) when grouping by date. | Correct |
| 2026-09-13 | VW-01, VW-10 | **What a view says about itself stopped costing the whole collection.** El-Vitas warned that folding was slow and that repeating the click made it worse. Measured: 400-600 ms per click. It was two chained things. The underlying one: saving anything from a view —a filter, a width, a folded strip— sent the entire collection, and the server deleted and recreated **every property and every view** for that; besides being expensive, it leaves a window where what another person just changed is lost. Now there is an operation that touches only that view's configuration. The one on top, and it was a mistake of mine: the folding was reconciled with the server by comparing against what was last **touched** instead of against what was last **said by the server**, so each render undid the gesture and the strip only stayed folded when the trip answered. Measured afterwards: **8-17 ms** over ten consecutive clicks, and three different strips folded 50 ms apart are left all three as they were left. A guard was also added so as not to heed the server while there are trips that have not returned. | Correct |
| 2026-09-13 | VW-04, VW-05 | **Two more ways of looking at the same rows: list and gallery.** They came in the way a new view class comes in since the shape stopped belonging to the type: a value in the database's enum, an entry in the definitions that says how it reads its rows, and a registered component. Nothing that filters, sorts or groups had to learn their names. Both read their rows one after another and also in groups when asked, like the table. The **list** puts each row on a line with its name above and what it stores on a single line below, small —stacking six properties vertically turned each row into a paragraph, so the same piece that draws what is on a card now draws it in a column or in a line depending on where it is—. The **gallery** puts them as cards that adjust to whatever width there is, without a fixed number per line. Checked against PostgreSQL: both views are created from the configuration with their class, saved, opened by their tab, and grouping the list by `Status` splits it into spans with their color and their count. Along the way, a row's name with its link to the full page, which was written three times, was brought together in a single place. **Missing from these two blocks:** choosing a cover image and the size of the cards, which need a row to be able to carry an image. | Correct |
| 2026-09-13 | VW-10 | **Empty groups and group order.** Hiding groups without any row is requested from the view, next to what it groups by, and not from the board: it is the same for a table's strips as for a board's columns, so it is said once. On the board it is paid for with one less place to drop a card, and that is why while one is in the air all of them appear again —checked in the browser: with the "Unassigned" column hidden, starting to drag brings it back—. **Changing the place of a table's group** is done with two arrows on its own strip, and not by dragging it: a strip crosses the table from side to side, so dragging it points nowhere, and it is also what is touched to fold it. What moves is the value, not the strip, so that order is the same as that of the board's columns and holds for all the views; it is only offered where the group is a declared value. Checked against PostgreSQL: moving "todo" down one place left the options as `in_progress, todo, done` and the table was redrawn in that order. Along the way, sending the collection's shape —what belongs to the value and not to the view— stopped being written twice. **Environment defect, again:** adding a key to a view's contract made the running backend, with the previous version of `shared`, reject with 400 any shape change; the stack was restarted. **Missing:** the spans (day, week, month) when grouping by date, and saying why one cannot drag between groups when the property does not admit writing. | Correct |
| 2026-09-13 | VW-10 | **The spans when grouping by date.** Without a span, a date makes one group for every distinct day that some row named, and a year of work is three hundred groups of one row. Now the view says how much fits in each group —day, week or month— and the selector appears only when the property it groups by is a date: nobody groups a select "by months". The span does not touch what the rows store; it only changes which group they go to. Each group is named by its beginning —the day, the Monday of that week, the year and the month— because that way the name sorts on its own: placed in a row they end up in the order in which time passed, without comparing them as dates. The week starts on Monday. Checked against PostgreSQL with `2026-08-10`, `2026-08-14` and `2026-08-21`: by month, a single group `2026-08` with the three; by week, `2026-08-10` with two and `2026-08-17` with one. The span's arithmetic lives in `shared` with its own tests, so the server distributes and the screen chooses without either of the two knowing how to make calendars. | Correct |
| 2026-09-13 | VW-12 | **Duplicating a view, changing its class, and giving it an emoji.** With that `VW-12` is complete. **Duplicating** copies everything the view says about itself —filter, sort, what it shows, what it groups by—, because whoever duplicates wants to start from there and not from zero; the copy lands next to the original, with a similar free name (`Table (2)`), and never takes the lead: opening the collection leads to one place and not two. **Changing the class** stopped being a fixed datum and became the same dropdown with which a view is created: it does not touch the rows, they are the same ones looked at another way. Everything the new class still understands stays and what it does not goes away —the bands outside a board—, saying so. What the new class simply ignores, like the column widths on a board, stays where it is: going to a board and coming back does not have to cost the work done. And what the new class needs and was not there —a board's grouping— is filled in on its own, because a view that cannot be drawn would bring down the saving of the whole collection. Checked against PostgreSQL: duplicating the table gave `Table (2)` with its grouping; converting it into a board saved it as `BOARD` keeping `groupBy`; putting bands on it and turning it into a list warned that the bands were being removed and removed them. **The emoji** belongs to the view and accompanies the name in the tab, it does not replace it: an emoji alone does not say which of three boards is which. Emoji only, with a search, because a tab measures what a line of text measures and an image cannot be read there. Along the way, the view's panel was split: what it groups by, the span and the empty groups read together and now live in their own piece. | Correct |
| 2026-09-13 | VW-08 | **How many rows are being seen out of how many there are.** The two counts go together because alone they say nothing: "3 rows" does not distinguish a collection of three from one of forty with a filter set. They come from the server, which is where all the rows are —here only the ones the view let through arrive—, so a view's response stopped being just its rows and became its rows and how many it came out of. **And a filter that lets nothing through is explained**: saying "No rows yet" sends one to add a row that is already there, hidden behind a condition nobody remembers having set; now it says how many there are and what to do to see them again, and it holds the same for the four view classes because it is decided before drawing any. Checked against PostgreSQL: without a filter, "3 of 3 rows"; with a condition that matches none, "0 of 3 rows" and the notice in place of the table. | Correct |
| 2026-09-13 | VW-03, VW-10 | **Defect found by El-Vitas and fixed: carrying a column, the board offered gaps between cards.** When dragging a column and passing over a card, the line that marks where a *card* would land lit up, and the destination column stopped being indicated: it looked as if a column could be dropped inside another, between two cards, which is not something that exists. The cause: the card attended to the gesture without looking at what was in the hand, and also stopped it, so the column underneath never found out. Now, with a column in hand, the card steps aside without touching the gesture and the column answers. **And a folded column went back to being a place to drop**: it was not one, so a folded column split the board into two halves between which nothing could be passed. Reproduced and checked in the browser: carrying `done` over a `todo` card no line lights up anymore, `todo` is marked, and dropping leaves `done` in front of it; over a folded column, it is marked the same. | Correct |
| 2026-09-13 | VW-15 | **Reordering the properties from the panel**, with which `VW-15` is complete. With the arrows on each line and not by dragging, like a table's strips: the panel's list is also where each property is entered, and a row that serves both to enter and to drag does both halfway. This order is the collection's, so it rules in the views that did not choose their own. The name property stays where it is and none is put in front of it: it is always first because it is the one that opens each row. Checked against PostgreSQL: moving `Priority` up left the order `title, status, priority, assignee…` saved in the `order` column, and the table was redrawn with `Priority` before `Assignee`. | Correct |
| 2026-09-13 | VW-01, VW-03, VW-11 | **Performance defect found by El-Vitas and fixed: each gesture rebuilt the page twice.** He warned that the collection took a while to update. Measured in the browser: 1198 ms from the click to seeing the change. The breakdown made it clear that it was not computation —not a single long task— but waiting: two consecutive trips of ~500 and ~370 ms. The backend answered in 34 ms; what cost was the portal rebuilding the whole page, and it did so **twice**: the server action invalidates what is stored and already comes back with the page rebuilt, and on top of that a separate redraw was requested. That second trip was removed in the six places where it was —saving the configuration, moving a column or a group, changing what a view says about itself, editing a cell, creating a row and moving a card—, measured again: saving the configuration **835 ms** (from 1198), moving a group **702 ms**, filtering **771 ms**, all with a single trip; editing a cell changes in **6 ms** and moving a card in **34 ms**, because those were already drawn before asking. It was also checked that each gesture still ends up saved in PostgreSQL. | Correct |
| 2026-09-14 | VW-06 | **The calendar view.** The document had it tied to "resolve the dates first", and that no longer held: the date property exists, filters and groups by day, week or month. It came in the way any view class comes in —a value in the enum, a definition and a registered component—, and the only thing it knows how to do that nobody else knew is count a month's days: that lives in `shared` with its tests, always in six whole weeks, because a grid that changed height would move everything below it when changing month. **Which date it places by** is chosen in the view's configuration, because a collection can store several —when it starts, when it is due— and the calendar shows one at a time; it is born pointing at the first there is. **Changing month does not travel to the server**: the rows that pass the filter are all already on screen, so changing month is distributing them another way. **Dragging an entry to another day** writes that date to it, and only that; it is drawn on the new day before asking, and if the server says no, it goes back on its own. With Alt and the arrows it does the same without a mouse: one day to the sides, one week up and down. **Creating on a day** leaves the row with that date set. The days and months are named by `Intl` in the language of whoever is looking, and the week starts on Monday. What no date says falls on no day and is said at the foot, because otherwise it would look deleted. **Defect found when testing it and fixed:** creating from a day failed with "Page property values are invalid" —the row was born only with the date and the collection demanded an answer for another property—; now a row is born also answering what the collection takes for granted, which also covers the same hole on the board. Checked against PostgreSQL: the three tasks fall on their August days, dragging one from the 21st to the 25th left `2026-08-25` saved, and creating one on the 18th left it with date and status. **Missing:** that a range be seen extended over the days it covers, which needs a date to be able to be a from-to (`PR-06`). | Correct |
| 2026-09-14 | VW-16 | **Editing several rows at once.** Each row's checkbox accompanies the name instead of having a column of its own: one more column would move all the others and fight with the widths and with the ones that stay still. The one at the top checks **what is being seen** —what the filter let through, not what the collection stores— and is left half-checked when there are some of each, because full would say that all are there and empty that there are none. With something checked a bar appears that says how many there are and offers **assign, duplicate and delete**; with nothing checked it is not there, because a bar that says "none" takes up room to tell what is already seen. **Assign** uses the same field with which a single row is answered: first which property and then with what, because the value depends on the property. **Delete** sends to the trash and does not ask first: asking and also being able to undo is asking twice for the same decision. **Everything is undone** from the notice, and for that each operation notes down what is needed to go back —what each row said, or which are the freshly made copies—; the notice lasts twelve seconds and not four, because it offers a way back and does not just report something. Checked against PostgreSQL: assigning `Priority` to two checked ones wrote it to both, duplicating created the copies, deleting left the rows in the trash, and undoing returned them to active. The selection is not saved: it belongs to this moment and to whoever is looking. **Environment defect fixed in passing:** the bar reaches the page actions, and four tests loaded the real module and blew up when dragging in server code; the same mock their neighbors already used was added to them. | Correct |
| 2026-09-14 | VW-17 | **How the table looks: row height, wrapped text and alignment.** The height and the wrapping go together in a control of their own above the table, because they are decided by looking at it and not in the collection's configuration; the alignment goes in each column's menu, which is where it is being looked at. **Wrapping the text raises the height** when it was at the shortest: wrapping without letting the row grow would leave the extra lines out of view. Stopping wrapping does not lower it, because whoever raised it may want it tall anyway. The height is said as a maximum and not as a fixed measure: a row with little text does not have to take up what the fullest would. **Aligning to the start is not saved**: it is what any table does, and saving it would be saving that nobody chose. All three belong to the view, so two views of the same rows can look different. **Defect found when testing it:** aligning the column moved the text but not what is seen, because inside each cell there is a button that takes the entire width so it can be touched at any point; now each side is said both ways, for the text and for the box. Checked against PostgreSQL: asking to wrap left `rowHeight: MEDIUM, wrapsText: true`, and aligning `Priority` to the end left `{"priority": "END"}` and the column stuck to its right edge. | Correct |
| 2026-09-14 | VW-17 | **Defect found by El-Vitas and fixed: the row height did nothing.** Measured in the browser: 61 px before asking for "alto" and 61 px after. Two causes, both from writing the height where it is not read. The first: it was said as a maximum height on the cell, and a table cell grows with what it carries without heeding a height; now it is said as air —padding— and as a minimum height of what is touched inside it, which never goes below the forty-four pixels that a finger measures. The second, when testing it again: the cell came with written that its text does not break onto another line, so wrapping it wrapped nothing; now wrapping starts by allowing it. Measured afterwards: **53, 81 and 145 px** for short, medium and tall, and the text on several lines with a cap —three or six depending on the height—, so that a row with a paragraph inside does not measure half a screen. | Correct |
| 2026-09-15 | VW-13 | **The collection's search.** It searches **among what is already on screen**, which are the rows the filter let through: that way it respects the filter without knowing anything about it, and it responds as one types instead of going back and forth to the server for every letter. Checked: with `Status is done` set, searching for a word that only a filtered-out row says does not bring it back. It searches in the name and in what is answered by typing, and not in dates or numbers: whoever types "agosto" is not looking for `2026-08-14`, and whoever types "3" would find half the collection. It compares without accents or case, with the same folding the page search already used. What is searched is not saved in the view —it belongs to this moment—, and if it finds nothing it says so with the word in front, because a table with the header in place and nothing below looks broken. It also says how many it found out of how many there are: the counter above counts what passes the filter, this one what the search finds. **Environment:** the PostgreSQL container had gone down and the browser session had expired; it was brought up and signed in again before checking anything. | Correct |
| 2026-09-17 | VW-02 | **Dragging against the edge scrolls the board on its own.** Without this, carrying a card to a column that cannot be seen is three gestures: dropping it in the middle, scrolling by hand and taking it again. The scrolling goes **by frames and not by event**, because the browser stops sending events when the hand stays still against the edge —and still against the edge is exactly where one has to keep moving—. The speed **grows with closeness to the edge**: brushing the seventy-two-pixel strip it barely moves and stuck to the edge it goes at full, so that approaching little by little scrolls little by little. The computation lives apart from the view, so it is checked without a browser: five tests for both sides, the middle and the extremes. Checked in the browser with the board wider than the window (1288 against 752): with the hand in the center nothing moved in half a second; against the right edge it went from 0 to 256 in a quarter of a second and reached the cap of 536; against the left it went back to 0; leaving the board and dropping stop it, and whatever is left running is canceled when the board disappears. **Environment, again:** the PostgreSQL container was down and the session expired. **Method note:** native HTML5 dragging is not produced with synthetic mouse events in this browser, so it was checked by sending the same drag events that the browser sends. | Correct |
| 2026-09-17 | VW-08 | **Nesting groups of conditions.** Without this one could not say "it is done and also urgent or requested by such a person": a single list joined by "and" or by "or" forces choosing one of the two for everything. The filter stopped being a list and became the tree that the contract already stored; each condition is named **by where it is** —which place it occupies in its group, and that one in its own—, because what is stored carries no identifiers. **How far one can nest** is not a number chosen here: it is the three levels the contract admits counting the condition, so the top one opens groups and those no longer do. A group is born joining with "or", which is exactly what the outer "and" does not give. The depth computation moved to `shared`, so the screen does not have a three written that the server could change. Checked against PostgreSQL: `Status is done` **and** (`Priority is high` **or** `Priority is low`) was saved as a group inside another, and the rows went from 1 to 2 when adding the second condition inside the group —with the two joined by "and" they would have been 0—. | Correct |
| 2026-09-17 | VW-14 | **Charts.** A chart **is a drawn grouping**, and that is why it came in like any other view class —a value in the enum, a definition and a registered component— and not as a separate piece: it groups the way a board groups, so the property it groups by **is** its axis and there are not two ways of distributing the same rows living together on the screen. Two boxes come for free from that: it respects the view's filter —the rows the filter let through reach it, already distributed— and it is rebuilt when the data changes, like everything else. **What each group measures** is counting rows, summing or averaging; summing and averaging are only offered when the collection stores a number, because summing statuses means nothing. The arithmetic was not written again: it is the same one a column does at the foot of a table, looked at per group. **It is drawn without bringing in any library**: bars with boxes —which can be read with a magnifier, selected and translated— and line and pie in SVG, with the count separated from the drawing and tested apart. **Color is not decoration: it is the data**, so each bar and each slice carries the color of the option it represents, and in dark mode each tone lightens. The pie always goes with its list of numbers beside it, because from an arc one cannot read how much it is worth and because that way it says something also to whoever does not distinguish colors. Checked against PostgreSQL: counting rows it gave `todo 2` and `done 2`; with `Priority is high` set it dropped to 1 and 1; changing a row to `done` left it at `todo 1` and `done 3`; and summing an hours property it gave `done 16` (5+3+8). **Defect found when testing the last box and fixed:** when inserting a collection into another page only the page was chosen, so the main view always came in —a chart could not be inserted unless it was the one that opens the collection—; now, with more than one view, it asks which. **And a defect that this uncovered:** collections drawn inside a page were stored by the page's identifier, so two blocks of the same collection with different views showed the same thing; now they are stored by page and view, and in the same page its table and its chart coexist. **Environment, the usual trap with a new twist:** the running backend had the previous enum in memory and rejected the `CHART` class with 400; the stack had to be restarted **after** generating the Prisma client, not before. | Correct |
| 2026-09-17 | VW-01, VW-02, VW-05, VW-07 | **Boxes withdrawn by a scope review, at El-Vitas's request.** He asked why a cover was being asked for on the cards, and the answer was written: `../current-scope.md` says that page covers **were built and withdrawn on 2026-08-18** and are not part of the scope, so asking for them on a board's or a gallery's cards brought them back through the window. The two boxes are out; the size of the cards stays, which belongs to the view and needs no new piece. **The timeline** leaves this pass: `../future-scope.md` declares it future and `../current-scope.md` says that neither it nor the calendar enter the current round —the calendar was brought forward because the date already existed and grouped—; its boxes will be written when it is opened as its own work. **"A table with many rows scrolls without getting slow"** was said twice: it is `RE-01` and `RE-02` of `13-performance-and-limits.md`, written there with their protocol of seeding five thousand rows. A box verified in two documents is checked off in one and forgotten in the other. | Correct |
| 2026-09-17 | VW-08 | **How the filter looks, redone after El-Vitas saw it.** What was said was that it was ugly, and looking at it in the browser one could see why: "Matching all" hung at the very top, far from the conditions it joined; a condition's fields did not fall under those of the previous one, because the nested group shifted them; each line ended in a lit red cross; and "Remove all", also in red, took a strip of its own. Now **each line begins with how it is joined to the one above** —"Where" the first, the "and/or" selector the second, and from there down that same word repeated without being touchable, because a group is joined in only one way— and continues with property, comparison and value, **always the same width**, so that the filter reads like a sentence from top to bottom. The value's slot stays occupied when the operator asks for none, so that the neighboring line does not shift its fields. Removing stopped shouting: gray, and red only when pointed at; the group's one is said in words and not with another cross, which in that same column would read as removing a condition. **Measured in the browser:** the panel was widened to 46rem because at 36 each condition split into two lines, and the nested group overflowed eleven pixels for being unable to shrink. At 390 px wide it does not overflow and the condition stacks into three lines. | Correct |
