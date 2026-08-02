# 003: Replace bcrypt with Bun.password for password hashing

**Status:** Accepted

## Context

Password hashing used the native `bcrypt` npm package (in the auth adapter, the DB seed, and test fixtures). Native (node-gyp) addons do not run under the Bun runtime, so moving the backend onto Bun ([001]) forced a change to the hashing implementation. Existing user password hashes in the database are standard bcrypt `$2b$` Modular Crypt Format strings and must keep validating without a reset.

## Alternatives Considered

- **`bcryptjs` (pure-JS bcrypt).** PRO: pure JS so it runs on Bun and Node; drop-in API; truncates at 72 bytes exactly like the old native bcrypt, so it is byte-for-byte compatible with every existing hash. CON: adds a dependency; keeps the code runtime-portable but forgoes the native speed of Bun's built-in.
- **`Bun.password` with the bcrypt algorithm (chosen).** PRO: built into the runtime (no dependency), fast, and its `verify()` reads existing `$2b$` hashes — zero data migration. CON: Bun-only API (couples auth to the Bun runtime); and it SHA-512-prehashes passwords longer than 72 bytes before bcrypt, whereas the old native bcrypt silently truncated at 72 — so a pre-existing hash of a >72-byte password would not re-verify.

## Decision

We will use **`Bun.password.hash(pw, { algorithm: 'bcrypt', cost })`** and **`Bun.password.verify(plain, stored)`**. It was verified against a real pre-migration `$2b$12$` hash from the dev database: existing passwords log in unchanged. The Bun-only coupling is acceptable because the hash format is standard MCF and the swap back to `bcryptjs` (if we ever leave Bun) is a single-function change that keeps all stored hashes valid.

## Consequences

- Positive: one less native dependency; hashing runs natively on Bun; existing `$2b$` hashes validate with no migration.
- Negative: auth is now coupled to the Bun runtime (mitigated: trivially reversible to `bcryptjs`).
- Negative / known edge case: `PASSWORD_MAX_LENGTH` is 100, so a user who set a 73–100-byte password *before* the migration would fail to log in, because Bun prehashes >72 bytes while old bcrypt truncated. No such users exist in the current (seeded) database. If this becomes a concern the mitigation is either switching to `bcryptjs` (restores truncation semantics for full backward compat) or capping password length at 72 bytes going forward. Left as a documented risk, not fixed.

## Governance

Covered by auth integration tests and the login smoke test against a real stored hash. Any new hashing/verification must go through the auth `PasswordAdapter`, never call bcrypt/bcryptjs directly.

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
- Related: [001]
