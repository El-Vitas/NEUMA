# 018: Revoke sessions with a per-user token version

**Status:** Accepted
**Date:** 2026-10-19

## Context

The refresh token lasted seven days and was stateless: signing out did nothing on the server, and changing the password did not invalidate the previous tokens either. A leaked password or a lost device left the session open for the whole week.

## Alternatives Considered

- **Store each refresh token and rotate it on every use.** PRO: revokes a specific device and detects reuse of a stolen token. CON: a new table with writes on every refresh, cleanup of expired tokens and a race case when two tabs refresh at the same time.
- **Per-user version inside the token.** PRO: one integer column and one comparison; the password change and the sign-out bump it in the same statement. CON: it cuts all devices at once; it does not revoke a single one.
- **Token blocklist.** PRO: revokes a specific token. CON: every revoked token has to be stored until it expires and checked on every refresh.

## Decision

`User.tokenVersion` starts at 0. Each refresh token carries the version it was issued with (`ver`) and the refresh only proceeds if it matches the account's. Signing out bumps the version with an atomic increment, and changing the password bumps it in the same statement that saves the new password. After the change, the portal signs in again with the new password so as not to lock out the person who changed it.

## Consequences

- Positive: signing out and changing the password cut off refresh on all devices; there is no new table or writes on every refresh.
- Negative: the access token already in circulation is valid until it expires, a few minutes. (The limitation of signing out on all devices was lifted on 2026-10-24, see below.)

## Governance

The session integration tests verify the 401 of the previous token after signing out and after changing the password. The business rule lives in FEA-AUT. If a single device needs to be revoked, this is replaced by the first alternative.

## Refresh token rotation (2026-10-24)

The first alternative discarded above became the decision for sign-out and refresh. The per-user version stays as a second brake. The ADR stays in this file because the problem does not change, this only completes the solution.

- **`RefreshSession` table.** Each refresh token is a row. The row's `id` is the token's `jti`. Each sign-in opens a family (`familyId`) and each refresh adds a row to that family. The `usedAt`, `replacedById` and `expiresAt` columns say whether the token was spent, who replaced it and when it expires.
- **Each refresh spends the presented token and issues a new one.** Spending is a single `UPDATE ... WHERE usedAt IS NULL AND expiresAt > now` statement inside the same transaction that inserts the successor. If two requests arrive with the same token, only one wins the row; the other waits for its commit and sees the token already spent.
- **Reuse.** A token spent more than 10 seconds ago that is presented again is treated as theft. Its whole family is deleted and the response is 401. The other devices have a different family and stay signed in.
- **10-second grace window.** The portal groups parallel refreshes from a single process, but two tabs or two requests that straddle the cookie change still send the old token. Within the window, and as long as the successor has not been spent, the old token gets the same successor again. The refresh token is signed with its row's `iat` and `exp`, so signing the same row twice gives the same string and there is no need to store the token. Past the window, or if the successor was already used, it is reuse.
- **Signing out** deletes the device's family. The access token carries the family (`sid`) to know which one; one that does not carry it is rejected as invalid.
- **Changing the password** bumps `tokenVersion` and deletes all of the account's rows, in the same transaction.
- **Cleanup.** `RefreshSessionRetentionScheduler` deletes the expired rows every six hours, with the same pattern as notification retention.
- **Deployment.** A refresh token without `jti` is rejected, so everyone signs in once on deployment. Accepting the old tokens would have left a seven-day window without theft detection.

Accepted cost. Each refresh writes two rows and signing out no longer cuts the other devices. A stolen refresh token being used before the legitimate one still goes undetected until the owner refreshes, and at that moment the family is cut.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-19
- Modified: 2026-10-24. Refresh token rotation with reuse detection per family and a grace window. Signing out no longer cuts the other devices.
