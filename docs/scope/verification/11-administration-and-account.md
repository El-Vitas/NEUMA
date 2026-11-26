# 11 · Administration and account

Who enters the organization, with what permissions, and what each person controls over their own account.

> Read this folder's `README.md` before using this document. Space and page permissions are reviewed in `06-collaboration-and-permissions.md`; this one reviews the organization level.

## How it is built today

There are accounts with three roles (administers, writes, reads), a screen to
manage them, and each person can change their name and their password.

There are **no** groups, no email invitations, and no audit log: they do not
exist in the database schema. Those parts of the document describe a product to
be built.

What does exist does not count as verified: it is written here to know where to
start testing, not to skip the test.

---

## AD-01 · It must allow bringing people into the organization

- [ ] Someone can be invited by email
- [ ] Several people can be invited at once
- [ ] The status of each invitation is visible: sent, accepted, expired
- [ ] An invitation can be resent
- [ ] A pending invitation can be canceled
- [ ] One can invite while already indicating which spaces they enter
- [ ] Whoever accepts lands on a screen that explains where they are

## AD-02 · It must allow managing members

- [ ] The list of the organization's members is visible
- [ ] Each one's role is visible
- [ ] The list can be searched and filtered
- [ ] A person's role can be changed
- [ ] A person can be deactivated without deleting what they wrote
- [ ] When deactivated, they lose access immediately
- [ ] They can be reactivated
- [ ] The last time each person signed in is visible

## AD-03 · It must allow grouping people

- [ ] Groups of people can be created
- [ ] A whole group can be given access to a space
- [ ] Adding someone to the group gives them access without touching each space
- [ ] It shows which spaces each group reaches
- [ ] A group can be deleted and it explains who loses access

## AD-04 · It must allow configuring the organization

- [ ] The organization's name can be changed
- [ ] A logo can be set
- [ ] The default language can be defined
- [ ] One can define whether new pages are born private or visible
- [ ] Who can create spaces can be restricted
- [ ] Who can invite people can be restricted
- [ ] Who can publish pages outward can be restricted

## AD-05 · It must leave a trail of what happens

- [ ] There is a log of administrative events
- [ ] It records sign-ins, invitations, role changes and removals
- [ ] It records changes to space permissions
- [ ] It records outward publications and bulk exports
- [ ] Each entry indicates who, what and when
- [ ] It can be filtered by person and by date
- [ ] Only whoever administers sees it
- [ ] It cannot be edited or deleted from the interface

## AD-06 · It must allow taking the organization's data out

- [ ] Whoever administers can export the whole organization
- [ ] A notice appears when the export is ready
- [ ] The export is recorded in the event log

---

## CU-01 · It must allow managing one's own profile

- [ ] The display name can be changed
- [ ] A photo or avatar can be set
- [ ] The email can be changed, with confirmation
- [ ] Changes are reflected immediately wherever the person appears
- [ ] It shows which organization and spaces one belongs to

## CU-02 · It must allow looking after one's own access

- [ ] The password can be changed
- [ ] Changing it requires the current password
- [ ] Weak passwords are rejected, explaining why
- [ ] There is password recovery by email
- [ ] Active sessions are visible
- [ ] A specific session can be closed
- [ ] All sessions can be closed at once
- [ ] One can sign out from any screen

## CU-03 · It must allow adjusting one's own preferences

- [ ] The language can be chosen
- [ ] The light or dark theme can be chosen
- [ ] The time zone can be chosen
- [ ] The date format can be chosen
- [ ] Preferences are remembered across devices

## CU-04 · It must allow controlling notifications

- [ ] One can choose which notifications are received inside the application
- [ ] One can choose which notifications arrive by email
- [ ] A space's notifications can be muted
- [ ] A page's notifications can be muted
- [ ] Everything can be turned off at once

---

## Log

| Date | Block | What was missing | Status |
|---|---|---|---|
| | | | |
