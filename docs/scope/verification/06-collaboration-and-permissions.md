# 06 · Collaboration and permissions

Several people working on the same thing, and controlling who sees what.

> Read this folder's `README.md` before using this document. Several blocks require two browsers or two different sessions to be tested.

## How it is built today

There is simultaneous editing over Yjs, comments on a block or on a fragment,
saved versions of each page, and space visibility in three forms: open to the
company, restricted to its members, and private to one person.

None of that counts as verified: it is written here to know where to start
testing, not to skip the test.

---

## CL-01 · It must let two people write at the same time

**How to test it:** open the same page in two tabs with different sessions.

- [ ] What one person writes appears in the other without reloading
- [ ] Writing in the same paragraph at the same time does not overwrite the other's text
- [ ] One's own cursor does not jump when the other person edits higher up
- [ ] Losing the connection is announced
- [ ] When the connection returns it reconciles without duplicating or losing text
- [ ] Joining late a page that has already been edited shows the full current state
- [ ] Closing one tab does not affect the other

## CL-02 · It must show who is on the page

- [ ] The avatars of the people viewing the page are visible
- [ ] The other person's cursor is visible while they type
- [ ] Each person has their own color
- [ ] Hovering over the other person's cursor shows whose it is
- [ ] The text the other person has selected is visible
- [ ] When someone leaves, their cursor disappears

## CL-03 · It must allow commenting on selected text

**How to test it:** select a phrase in the middle of a paragraph and comment on it.

- [ ] Selecting text offers to comment
- [ ] There is a keyboard shortcut to comment on the selection
- [ ] The commented text is highlighted in the body
- [ ] Clicking the highlighted text opens its comment
- [ ] Comments are shown at the side, without covering the content
- [ ] It shows who commented and when
- [ ] One can comment on a word, a phrase or several paragraphs
- [ ] One paragraph can have several comments on different parts
- [ ] Editing the text around it does not detach the comment
- [ ] If the commented text is deleted, the comment does not silently disappear: it stays accessible
- [ ] One can comment on an image, a table or a code block
- [ ] Comments survive moving the block within the page

## CL-04 · It must allow conversing in the comment

- [ ] A comment can be replied to
- [ ] Replies are shown as a thread, not as loose comments
- [ ] Someone can be mentioned inside a comment
- [ ] The mentioned person finds out
- [ ] The comment text can be formatted
- [ ] An image can be attached to a comment
- [ ] One's own comment can be edited
- [ ] One's own comment can be deleted
- [ ] Another person's comment cannot be edited
- [ ] An edited comment indicates it

## CL-05 · It must allow closing conversations

- [ ] A thread can be marked as resolved
- [ ] When resolved, the highlight disappears from the text
- [ ] Resolved ones can be viewed again
- [ ] A resolved thread can be reopened
- [ ] The count of open comments on the page is visible
- [ ] There is a panel with all the page's comments
- [ ] From that panel one jumps to the exact place in the text

## CL-06 · It must allow commenting on the whole page

- [ ] A general comment can be left, not anchored to a text
- [ ] It is shown at the top of the page or in its own panel
- [ ] It accepts replies just like anchored ones
- [ ] It is distinguished from anchored comments

## CL-07 · It must notify what matters to you

- [ ] There is an inbox of updates
- [ ] It notifies when you are mentioned
- [ ] It notifies when someone replies to your own comment
- [ ] It notifies when someone comments on a page you follow
- [ ] It notifies when a row is assigned to you
- [ ] It can be marked as read
- [ ] A page can be followed to learn about its changes
- [ ] It can be unfollowed
- [ ] An indicator is shown when there are unread updates

## CL-08 · It must keep the page's history

- [ ] The list of earlier versions can be viewed
- [ ] Each version indicates the date and who made it
- [ ] An earlier version can be opened and read
- [ ] What changed compared to the previous one is visible
- [ ] An earlier version can be restored
- [ ] Restoring does not erase the history: it remains as one more version
- [ ] The history does not grow in a way that clutters the list with every keystroke

## CL-09 · It must show recent activity

- [ ] On the page, who last edited it and when is visible
- [ ] The space shows its recent activity
- [ ] The date is shown in a readable relative format ("2 hours ago")

## CL-10 · It must allow proposing changes without applying them

> This block is the tool: writing without what is written replacing anything.
> Who is required to use it and who has authority over what is proposed is
> reviewed in `14-change-review-and-approval.md`. Both describe the same
> mechanics from two sides and are built together: what cannot come out of
> here is two different ways of proposing a change.

- [ ] There is a suggestion mode
- [ ] What is written in that mode is shown as a proposal, not as final text
- [ ] It shows who proposed each change
- [ ] A suggestion can be accepted and it is merged into the text
- [ ] It can be rejected and the text stays as it was
- [ ] All of them can be accepted or rejected together
- [ ] A suggestion can be commented on

---

## PM-01 · It must allow controlling the space's visibility

- [ ] A space can be visible to the whole organization
- [ ] A space can be restricted to its members
- [ ] Visibility can be changed after it is created
- [ ] When restricting it, a warning says who will lose access
- [ ] A restricted space does not appear in the tree of someone who is not a member
- [ ] Its content does not appear in the searches of someone who is not a member

## PM-02 · It must allow managing the space's members

- [ ] A person can be added to the space
- [ ] They can be removed
- [ ] The list of members is visible with their role
- [ ] A member's role can be changed
- [ ] The person is found by typing, not in a long list
- [ ] Whoever lacks permission to manage does not see these actions

## PM-03 · It must distinguish what each role can do

- [ ] A read-only role can read but not edit
- [ ] Whoever can only read is not shown edit buttons
- [ ] There is a role that can comment but not edit
- [ ] Whoever administers can manage members and configuration
- [ ] Attempting an action without permission gives a clear message, not a generic error
- [ ] The role is reflected the same in the interface and in the server's response

## PM-04 · It must allow per-page permissions

- [ ] A page can have different permissions from its space
- [ ] A page can be shared with a specific person
- [ ] Child pages inherit the parent's permission
- [ ] Inheritance can be broken on a child page
- [ ] It is clearly visible when a page has its own permissions
- [ ] A restricted page does not appear in the searches of someone without access
- [ ] A mention of a page without access does not reveal its title

## PM-05 · It must allow external guests

- [ ] Someone outside the organization can be invited to a specific page
- [ ] The guest sees only that, nothing else
- [ ] The list of guests and what they have access to is visible
- [ ] Access can be revoked

## PM-06 · It must allow publishing

- [ ] A page can be published with a public link
- [ ] The link works without signing in
- [ ] One can choose whether child pages also become public
- [ ] It can be unpublished and the link stops working
- [ ] It is clearly visible when a page is published
- [ ] The public version does not expose comments or internal data
- [ ] The public version can be prevented from being copied or duplicated

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
