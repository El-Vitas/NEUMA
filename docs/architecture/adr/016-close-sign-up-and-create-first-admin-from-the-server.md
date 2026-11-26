# 016: Close sign-up and create the first administrator from the server

**Status:** Accepted
**Date:** 2026-10-11

## Context

`POST /api/v1/users` was public: it came from the starter template, with two rules describing it (BR-012, "on sign-up, the user is created as CLIENT", and BR-013, "sign-up logs the user in"). A CLIENT can read `PUBLIC_INTERNAL` spaces. Verified on 2026-10-11 in development: an account created without a session listed the internal spaces and found their pages in search. In addition, the portal's "New user" admin dialog used that same public request, with no role and no token.

On a fresh installation there was also no way to become an administrator without editing the database by hand.

## Alternatives Considered

- **Open sign-up, and the first account becomes administrator.** PRO: no extra step is needed. CON: there is a race at deployment (whoever arrives first takes over the system) and internal knowledge remains open to anyone. Rejected.
- **Create the first administrator at startup, from environment variables.** PRO: it is automatic. CON: the password stays in the container environment and in the deployment configuration, and someone has to remember to remove it. Rejected.
- **Invitation-based sign-up.** PRO: it is the most complete way to add people. CON: it requires single-use links, their expiry and a new screen. Left for when it is needed.
- **Close sign-up and create the first administrator with a command on the server.** PRO: only whoever operates the server can do it, the door closes by itself once an administrator exists and the password is not stored anywhere. CON: it is a manual step on every new installation.

## Decision

- `POST /api/v1/users` requires a session and the permission to create users, which only ADMIN has. The role is always specified and the response is the created account, without a session.
- `bun run admin:create --email <email> --name <name>`, with the password through standard input, creates an ADMIN only if none exists. It uses the same validation and the same service as the API. If the input is a terminal, it refuses instead of echoing what is typed.
- The portal removes the sign-up view, which no longer had a route. The "New user" dialog sends the request with the administrator's session and lets them choose the role with radio buttons, starting with CLIENT.
- BR-012 and BR-013 are replaced by BR-6925d74 and BR-5198703.

## Consequences

- Positive: nobody gets in unless an administrator decides so; a fresh installation has a documented path for its first administrator.
- Negative: whoever operates the installation has to run a command the first time. If all administrators lose access, recovery is still editing the database.

## Governance

An endpoint that creates identities or grants access is not marked as public. The users integration tests verify the 401 without a session, the 403 without the permission, and that the command refuses when an administrator already exists.

## Notes

- Author: El-Vitas, with Claude
- Created: 2026-10-11
