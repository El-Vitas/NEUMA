# 08 · Agents and user experience

What makes the brain operable by a machine, and makes using it pleasant.

> Read this folder's `README.md` before using this document.

## How it is built today

There is an MCP server with tools over pages, spaces and search, and it
respects the same permissions as the screen. There is dark mode and keyboard
shortcuts.

None of that counts as verified: it is written here to know where to start
testing, not to skip the test.

---

## AG-01 · It must allow an agent to read the content

- [ ] An agent can list the spaces it has access to
- [ ] It can read a page by its identifier
- [ ] It can search by text
- [ ] It can walk the page tree
- [ ] It can follow the connections between pages
- [ ] It can read the properties and rows of a collection
- [ ] It only accesses what its identity is allowed to
- [ ] A page without access does not reveal even its title
- [ ] Errors explain what happened, they do not return an empty response

## AG-02 · It must allow an agent to write

- [ ] It can create a page in a space
- [ ] It can edit the content of an existing page
- [ ] It can edit a specific block without rewriting the whole page
- [ ] It can append content at the end without touching what came before
- [ ] It can create a row in a collection with its properties
- [ ] It can update a row's properties
- [ ] It can move a page
- [ ] It can mention another page from the content it writes
- [ ] What it writes is recorded as done by that agent
- [ ] Invalid content is rejected with the reason, it is not half-saved
- [ ] Its changes appear live for whoever has the page open
- [ ] It cannot write where its identity has no permission

## AG-03 · It must allow citing content precisely

- [ ] An agent can refer to a specific block
- [ ] That reference keeps pointing to the same block after the page is edited
- [ ] That reference can be opened in the interface and leads to the block
- [ ] A reference to a deleted block is reported as such, it does not fail silently

---

## UX-01 · It must look good in light and dark

- [ ] Dark mode exists
- [ ] One can choose light, dark or follow the system
- [ ] The preference is remembered across sessions
- [ ] There is no flash of the wrong theme on load
- [ ] All text reads with enough contrast in both modes
- [ ] The colors of tags, highlights and diagrams remain distinguishable in dark

## UX-02 · It must work with the keyboard

- [ ] There is a screen that lists the available shortcuts
- [ ] The interface can be navigated with Tab in a logical order
- [ ] The focused element is visible
- [ ] Escape closes any open menu or panel
- [ ] Shortcuts do not clash with the browser's
- [ ] A screen reader can traverse the page

## UX-03 · It must work on a narrow screen

- [ ] The side tree becomes a dropdown menu
- [ ] One can write comfortably on mobile
- [ ] Tables, collections and diagrams scroll without breaking the page's width
- [ ] Buttons are large enough for a finger
- [ ] No dialog ends up cut off outside the screen

## UX-04 · It must explain what to do when there is nothing

- [ ] A space without pages explains how to create the first one
- [ ] A collection without rows explains how to add one
- [ ] A search without results suggests what to try
- [ ] A list emptied by a filter says so, instead of looking truly empty

## UX-05 · It must behave well while loading and when it fails

- [ ] When navigating, a loading skeleton is shown, not a blank screen
- [ ] Loading does not make the content jump when it finishes
- [ ] An error shows what happened and offers to retry
- [ ] An error in one section does not break the whole page
- [ ] A raw technical identifier never appears as an error message

## UX-06 · It must be in Spanish and English

- [ ] The language can be changed
- [ ] The choice is remembered
- [ ] No untranslated text is left in either
- [ ] Dates and numbers follow the format of the chosen language

## UX-07 · It must tolerate a lack of connection

- [ ] An already-open page can still be read offline
- [ ] One can keep writing offline
- [ ] It is clearly indicated that there is no connection
- [ ] When the connection returns, the changes are sent on their own
- [ ] If there were conflicting changes they are resolved without losing text
- [ ] Reloading offline does not show a broken screen

## UX-08 · It must guide someone arriving for the first time

- [ ] The first time, it explains what a space is and what a page is
- [ ] It offers to create the first page with guidance
- [ ] The guide can be skipped
- [ ] It does not appear again once completed

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
