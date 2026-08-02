# 004: Replace Vitest with bun test as the test runner

**Status:** Accepted

## Context

Both apps used Vitest 4 (backend: unit + integration against a real Postgres schema-per-run; web: jsdom + Testing Library + MSW). Moving onto the Bun runtime ([001]) and wanting faster tests made `bun test` — Bun's built-in Jest-compatible runner — the natural choice. The migration had to preserve all 349 tests (144 backend + 205 web) with no loss of coverage.

## Alternatives Considered

- **Keep Vitest, run it under Bun.** PRO: no test rewrite. CON: forgoes the speed win; keeps a heavy dependency; Vitest-on-Bun is itself not a well-trodden path.
- **Migrate to `bun test` (chosen).** PRO: ~4-5x faster (backend ~10s vs ~45s); no separate test framework dependency; `mock.module()`≈`vi.mock()`, `spyOn`, lifecycle hooks all supported. CON: real migration surface with several Bun-specific gotchas (below), and `bun test` lacks some Vitest features (positive `include` globs, a `testTimeout` config key, branch coverage).

## Decision

We will use **`bun test`** in both apps. Concrete adaptations, each verified empirically:

- **Discovery**: `bun test` only matches `.spec.`/`.test.`/`_spec_`/`_test_`; integration files were renamed `*.integration-spec.ts` → `*.integration.spec.ts`.
- **Globals**: `describe/it/expect` are auto-injected in test files, but `mock`/`spyOn` and any helper/preload file must import from `bun:test` explicitly. `bun-types` is not resolvable under strict pnpm, so specs import `{ describe, expect, it, ... }` from `'bun:test'` explicitly.
- **Module mocking**: `vi.mock` → `mock.module`; because it does not hoist like Vitest's, component specs use `mock.module(...)` followed by `await import(...)` of the module under test.
- **Web DOM**: jsdom → `happy-dom` via `@happy-dom/global-registrator` in a preload, registered with an explicit base URL (fixes `next/image` URL construction).
- **jest-dom removed**: its matchers (`toBeInTheDocument`, `toHaveAttribute`, `toHaveTextContent`, `toBeEmptyDOMElement`) were rewritten to native `bun:test` assertions. This was required because `@testing-library/jest-dom`'s `expect.extend()` in a preload does not survive Bun's `--isolate`. All 45 call sites were converted to equivalents — no coverage dropped.
- **Isolation split (web)**: `tests/unit` runs with `--isolate` (fresh realm per file — needed because sharing one realm caused cross-file DOM pollution); `tests/integration` runs without `--isolate` (one MSW `server.use()` spec depends on a shared module singleton that `--isolate` breaks).

## Consequences

- Positive: substantially faster test runs; no Vitest/@vitejs/plugin-react/jsdom/jest-dom dependencies.
- Negative: the web test command is a two-phase run (`bun test tests/unit --isolate && bun test tests/integration`) rather than a single invocation, reflecting the isolation split.
- Negative: DOM assertions are native `bun:test` (`.toBeDefined()`, `.toBeNull()`, `.getAttribute()`), slightly more verbose than jest-dom's semantic matchers; presence is still guarded by Testing Library's throwing `getBy*`.
- Negative: no branch coverage / HTML coverage reporter from `bun test` (text + lcov only).

## Governance

The gate runs `bun test` per app; 144 + 205 must stay green. New web specs must import from `bun:test`, place `mock.module()` before a dynamic import of the mocked module, and live under `tests/unit` or `tests/integration` (nothing else is discovered by the split command).

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
- Related: [001]
