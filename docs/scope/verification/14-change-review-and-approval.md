# 14 · Review and approval of changes

A document someone answers for must not be changeable without that person looking at it.

> Read this folder's `README.md` before using this document.
>
> This does not review **whether** a page is trustworthy —that is `PG-20` in
> `04-pages-and-navigation.md`— but what consequences being so has. Nor does it
> review the manual lock of `PG-18`, which is something else: a switch that
> closes the whole page. Comments on a block (`CL-03` to `CL-05`) and the
> version history (`CL-08`) are taken as existing and are used from here.

## What is sought

A verified page that also has assigned owners stops being just any document:
someone vouched for what it says. Changing it by hand, without that person
finding out, undoes in a second what the seal promised.

That is why such a page **is not edited, it is proposed to**. Anyone who can
write in it writes the same thing they always would, but what they type does
not replace the text: it stays as a proposal over the blocks they touched. The
owners look at it block by block and answer one of three things —approve it,
reject it, or request changes— and each of the three can carry a comment that
says why.

**The modality is that of a code review, not its screen.** What is borrowed is
the cycle: a proposed change, a visible before and after, someone who answers,
a comment attached to the exact spot, and nothing entering the document until
the answer arrived. What is **not** borrowed is its vocabulary or its
interface: here there are no branches, no merges, no three-way conflicts, and
whoever proposes a change in a paragraph should not have to learn any of those
words.

## How it is built today

**Nothing in this document exists.** What there is are the three loose pieces
that would make it possible:

- A page is marked as verified, with who and when, and with an optional expiry
  (`PG-20`, built).
- A page accepts **one** responsible person, stored and displayed, which today
  neither enables nor prevents anything (`PG-20`, built).
- A page is manually locked against writing (`PG-18`, built).
- There are comments on a block and on a fragment (`CL-03`, built but
  unverified).

The suggestion mode of `CL-10` is declared and **not built**. That block and
this one describe the same mechanics from two sides: `CL-10` is the tool
—writing without applying— and `14` is what forces it to appear and who has
authority over it. They are built together or the second has nothing to rest
on; what cannot happen is two different mechanisms for proposing changes
coming out.

The foundation of `RV-07` is also missing: there are no notices or scheduled
tasks in the product.

---

## RV-01 · It must reserve requesting verification to two people

> Requesting verification is not ticking a box: it is choosing who is asked.
> That is why few people can do it. If anyone could request it and name
> themselves approver, the seal would be signed by whoever wanted and would say
> nothing.

- [ ] Only two people can request a page's verification: whoever administers the space and whoever created the page
- [ ] Nobody else sees the action to request it
- [ ] Whoever requests it chooses who approves
- [ ] They can choose one person or several
- [ ] They can choose themselves
- [ ] Each person is found by typing, not in a long list
- [ ] It shows who requested the verification and who they asked
- [ ] Whoever requested it can change the list of approvers while the page remains protected
- [ ] Changing the list with open proposals does not throw them away: what they are missing to be applied is recalculated
- [ ] A person who leaves the space stops counting as an approver and the page says so
- [ ] Removing the last approver is warned about, because it unprotects the page
- [ ] The chosen approvers are the page's owners, and are shown as such without opening any menu
- [ ] Being an owner gives no extra permission over the page beyond approving

## RV-02 · It must protect the page that has a seal and an owner

- [ ] A page that is verified **and has owners** does not accept direct editing
- [ ] It shows why it cannot be written to, and is distinguished from the manual lock of `PG-18`
- [ ] A page that is verified **without** owners is edited normally
- [ ] A page with owners that is **not** verified is edited normally
- [ ] Removing the verification frees the page, and it warns before doing so
- [ ] Removing the last owner frees the page, and it warns before doing so
- [ ] An expired verification keeps the protection — an outdated document is the one that most needs to be looked at
- [ ] The protection does not prevent commenting
- [ ] The protection does not prevent reading, searching, exporting or linking
- [ ] An owner does not write directly either: they propose like everyone else
- [ ] Whoever administers the space does not write directly either
- [ ] Whoever created the page does not write directly either
- [ ] There is no way to bypass the protection without first removing the verification or the owners, and removing them is recorded

## RV-03 · It must turn what is written into a proposal

- [ ] Writing in a block of a protected page opens a proposal on that block
- [ ] The proposal says which block it touches, what it said before and what it would say after
- [ ] It shows who proposed it and when
- [ ] Writing several times in a row in the same block does not create several proposals
- [ ] A proposal can touch several blocks at once
- [ ] A title and a reason can be added before sending it
- [ ] It can be abandoned before sending it, and the document stays as it was
- [ ] While it is not sent, only whoever writes it sees it
- [ ] Once sent, whoever proposed it can still correct it; nobody else
- [ ] More than one proposal can be open on the same page

## RV-04 · It must reach everything that changes the page, not only the text

- [ ] Adding a new block is a proposal
- [ ] Deleting a block is a proposal
- [ ] Moving a block to another place is a proposal
- [ ] Changing the page's title is a proposal
- [ ] Changing a property's value is a proposal
- [ ] Attaching or removing a file is a proposal
- [ ] Sending the page to the trash goes through a proposal
- [ ] Moving the page to another place in the tree does **not** go through a proposal: it does not change what it says
- [ ] Changing the icon, the cover or the typography does **not** go through a proposal: it does not change what it says

## RV-05 · It must allow reviewing the proposal block by block

- [ ] The list of the page's open proposals is visible
- [ ] A proposal is opened and the before and after of each block is read
- [ ] The proposal can be approved
- [ ] It can be rejected
- [ ] Changes can be requested
- [ ] Any of the three answers accepts a comment that says why
- [ ] Requesting changes and rejecting require that comment; approving does not
- [ ] A specific block of the proposal can be commented on, not only the whole proposal
- [ ] That comment can be replied to and the thread continues
- [ ] It shows what each owner answered and when
- [ ] Whoever proposed can reply and resubmit without opening another proposal
- [ ] Resubmitting leaves the earlier answers in view, it does not erase them

## RV-06 · It must say clearly when it can be applied

- [ ] An approved proposal can be applied
- [ ] One with changes requested is not applied until they are resolved
- [ ] A rejected one is closed and not applied
- [ ] It shows what is missing for it to be applied, without having to deduce it
- [ ] Whoever proposed does not approve their own proposal
- [ ] The approvals of all the chosen owners are needed: those people were asked, not just any one of them
- [ ] It shows who has already answered and who is missing, by name
- [ ] If whoever proposed is one of the owners, their approval is neither counted nor awaited
- [ ] Applying it writes it to the page all at once, not block by block
- [ ] Applying it is left as a version in the page's history (`CL-08`)
- [ ] That version says which proposal it came from
- [ ] Applying it does not touch the verification: the seal and its date stay as they were

## RV-07 · It must handle the proposal that has gone stale

- [ ] If a block changed because of another proposal applied earlier, a notice is given
- [ ] A proposal that no longer fits is not applied silently
- [ ] It shows where the mismatch is, block by block
- [ ] The proposal can be redone on the current state without writing it all again
- [ ] Applying two proposals that touch different blocks does not force redoing either

## RV-08 · It must notify whoever has to act

- [ ] The owner is notified that a proposal is waiting for them
- [ ] Whoever proposed is notified of the decision, with the comment that accompanied it
- [ ] It shows how many proposals are waiting without entering the page
- [ ] A proposal that has gone a long time without an answer stands out
- [ ] Notices can be turned off without losing the list of pending items

## RV-09 · It must leave a trail of everything

- [ ] A rejected proposal is kept just like an applied one
- [ ] The page's proposal history is visible, with its status
- [ ] It shows who approved what and when
- [ ] The review's comments stay with the proposal
- [ ] A proposal cannot be deleted to cover the trail
- [ ] That history is visible even if the page stops being protected

## RV-10 · It must behave well with whoever only reads

- [ ] Whoever cannot write in the page sees nothing about proposals
- [ ] A protected page reads exactly like any other
- [ ] What is proposed and not applied is not read as if it were the page's content
- [ ] What is proposed and not applied does not appear in search as the page's content
- [ ] What is proposed and not applied does not travel in an export
- [ ] What the agent reads through MCP is the page, not its proposals
- [ ] A proposal does not show content to whoever has no access to the page

---

## What was decided, and what it brings with it

Four questions whose answer supports the boxes above, decided on
2026-09-10. What each one costs is also noted here, because none comes free.

They live here and not in `docs/business-rules/`: that registry says how the
product behaves, and an `active` rule about something that does not exist lies
to whoever consults it. `FEA-REV` is created and empty, waiting: the rules are
written when this is built, and they come from these four answers and from the
boxes above.

1. **Nobody bypasses the protection.** Not the owner, not whoever administers,
   not whoever created the page. This is what makes the seal mean something.
   **What it costs:** a page gets stuck if its owners are not around, and the
   only way out is removing its verification — which is recorded, and which is
   exactly what it should cost.
2. **Whoever requests the verification chooses the approvers, and all of them
   are needed.** Requesting it is a matter for two people: whoever administers
   the space or whoever created the page, and either of them can choose
   themselves. **What it costs:** choosing four people is committing to wait
   for all four for every comma; the remedy is not lowering the number but
   choosing fewer people when requesting it.
3. **Expiring does not free the page.** An outdated document is the one that
   most needs to be looked at. **What it costs:** a page can stay protected
   forever if nobody renews the seal.
4. **Applying a proposal does not renew the verification.** The seal and its
   date stay as they were. If someday `PG-20` invalidated the seal on editing
   —today it does not—, applying an approved proposal would be exactly the case
   where it should not invalidate it, because the owner has just looked at it.

---

## Log

| Date | Block | What was missing | Result |
|---|---|---|---|
| — | — | Document just written. No block measured. | — |
