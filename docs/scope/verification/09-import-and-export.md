# 09 · Import and export

Content must be able to leave the product and come back in without getting trapped.

> Read this folder's `README.md` before using this document.

---

## IO-01 · It must allow exporting a page to Markdown

**How to test it:** export a page with headings, lists, a table, an image and a mention.

- [x] There is an export option in the page's menu
- [x] A `.md` file is downloaded when the page has no attachments, and an archive when it does
- [x] Headings come out as `#`, `##`, `###`
- [x] Bulleted and numbered lists keep their nesting
- [x] Tasks come out as `- [ ]` and `- [x]` according to their state
- [x] Quotes come out as `>`
- [x] Code blocks keep the language in the opening marker
- [x] Tables come out as a Markdown table
- [x] Bold, italic, code and strikethrough are kept
- [x] Links keep text and destination
- [x] Mentions of other pages come out as a link with the title
- [x] Images come out referenced and the file is included
- [x] Diagrams come out as a code block with their language
- [ ] The page's properties come out at the start of the file
- [x] The file is named after the page
- [ ] An exported file imported again produces the same page — there is no import yet

> What Markdown cannot express comes out as a `:::type{data}` fence or as a link
> with its own destination, and a block the schema does not know is kept
> instead of being lost. Checked in the browser on 2026-08-21.

## IO-02 · It must allow exporting several pages at once

> **One file per page.** Several pages come out in an archive whose folders are
> the hierarchy they had. A collection always comes out archived, because each
> row is a page. Recorded in `docs/business-rules/` (FEA-PAG).

- [x] A page can be exported **with all its subpages**
- [x] A whole space can be exported
- [x] Several loose pages can be selected and exported together
- [x] An archive is downloaded with one file per page
- [x] The archive's folders reflect the hierarchy the pages had
- [ ] A collection is exported archived, with one file per row — it comes out archived because it is several pages, but there is no export action from the collection
- [x] Links between the exported pages point to the exported files, not to the web
- [x] Attached files are included in the archive
- [ ] One chooses whether attachments are included or only the text — today attachments always go
- [ ] A large export does not block the interface: it notifies when it is ready — needs background tasks, which do not exist
- [ ] Progress is shown while it is prepared — needs background tasks, which do not exist
- [x] Only what one has permission to see is exported

> Checked on 2026-08-22 against the API: a page responds `text/markdown`;
> a branch and a space respond `application/zip`. The Engineering space came
> out with 84 files in 10 folders, up to three levels deep, with correct
> integrity according to `unzip -t`. A parent page ends up both as a file and
> as a folder of its children. Nine sibling pages with the same name each get a
> number instead of overwriting each other. A name with an accent arrives with
> its accent.

> Checked on 2026-08-22 in the browser: selection mode has an export button,
> inactive while nothing is checked. With two pages from different branches
> checked, `seleccion.zip` was downloaded with those two and the `assets`
> folder with their images. Inside, the images point to `assets/…` by relative
> path, a link to a page that also traveled points to its file, and one to a
> page that was left out was left as it was. A file block keeps its identifier
> and adds the path to the file in the archive.

## IO-03 · It must allow exporting to other formats

- [ ] It can be exported to PDF
- [ ] It can be exported to HTML
- [ ] The PDF keeps headings, lists, tables and images
- [ ] The PDF does not cut tables or diagrams in half
- [ ] The page size and scale can be chosen
- [ ] It can be exported to PDF including subpages

## IO-04 · It must allow exporting a collection as data

- [ ] A collection can be exported to CSV
- [ ] Each property comes out as a column
- [ ] What the current view shows is exported, respecting filters and sorting
- [ ] One can choose to export all the rows instead of the filtered view
- [ ] Dates come out in a format a spreadsheet recognizes
- [ ] Multiple selections come out separated in a readable way
- [ ] Accents and the ñ read correctly when opening the file

## IO-05 · It must allow copying as Markdown

- [ ] A page can be copied as Markdown to the clipboard
- [ ] A selection of several blocks can be copied as Markdown
- [ ] What is copied pastes correctly into a plain text editor
- [ ] What is copied pastes correctly into another page of the app

## IO-06 · It must allow printing

- [ ] The page prints legibly from the browser
- [ ] The side tree and the buttons are not printed
- [ ] Collapsed blocks are printed open
- [ ] Wide tables fit the paper

## IO-07 · It must allow importing Markdown

- [ ] A `.md` file can be imported and it becomes a page
- [ ] Headings, lists, tasks, quotes, code and tables are converted into real blocks
- [ ] Inline formatting is kept
- [ ] Several files can be imported at once
- [ ] A folder with subfolders keeps its hierarchy as nested pages
- [ ] One chooses in which space and under which page the imported content goes
- [ ] Links between the imported files end up linking the created pages

## IO-08 · It must allow importing data into a collection

- [ ] A CSV can be imported as a new collection
- [ ] A CSV can be imported into an existing collection
- [ ] A preview is shown before confirming
- [ ] One chooses which property each column corresponds to
- [ ] The type of each column is detected automatically and can be corrected
- [ ] One can choose which column is the title
- [ ] Rows with errors are reported without aborting the whole import

## IO-09 · It must allow bringing in content from other tools

- [ ] The export of another documentation tool can be imported
- [ ] The page hierarchy is kept
- [ ] That tool's databases arrive as collections
- [ ] HTML can be imported
- [ ] A Word document can be imported
- [ ] Referenced images are uploaded and left linked

## IO-10 · It must report what happened when importing

- [ ] Progress is visible while it imports
- [ ] When finished, it says how many pages were created
- [ ] The files that failed are listed, and why
- [ ] What was imported can be opened directly
- [ ] A failed import does not leave half-created pages

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
