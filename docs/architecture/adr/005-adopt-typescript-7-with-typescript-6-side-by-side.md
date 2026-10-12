# 005: Adopt TypeScript 7 for typecheck, with TypeScript 6 side-by-side for typescript-eslint

**Status:** Accepted

## Context

The monorepo typechecked with TypeScript 5.7 (`tsc --noEmit`) as part of the gate across backend, web and `packages/shared`. TypeScript 7.0 (the native Go compiler) reached GA on 2026-07-08 with ~10x faster type-checking. However, typescript-eslint's peer range is `>=4.8.4 <6.1.0` — it depends on the TypeScript stable programmatic API, which does not ship in TS 7.0 (it lands in 7.1). Bun's runtime transpiles TypeScript itself, so the TS version only affects the typecheck gate and type-aware linting, not execution.

## Alternatives Considered

- **Stay on TS 5.x.** PRO: nothing to do; everything compatible. CON: forgoes the ~10x faster typecheck.
- **Upgrade everything to TS 7 outright.** PRO: simplest mental model. CON: breaks typescript-eslint (unsupported peer), so type-aware linting across all three packages would fail.
- **TS 7 for typecheck + TS 6 aliased for typescript-eslint (chosen).** PRO: fast `tsc` while keeping type-aware ESLint working. CON: two TypeScript packages installed via npm aliases; a slightly unusual `package.json` that contributors must understand.

## Decision

We will install both compilers via npm aliases: the `typescript` dependency is aliased to `npm:@typescript/typescript6@^6` (what `typescript-eslint`'s `require('typescript')` resolves), and a separate `typescript-7` dependency is `npm:typescript@^7`. Verified there is **no binary collision**: the TS6 package renames its own binary to `tsc6`, leaving the plain `tsc` binary resolving to TS7 — so the existing `typecheck` scripts (`tsc --noEmit`) run under TS7 with **no script changes**, while ESLint keeps using TS6. Applied to root + backend + web + `packages/shared` (all three have a typecheck gate); `packages/db` gets the TS6 alias only (build-only `tsc`, no typecheck gate).

## Consequences

- Positive: ~10x faster typecheck in the gate; type-aware ESLint keeps working unchanged.
- Negative: two TypeScript versions in the tree; the aliasing is non-obvious and documented here.
- Temporary: this is a transitional setup. When typescript-eslint supports TS 7 (expected with the 7.1 stable API), the TS6 alias and `typescript-7` alias collapse back to a single `typescript@^7` dependency. This ADR should be revisited then.

## Governance

The gate's `typecheck` task must resolve `tsc` to TS7 (verify with `tsc --version` → 7.x) and `lint:check` must pass (proves typescript-eslint still resolves TS6). `sherif` keeps the aliased `typescript` version consistent across packages.

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
- Revisit when: typescript-eslint ships TS 7 support (TS 7.1 stable API).
- Modified: 2026-10-11 — Revisado al actualizar a TypeScript 7.0.2 y 6.0.2: typescript-eslint 8.71.1 sigue exigiendo `typescript >=4.8.4 <6.1.0`, así que la decisión sigue vigente.
