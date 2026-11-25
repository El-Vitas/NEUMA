# 13 · Performance and limits

Being powerful without demanding a big machine. Everything here is checked by using the product, not by reading metrics.

> Read this folder's `README.md` before using this document.

## How it is built today

This document is not pruned: it is run. Nothing here depends on building a new
product — everything is measured over what already exists, and that is why it
can be started whenever wanted.

There is a prior measurement that serves as a reference: a tree of 600 expanded
pages gave 145 fps on average with a worst frame of 9 ms (`04-pages-and-navigation.md`,
log of 2026-08-19). The rest is unmeasured.

Testing this requires volume content: a collection with thousands of rows and a long page. Seeding that data is part of the verification.

---

## RE-01 · It must open a large collection without loading all of it

**How to test it:** open a collection with 5,000 rows.

- [ ] The view appears in under two seconds
- [ ] Not all the rows are requested from the server at once
- [ ] The visible rows are loaded first and the rest while scrolling
- [ ] Scrolling fast does not leave the table blank
- [ ] The browser's memory does not grow without stopping when going through all of it
- [ ] Going back and entering again does not reload everything from scratch

## RE-02 · It must scroll a long table smoothly

- [ ] Scrolling through thousands of rows feels continuous, without jumps
- [ ] Only the visible rows are drawn
- [ ] Pinned columns stay in place when scrolling
- [ ] The scrollbar's height reflects the real total
- [ ] It works the same with many columns

## RE-03 · It must filter and sort without freezing the interface

- [ ] Applying a filter over thousands of rows responds immediately
- [ ] Sorting by a column responds immediately
- [ ] The work does not happen in the browser by loading everything first
- [ ] While it computes, the interface keeps responding
- [ ] Adding a row does not re-sort the whole collection from scratch
- [ ] Changing a cell does not re-evaluate the filter on all the rows
- [ ] A malformed filter lets the rows through instead of leaving the table blank

## RE-04 · It must open a row without loading its neighbors

- [ ] Opening a row loads only that row
- [ ] Closing it frees what it loaded
- [ ] Opening many rows in a row does not accumulate memory indefinitely

## RE-05 · It must edit a long page without degrading

**How to test it:** open a page with several hundred blocks and write at the end.

- [ ] Writing feels equally fast at the start and at the end of the page
- [ ] Typing a key does not redraw the whole page
- [ ] Off-screen images are not loaded until they are approached
- [ ] Undo remains instant after a lot of work
- [ ] Keeping the page open for an hour does not increase memory consumption

## RE-06 · It must stay light with several people connected

- [ ] With five people on the same page, writing stays smooth
- [ ] An inactive person does not consume resources like an active one
- [ ] When the tab is closed, the server's resources are released
- [ ] A page open for a long time does not accumulate unlimited history

## RE-07 · It must load the application fast

- [ ] The first load shows something useful soon, not a blank screen
- [ ] Navigating between pages does not reload the whole application
- [ ] The side tree with hundreds of pages does not delay loading
- [ ] Heavy parts are loaded only when they are used

## RE-08 · It must consume little at rest

- [ ] With the application open and untouched, processor use is almost nil
- [ ] There are no repeated requests to the server without reason
- [ ] Background processes do not consume while there is no work
- [ ] Bringing up the full development environment fits comfortably on the machine

## RE-09 · It must announce its limits instead of breaking

- [ ] There is a known limit of blocks per page, and a warning when approaching it
- [ ] There is a size limit per file, reported before uploading
- [ ] Exceeding a limit gives a clear message, not a generic error
- [ ] A document near the limit remains editable
- [ ] Pasting huge content is rejected or trimmed with a warning, without freezing the editor

## RE-10 · It must tolerate content it does not understand

- [ ] A block of an unknown type does not break the page
- [ ] That block is shown as a placeholder and is kept when saving
- [ ] The saved content indicates which version it was written with
- [ ] A document from an earlier version opens and updates itself
- [ ] A format update does not force migrating everything at once

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
