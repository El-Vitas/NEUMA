# 12 · Automation and integrations

Having the product do the repetitive work, and having the brain connect with what is already used outside.

> Read this folder's `README.md` before using this document.

## How it is built today

**The button block** exists, which writes a row where it is told to. Nothing
else: there are no triggers, no recurrence, no reminders, no integrations, and
no AI. There are no scheduled tasks of any kind in the product, which is the
foundation that almost this entire document needs.

Except for the button, this document describes a product to be built, not a
product to be verified.

---

## AU-01 · It must allow reacting to a collection's changes

- [ ] An action can be defined that happens when a property changes
- [ ] An action can be defined that happens when a row is added
- [ ] The action can change another property's value
- [ ] The action can notify a person
- [ ] The action can create a page
- [ ] Several actions can be chained
- [ ] The list of the collection's automations is visible
- [ ] One can be turned off without deleting it
- [ ] It shows when it last ran
- [ ] A failure is reported instead of staying silent
- [ ] An automation cannot trigger itself in a loop

## AU-02 · It must allow triggering actions by hand

- [ ] A button that runs actions can be inserted
- [ ] The button can create a page from a template
- [ ] The button can add a row to a collection
- [ ] The button can change the current page's properties
- [ ] It visually confirms that it ran
- [ ] Its configuration can be edited afterwards

## AU-03 · It must allow recurring tasks

- [ ] One can define that a row is created every so often
- [ ] The frequency can be chosen: daily, weekly, monthly
- [ ] The created row starts from a template
- [ ] The new row's dates are adjusted to the corresponding period
- [ ] The repetition can be paused and resumed
- [ ] It shows when the next one will be created

## AU-04 · It must remind about what has a date

- [ ] A reminder can be set on a date
- [ ] One chooses how far in advance it notifies
- [ ] The notice arrives inside the application
- [ ] The notice can arrive by email
- [ ] It can be snoozed
- [ ] The reminder can be removed without deleting the date
- [ ] A row with an overdue date is visually distinguished

---

## IT-01 · It must display links from the tools in use well

- [ ] Pasting a repository link shows a card with its information
- [ ] Pasting a design link shows a preview
- [ ] Pasting an unknown link shows at least the site's title and icon
- [ ] A preview that cannot be obtained degrades to a plain link, without error

## IT-02 · It must allow other systems to write here

- [ ] There is a way to create pages from outside the product
- [ ] An external system can be authenticated without using a person's account
- [ ] That access can be revoked
- [ ] It shows which external systems have access and what they did
- [ ] An external system respects the same permissions as a person

## IT-03 · It must allow notifying outward

- [ ] An external system can be notified when something changes
- [ ] One chooses which events are sent
- [ ] The result of the latest deliveries is visible
- [ ] A failed delivery is retried and reported

## IT-04 · It must allow capturing content from the browser

- [ ] A web page can be saved as a page in the brain
- [ ] One chooses which space it goes into
- [ ] The source link is kept
- [ ] A note can be added when saving it

---

## IA-01 · It must allow asking the content questions

- [ ] A question can be asked and answered based on one's own pages
- [ ] The answer cites the pages it came from
- [ ] It only uses content one has access to
- [ ] It says when it found no information instead of making it up

## IA-02 · It must allow getting help while writing

- [ ] A summary of the page can be requested
- [ ] Translating selected text can be requested
- [ ] Improving the wording of a selection can be requested
- [ ] Continuing to write from the cursor can be requested
- [ ] What is generated can be accepted, discarded or requested again
- [ ] What is generated never replaces text without confirmation
- [ ] What is generated is distinguished from what a person wrote

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
