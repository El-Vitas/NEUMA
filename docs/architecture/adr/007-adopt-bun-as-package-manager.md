# 007: Adopt Bun as the package manager (full Bun)

**Status:** Accepted
**Supersedes:** 001

## Context

ADR-001 adopted Bun as the runtime but **kept pnpm as the package manager**, because at the time Bun workspaces were less battle-tested for a Turborepo monorepo, Bun lacked native-addon support (`bcrypt`, `better-sqlite3`), and pnpm's strict store isolation backed our lint rules.

Keeping two package managers created a concrete risk: **dev resolves with pnpm (`pnpm-lock.yaml`), prod Docker would resolve with Bun (`bun.lock`)** — two lockfiles, divergent transitive resolution and hoisting → the classic "works in dev, breaks in prod" drift. pnpm's flagship benefit (a shared content-addressable store with hard links across projects) is also **not realized inside a single-project production image**, so pnpm added little in prod.

Since ADR-001 the blockers dissolved: `bcrypt` was replaced by `Bun.password` (ADR-003), `better-sqlite3` is a root dev-only tool (rules CLI), not a runtime/prod dependency, and Bun's workspace + `bun install --filter` support is now sufficient for the monorepo.

## Alternatives Considered

- **Keep pnpm everywhere (status quo of 001).** PRO: zero migration, reproducible. CON: pnpm's store benefit unrealized in prod images; if prod ever used Bun install → drift.
- **pnpm in dev / Bun in prod.** PRO: minimal change. CON: **two lockfiles → resolution drift**; unsafe for prod. Rejected.
- **Full Bun (chosen).** PRO: one `bun.lock` (no drift dev↔prod), Bun is already the runtime + test runner, faster installs, one toolchain. CON: migration cost; Bun's flatter hoisting surfaces undeclared transitive deps.

## Decision

We will use **Bun as the single package manager** across dev and prod, keeping **Turborepo** for task orchestration. `pnpm-lock.yaml` and `pnpm-workspace.yaml` are removed; workspaces are declared in the root `package.json` (`"workspaces": ["apps/*","packages/*"]`) with a single committed `bun.lock`. This eliminates the dev↔prod drift risk, which is the primary motivation.

Docker images use the canonical `turbo prune <app> --docker` to isolate each app's subgraph, then `bun install --frozen-lockfile` on the pruned output. prune scopes both the copied manifests and the install to the subgraph, so a change to an unrelated workspace's `package.json` does not bust another image's dependency cache. turbo 2.9.14 carries the fix (vercel/turborepo#12228) for the earlier pruned-`bun.lock`/`--frozen-lockfile` incompatibility, so the pruned lockfile validates frozen. All stages run on `oven/bun:1.3-alpine` (turbo needs `libc6-compat` there); the pruner and builder stages are discarded, so only the app's runtime output reaches the lean runner.

Making prune work required two dependency-hygiene fixes (see Consequences): extracting the SQLite-backed rules CLI to its own workspace, and de-duplicating the `typescript-7` npm alias.

## Consequences

- **No drift:** dev and prod install identical transitive versions from one lockfile.
- Bun's stricter/flatter resolution surfaced **undeclared deps** (each package must declare the tools it uses): added `eslint`/`typescript-eslint` to `@company-brain/shared`, `@next/bundle-analyzer` to the portal, and the `.astro` ESLint parser is wired explicitly. This is a correctness improvement.
- **Dependency hygiene forced by prune** (both are net improvements): (1) the SQLite rules CLI + its native `better-sqlite3` dep were moved out of the root manifest into a dedicated `@company-brain/rules-cli` workspace — prune always keeps the root manifest, so a native dev-only tool there would be pulled into every image and fail to compile under Bun (prebuild-install is unsupported, oven-sh/bun#4290); no deployable app depends on the new workspace, so prune excludes it. (2) `typescript-7` (`npm:typescript@^7`, the `tsc` compiler) was declared in root AND in each workspace; Bun mis-resolved the per-workspace copies to the `typescript6` alias (`tsc6`), which prune then kept while dropping the correct root resolution, so `tsc` vanished from pruned builds — removing the redundant per-workspace declarations left one correct root resolution. `typescript` (aliased to `@typescript/typescript6`) stays per-workspace: it is the typescript-eslint peer, not the build compiler.
- Docker: `turbo prune --docker` scopes each image's dependency cache to its subgraph; the portal builds via `turbo run build` (topological, builds workspace deps first); the integration test setup runs `bun run db:push` (not `npx`).
- Trade-off accepted: Bun's package manager is younger than pnpm; mitigated by the frozen root lockfile and CI verification.

## Governance

`bun.lock` is the single source of truth; CI runs `bun install --frozen-lockfile` and the full `turbo run build lint typecheck` + tests. No `pnpm-lock.yaml` may reappear. New workspace packages declare all tools they invoke (Bun does not expose the root `.bin` to workspace scripts the way pnpm did).

## Notes

- Author: El-Vitas
- Created: 2026-07-12
- Supersedes: 001
