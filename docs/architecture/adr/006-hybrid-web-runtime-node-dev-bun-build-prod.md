# 006: Hybrid web runtime — Node for the dev server, Bun for build and production

**Status:** Accepted

## Context

Having moved backend and tests onto Bun ([001]), we set the Next.js 16 web app to run on the Bun runtime too (`bun --bun next dev/build/start`, keeping Turbopack). The production build (`bun --bun next build`) and prod server work fine. But the **dev server hangs forever at `○ Compiling / ...`** on the first request, with a Turbopack worker growing in memory — the likely cause of an earlier machine slowdown.

Investigation found two distinct, independent problems:

1. **`turbopack.root = monorepoRoot` (which we had added) caused the hang — and it reproduced on Node too.** Pointing Turbopack's filesystem root at the whole monorepo made its dev watcher track every package, all `node_modules`, and `.git` across the repo, plus the pnpm workspace symlinks — an invalidation storm that recompiled `/` endlessly. Removing `turbopack.root` (letting Next scope the watcher to `apps/web`) fixed dev: `GET / 200 in 5.5s`. The production build still works without it (Next infers the workspace root from the lockfile).
2. **Bun runtime + Turbopack dev is separately fragile.** Independent of the above, `cacheComponents: true` (Next 16 PPR) plus Bun's `setTimeout` (missing `_idleStart`) is a known dev-only hang (oven-sh/bun#25639, vercel/next.js#87630), and Bun's file watcher conflicts with pnpm symlinks under Turbopack dev. There is no perceptible dev-speed gain from Bun anyway, since the heavy compiler (Turbopack) is Rust, not JS.

## Alternatives Considered

- **Force Bun in dev by disabling features.** Set `cacheComponents: false` + `turbopackFileSystemCacheForDev: false`, or fall back to `--webpack`. PRO: keeps one runtime everywhere. CON: sacrifices Cache Components / PPR in dev (a feature we deliberately use), risks diverging dev vs prod behavior, and may still fall back to the deprecated Webpack path — all for zero real gain.
- **Hybrid: Node for `dev`, Bun for `build`/`start` (chosen).** PRO: stable Turbopack HMR, full Cache Components and monorepo symlink support in dev; Bun runtime kept where it actually pays off (fast, linear production build + prod server). CON: `dev` runs on a different runtime than production — a divergence to keep in mind (mitigated: `build`/`start` exercise the Bun runtime, and CI/prod use them).

## Decision

Two changes:

1. **Remove `turbopack.root` from `next.config.ts`** (keep `outputFileTracingRoot`). This alone fixes the dev compile hang and does not break the build.
2. **Web scripts are hybrid**: `dev` = `next dev -p 3010` (**Node**); `build` = `bun --bun next build` and `start` = `bun --bun next start` (**Bun**). This is the Vercel/Oven-recommended pattern: Node for the dev server (stable HMR), Bun for build and production runtime.

## Consequences

- Positive: dev server compiles and serves normally, no memory blow-up; Cache Components/PPR and monorepo symlinks work in dev; production build/runtime stay on Bun.
- Negative: the web dev runtime (Node) differs from its production runtime (Bun) — a deliberate, documented divergence. The backend has no such split (Bun in dev and prod).
- Note: this is independent of the Bun migration — the `turbopack.root` hang reproduced on Node, so Bun did not cause it. Bun for the web dev server remains blocked by upstream beta bugs, revisit when those close.

## Governance

Web `dev` must not be prefixed with `bun --bun` until the upstream Bun+Turbopack dev bugs are resolved; `build`/`start` must stay on Bun. `next.config.ts` must not reintroduce `turbopack.root` pointing at the monorepo root. `pnpm run build` (which runs the Bun web build) in the gate guards the build path.

## Notes

- Author: El-Vitas
- Created: 2026-07-10
- Approved by: El-Vitas
- Related: [001], [004]
- Revisit when: oven-sh/bun#25639 / vercel/next.js#87630 (Bun+Turbopack dev) are fixed.
- Modified: 2026-10-11 — Both issues are closed. With Bun 1.4.2 and Next 16.4.0, `bun --bun next dev` compiled and served `/es/login` without the `setTimeout` warning (3 s the first time, 62 ms afterwards). The test was short and did not cover HMR or all routes, so the decision still holds until full development is tested on Bun.
- Modified: 2026-10-11 — Tested thoroughly: on Bun, every page that uses the logger returns 500 in development, because Turbopack loads `pino` as an external module under a hashed name (`pino-7abf25725c5ea488`) that Bun does not resolve. The server also grew to 1.7 GB. The decision stands; retest once Bun resolves Turbopack externals.
