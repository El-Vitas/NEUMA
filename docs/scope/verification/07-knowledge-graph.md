# 07 · Knowledge graph

What turns a pile of pages into a brain: how they connect to each other.

> Read this folder's `README.md` before using this document. Templates are reviewed in `10-templates.md`.

## How it is built today

There are mentions between pages and backlinks, which are rebuilt on their own
when a page is renamed or goes to the trash. A mention of something the reader
cannot reach is covered up and does not give away the title.

There are no unlinked mentions and no visual graph.

None of that counts as verified: it is written here to know where to start
testing, not to skip the test.

---

## GR-01 · It must record the connections between pages

- [ ] Mentioning a page from another creates the connection
- [ ] Linking a page from the text also creates it
- [ ] Removing the mention undoes the connection
- [ ] The connection appears without having to reload or wait longer than necessary
- [ ] Moving or renaming a page does not break its connections
- [ ] Sending a page to the trash does not leave connections pointing to nothing

## GR-02 · It must show who points to this page

- [ ] The page shows a backlinks section
- [ ] Each backlink indicates the title of the source page
- [ ] A fragment of the context where the mention appears is visible
- [ ] Clicking navigates to the source page
- [ ] Only pages one has access to are listed
- [ ] The count shown matches what is actually listed
- [ ] With no backlinks, the section does not take up useless space
- [ ] With many backlinks they can be browsed without the page growing endlessly

## GR-03 · It must show unlinked mentions

- [ ] Pages that name this one without having linked it are detected
- [ ] They are listed apart from the real backlinks
- [ ] One of those mentions can be turned into a link with one click
- [ ] A suggestion can be dismissed so it does not appear again

## GR-04 · It must allow viewing the graph

- [ ] There is a visual view of pages and connections
- [ ] The graph can be centered on a page
- [ ] The depth of the connections shown can be adjusted
- [ ] Clicking a node opens that page
- [ ] It can be filtered by space
- [ ] A node can be searched within the graph
- [ ] With many pages it remains legible and does not freeze
- [ ] It reads well in dark mode

## GR-05 · It must suggest related content

- [ ] The page suggests other related ones
- [ ] It explains why each one is suggested
- [ ] The suggestions respect permissions
- [ ] They can be hidden if they add nothing

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
