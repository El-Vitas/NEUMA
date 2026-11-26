# 017: Defer by 30 days the permanent deletion of pages in the trash

**Status:** Accepted
**Date:** 2026-10-19

## Context

Emptying the trash deleted, in a single call, all the trashed pages in the user's spaces, along with their history and attachments, with no record of who requested it. Any role other than CLIENT could do it. The security review of October 18, 2026 flagged it as high risk: it is the operation in the app that destroys the most data and the only one with no way back.

Backups make it possible to go back to a specific minute, but restoring an entire database to recover one page affects everything else.

## Alternatives Considered

- **Keep immediate deletion and rely on backups.** PRO: nothing changes. CON: recovering a page requires restoring the database on a separate instance and copying by hand; deletion still leaves no trace.
- **Ask for confirmation by typing the space name.** PRO: it stops the accidental click. CON: it does not stop a wrong decision or a stolen token, and it still deletes on the spot.
- **Deferred deletion, administrators only, with a record.** PRO: a mistake is fixed by restoring from the trash within 30 days; the record outlives the page. CON: the space and the attachments take 30 days to be freed.

## Decision

Deleting forever, a page or the entire trash, marks the page with `purgeAfter` at 30 days and writes a row in `PagePurge` with who requested it. The page stays in the trash and is restored like any other; restoring it cancels the deletion. A process in the HTTP server runs every hour, under a Postgres lock, deletes what has expired and only then deletes the attached files. Only an administrator can request the deletion.

## Consequences

- Positive: a mistaken deletion can be undone for 30 days without touching the backups, and `PagePurge` says who requested each deletion and how it ended.
- Negative: attachments take up disk for 30 more days. A worker can no longer empty the trash. If the HTTP server is not running, nothing is purged until it comes back.

## Governance

The trash integration tests verify that emptying does not delete, that the purge respects the deadline, that restoring cancels it and that only an administrator can request it. The business rule lives in FEA-PAG.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-19
