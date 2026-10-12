---
title: Collections and views
summary: How to make a collection, what each property can hold, and the six ways to look at the same rows.
order: 4
---

A collection is a page that also keeps a shape: typed properties, and views over its rows. Each
row is a full page, so it opens, moves, links and goes to the trash like any other.

Almost everything below follows from that. A board keeps no cards of its own, only a way of
looking at rows that already existed.

## Making a collection

Type `/` and choose **Collection**. It is born with one property and one table view, and
everything is changed from there. **Collection from elsewhere** shows here one that already
lives on another page; if it has several views, you are asked which one goes in this spot.

The **Configure the collection** button, next to the view tabs, is where properties and views
are changed. What is touched there is saved when you confirm, not before.

## Properties

Eight types, and the type decides what can be answered and what can be done with it afterwards.

| Type | What it holds |
|---|---|
| Title | The row's name, which is its page's title. It always goes first and cannot be removed |
| Text | Whatever is written |
| Number | A figure. It is the only thing a chart can add up or average |
| Select | One option from a list, with its colour |
| Multi-select | Several options from that list |
| Person | Somebody in the space |
| Date | A day |
| Checkbox | Checked or unchecked |

Changing a property's type does not erase what the rows already answered. Whatever does not fit
the new type has to be answered again.

A select declares its options and each option's colour in the settings. That colour belongs to
the option and not to the view, so the same label looks the same in the table, on the board's
cards and in a chart's bars.

## The six views

All of them look at the same rows. Changing view changes no data.

| View | What it is for |
|---|---|
| Table | Comparing rows field by field, and answering a cell where it stands |
| Board | Moving work from one state to another by dragging |
| List | Reading one after another, with what they hold on a line underneath |
| Gallery | Large cards, for when the point is to browse |
| Calendar | Putting each row on the day it says |
| Chart | Counting, adding up or averaging by group |

A view is added from the settings, renamed, duplicated with everything it has set, and changed
to another kind without losing what the new kind understands. Each one carries its emoji so it
can be told apart in the tab.

### Board

It groups by a property, and each value is a column. Dragging a card to another column writes
that property on the row; Alt with the arrows does the same without a mouse.

From the column itself an option is added, renamed, painted and removed. Renaming it also
rewrites the rows that said the old name. Removing it says how many rows it leaves without a
value, and those rows are not deleted. They lose that one value and fall into «Unassigned».

With a second grouping set, the board is crossed into bands and each band repeats the same
columns. Dropping a card on a crossing writes both properties at once.

### Calendar

It puts each row on the day of whichever date you choose, since a collection may keep several.
Dragging an entry to another day writes that date on it, and Alt with the arrows moves it a day
sideways or a week up and down. What has no date is said at the foot, so it does not look
deleted.

### Chart

It draws the same groups a board would, so the property it groups by is its axis. You choose
how it is drawn — bars, line or pie — and what it measures of each group: how many rows there
are, or the sum or average of a number property. With no number property at all, counting rows
is the only thing on offer.

## Filtering, sorting and searching

Above the rows sit two buttons that say how many conditions they carry without being opened.

**Filter** builds a sentence from top to bottom. Each line says how it joins the one above —
«and» or «or» — which property it looks at, how it compares it and against what. The operators
offered are the ones that type admits, and a date does not «contain» anything.

| Type | What it can ask |
|---|---|
| Title and Text | is, is not, contains, does not contain |
| Number | is, is not, is greater than, is less than |
| Date | is, is before, is after |
| Select and Person | is, is not |
| Multi-select | contains, does not contain |
| Checkbox | is |

On top of those come **is empty** and **has a value**, which every type offers and which ask
nothing in return. The value field disappears when you choose them.

**Add a group** opens a bracket inside the sentence, which is the only way to say «this, and
also one of these others». A group is born joining with «or».

**Sort** chains properties. The first one rules and the next breaks its ties, and each goes
from high to low or the other way round.

The **search** above the rows searches what is already on screen, so it respects the filter in
place. It looks at the name and at whatever is answered by writing, not at dates or numbers,
and it compares without accents or capitals. What you searched for is not saved, because it
belongs to that moment.

Everything else is saved on the view, not on whoever is looking. Two people see the same filter.

## Grouping and calculating

Grouping is not the board's alone. The table, the list and the gallery also cut their rows into
groups, with a band that says what the group is and how many rows it carries. Folding a group
is saved on the view.

When the grouping is by a date, the bucket decides how much fits in each group: one group per
day, per week or per month. Without a bucket, a year of work would be three hundred groups of
one row.

At the foot of each table column you choose what it says about all its rows together.

| Calculation | Over what |
|---|---|
| Rows, Filled, Empty | Any property |
| Sum, Average, Minimum, Maximum, Median | Numbers |
| Checked | Checkboxes, as a percentage |

It counts over the rows the filter let through, and with the table grouped each group shows its
own count.

## Working on many rows at once

The box beside the name marks rows. The one in the header marks everything on screen, which is
what the filter let through and not what the collection keeps.

With something marked, a bar appears offering to answer one property on all of them, duplicate
them or delete them. Deleting sends them to the trash without asking, because all of it is
undone from the notice that appears afterwards.

## How the table looks

The control above the table decides the row height — short, medium or tall — and whether long
text wraps onto several lines or is cut off. Asking it to wrap raises the height when it was at
the shortest, because wrapping without letting the row grow would leave the extra lines out of
sight.

Each column's menu is where you choose which side its contents hug, and how many columns stay
put when scrolling sideways. The width is dragged from the column's right edge, or adjusted
with Alt and the arrows.

All of this belongs to the view. Two views of the same rows can look different.
