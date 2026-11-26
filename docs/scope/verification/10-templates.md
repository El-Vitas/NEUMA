# 10 · Templates

Creating with structure from the very first moment, without building it by hand every time.

> Read this folder's `README.md` before using this document.

A template is any page saved to be repeated: its content, its properties, its icon and its subpages. It is not a separate type of object.

## How it is built today

**Nothing.** There are no templates in any form: not factory ones, not custom
ones, not row ones. This whole document describes a product to be built, not a
product to be verified.

It is left written because the design is already thought out —a template is a
page saved to be repeated, not a new object— and because
`04-pages-and-navigation.md` has a box (`PG-01`) that expects this.

---

## TP-01 · It must offer templates when creating a page

**How to test it:** create a new page and observe what is offered before writing anything.

- [ ] When creating a page, it offers to choose a template
- [ ] One can also start blank, with no extra steps or unnecessary clicks
- [ ] Templates are shown with icon, name and a line of description
- [ ] The content can be previewed before applying it
- [ ] When applied, the page ends up with its structure, its properties and its icon
- [ ] The cursor is left ready to write at the first useful place
- [ ] A template can also be chosen when creating a child page
- [ ] The choice can be undone immediately if it was a mistake

## TP-02 · It must come with useful factory templates

- [ ] Task
- [ ] Project
- [ ] Meeting minutes
- [ ] Technical document
- [ ] Team wiki
- [ ] Decision record
- [ ] Each one arrives with properties consistent with its purpose
- [ ] Each one arrives with views already configured when it is a collection
- [ ] Each one arrives with sample content that guides without getting in the way
- [ ] All of them are translated into Spanish and English
- [ ] They can be modified after being applied, without restrictions

## TP-03 · It must allow creating a template from scratch

- [ ] There is a visible place where templates are managed
- [ ] A new template can be created
- [ ] It is given a name, icon and description
- [ ] It is edited just like any page
- [ ] Properties are defined for it
- [ ] Content is added to its body
- [ ] It is saved and becomes available when creating pages

## TP-04 · It must allow converting an existing page into a template

- [ ] From a page's menu it can be saved as a template
- [ ] It asks whether subpages are included
- [ ] It asks whether the current property values are included or only their definition
- [ ] The original page is not modified
- [ ] The created template appears immediately in the list

## TP-05 · It must allow managing templates

- [ ] The list of available templates is visible
- [ ] An existing template can be edited
- [ ] It can be renamed
- [ ] Its icon and description can be changed
- [ ] It can be duplicated
- [ ] It can be deleted, with confirmation
- [ ] It shows who created it and when it was last modified
- [ ] The order in which they appear when creating a page can be rearranged
- [ ] A template can be hidden without deleting it

## TP-06 · It must allow finding the right template

- [ ] Templates can be searched by typing
- [ ] They are grouped by category, not in a flat list
- [ ] Recently used ones appear first
- [ ] It shows how many times each one has been used
- [ ] With no templates yet, it explains how to create the first one

## TP-07 · It must define how far each template reaches

- [ ] A template can belong to a space
- [ ] A template can be available across the whole organization
- [ ] When creating a page, only the templates reachable from there are offered
- [ ] The scope can be changed after it is created
- [ ] Whoever lacks permission cannot edit or delete other people's templates

## TP-08 · It must allow row templates inside a collection

- [ ] A collection can have its own row templates
- [ ] When creating a row, one can choose among them
- [ ] The template brings the properties already filled in
- [ ] The template brings content in the body, not only properties
- [ ] Several different templates can exist in the same collection
- [ ] They are edited from the collection itself, without going to another screen

## TP-09 · It must allow a default template

- [ ] One can set which template a collection's new rows use
- [ ] With a default one, creating a row applies it without asking
- [ ] Another template can still be chosen at the moment
- [ ] The default template can be removed and go back to blank rows

## TP-10 · It must resolve values that depend on the moment

- [ ] A template can include today's date, and it is resolved when applied
- [ ] It can include whoever applies it as the owner
- [ ] It can include the date in the title, resolved at creation
- [ ] These values stay fixed in the created page, they do not keep changing
- [ ] It is visible in the template that the value is dynamic

## TP-11 · It must reproduce the complete structure

- [ ] A template with subpages also creates those subpages
- [ ] A template with a collection inside creates it with its schema and its views
- [ ] The template's internal links point to the newly created pages, not to the template's
- [ ] The template's attachments are copied to the new page
- [ ] The nested hierarchy is respected in the side tree

## TP-12 · It must allow applying a template afterwards

- [ ] An empty page offers to apply a template
- [ ] On a page with content, it offers to add the template without erasing what was written
- [ ] It warns before overwriting properties that already have a value
- [ ] It can be undone with Ctrl+Z

## TP-13 · It must keep the template and what was created with it independent

- [ ] Editing the template does not alter pages already created
- [ ] Editing a created page does not alter the template
- [ ] Deleting the template does not affect the created pages
- [ ] One can see which template a page was born from

## TP-14 · It must allow repeating structure inside a page

- [ ] A button can be inserted that creates predefined content
- [ ] One configures which blocks it adds
- [ ] One configures where it adds them
- [ ] It can create a row in a collection instead of blocks
- [ ] When pressed, the content appears immediately
- [ ] The button's configuration can be edited afterwards

## TP-15 · It must allow starting a space with structure

- [ ] When creating a space, a space template can be chosen
- [ ] The template creates the initial pages and collections
- [ ] An existing space can be saved as a space template
- [ ] An empty space can also be created

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
