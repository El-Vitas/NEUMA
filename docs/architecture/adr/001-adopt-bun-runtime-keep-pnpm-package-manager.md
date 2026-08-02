# 001: Adopt Bun as the runtime while keeping pnpm as the package manager

**Status:** Superseded
**Superseded by:** 007 (adopted full Bun — Bun is now also the package manager)

## Context

The monorepo ran entirely on Node 22: NestJS backend via `nest start`, Next.js web via `next dev/build`, Vitest for tests, all installed and orchestrated with pnpm 9 + Turborepo. We wanted lower memory footprint and faster startup for the long-running backend, faster tests, and faster typecheck. Bun 1.3 is mature enough in 2026 to run NestJS and Next.js as a runtime, but its package manager is less battle-tested for monorepos than pnpm and does not run native (node-gyp) addons.

## Alternatives Considered

- **Full Bun (runtime + `bun install` as package manager).** PRO: single tool, fastest cold installs. CON: Bun workspaces less mature than pnpm for a Turborepo monorepo; ~95% npm compat and no native-addon support risks our `bcrypt`/`better-sqlite3` dependencies; loses pnpm's strict phantom-dependency isolation that our lint rules rely on.
- **Stay on Node entirely.** PRO: zero risk, everything works. CON: forgoes the RAM/startup/test-speed gains that motivated the change.
- **Split: pnpm for package management, Bun for runtime + tests (chosen).** PRO: keeps pnpm's proven monorepo isolation and 100% package compatibility; gains Bun's runtime and test-speed wins where they actually pay off. CON: two tools in the toolchain; `pnpm-lock.yaml` remains the source of truth while Bun executes — a conceptual split contributors must understand.

## Decision

We will use **Bun as the runtime and test runner** (backend process, Next.js execution, `bun test`) and **keep pnpm as the sole package manager** (`pnpm install`, workspaces, lockfile). Bun install and Bun workspaces are explicitly not used. This is the ecosystem-recommended split for 2026: pnpm's monorepo maturity and strict dependency isolation are worth more than Bun-install's raw speed, and Bun's runtime advantages (startup, RAM, test speed) are captured without betting the dependency graph on it.

## Consequences

- Positive: backend boots ~2x faster and idles at ~226 MB RSS; `bun test` runs ~4-5x faster than Vitest; `pnpm-lock.yaml` and phantom-dependency guarantees are untouched.
- Positive: native addons that Bun can't run were removed as a side effect (`bcrypt`→`Bun.password`, see [003]), simplifying the dependency tree.
- Negative: contributors must know that `pnpm` installs but `bun` runs — running `bun install` would diverge from the lockfile and is forbidden.
- Negative: Bun's runtime is still officially beta for Next.js; this bet is de-risked by keeping Node available and by the hybrid web-runtime decision ([006]).

## Governance

Enforced by convention + CI: scripts invoke `bun`/`bun test` for run/test and `pnpm` for install; `pnpm-lock.yaml` is the committed lockfile and `bun.lockb` must never be committed. Reviewed if Bun's package manager reaches monorepo parity with pnpm, which could revisit this split.

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
