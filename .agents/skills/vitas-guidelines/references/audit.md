# The self-audit gate

Read this before finalizing. SKILL.md §12 lists the 48 checks; this file gives the scans that make each one mechanical, so a check is *run*, not *recalled*.

Run every check against the files you changed or created. Fix failures before showing anything to the user. A check you skipped is a check that failed.

## Contents

- [1. Structure scans](#1-structure-scans)
- [2. Function-body scans](#2-function-body-scans)
- [3. Type and boundary greps](#3-type-and-boundary-greps)
- [4. Reuse scans](#4-reuse-scans)
- [5. Magic-value and env greps](#5-magic-value-and-env-greps)
- [6. Behavior review](#6-behavior-review)
- [7. Security review](#7-security-review)
- [8. Frontend review](#8-frontend-review)
- [9. Restraint review](#9-restraint-review)
- [10. Delivery](#10-delivery)

---

## 1. Structure scans

**Discovery** — conventions detected or asked; no silent folder-name assumption. If you assumed a fallback, it's named in the delivery.

**One concern per file** — three passes over every touched file:

- *Mixed*: any file holding more than one kind (component + type + constant + helper)? Split.
- *Fragmented*: N single-symbol files where the cohesion test says merge? Merge.
- *Wrong folder*: a types file in `lib/`, a schema in `config/`, a hook in `lib/`? Move to the folder that owns the kind, **then** re-apply cohesion in the destination.
- *Post-extraction*: helpers just pulled out of a `.tsx` must not land one-per-file. Re-run cohesion on the destination folder.

**No non-rendering helper in a `.tsx`/`.jsx`/`.vue`/`.svelte`** — scan the component body **and module scope**. Module scope is not a loophole.

```bash
grep -nE '^(const|function) (get|format|parse|map|to|from|adapt|serialize|normalize|is|has|can|should|build|compute)[A-Z]' path/to/*.tsx
```

Every hit is a candidate: one-line getters (`getStatusVariant`), parsers (`parsePageNumber`), formatters, predicates, and especially adapters. They belong in `lib/` (or `server/lib/`). Cross-check against §4 for shape-duplicates.

**Server-only leakage in the pure helpers folder:**

```bash
grep -rnE "from ['\"]node:|require\(['\"]node:|process\.env|Deno\.env|\bfs\.|axios|fetch\(|prisma\.|db\." <pure-lib-folder>/
```

Any hit → move the helper to the server helpers folder. "It's just hashing" is not an exception.

**Also confirm:** one public component per file · subcomponents extracted · domain constants in the constants location (not `config/`, not inline at the top of a `.tsx`) · types in their kind-file with `IProps` the only co-location · sub-feature folders where sub-sections are visible, and no sub-folder holding a single file · schemas in the schemas location · HTTP boundary thin · actions/services/queries hold only their named concern.

---

## 2. Function-body scans

**Section comments and paragraph blocks:**

```bash
grep -nE '^\s+//\s*(validation|validate|step|process|build|loop|handle|setup|init|compute|format|cleanup)' <changed files>
```

Each hit is a missing extraction. Search for an existing helper before writing a new one.

**Declarations inside a body:**

```bash
grep -nE '^\s{2,}(type |interface |class |enum )' <changed files>
grep -nE '^\s{2,}const \w+Schema = z\.' <changed files>
```

Hoist to the kind-file and import.

**Narration litmus** — read each new or modified function aloud. Any *"and then we… and inside that… well, we also…"* is a hidden helper.

**Tell, don't ask:**

```bash
grep -rnE '\.(role|status|type|state) === ['\''"]' <changed files>
```

The same access + condition in 2+ places → extract a named predicate and replace every site.

**Branch litmus — read, don't measure.** For each condition you added or touched, read it aloud: if following it means holding something in your head, it fails. The scans that surface the usual shapes:

```bash
grep -nE '\?[^:?]*\?[^:]*:' <changed files>          # a ternary inside a ternary
grep -nE '^\s{6,}(if|for|while|switch)\b' <changed files>   # third level of nesting or deeper
grep -nE '\}\s*else\b' <changed files>              # else after a return in the if-branch
grep -nE 'if \(.*(&&|\|\|).*(&&|\|\|)' <changed files>   # three or more operators, unnamed
grep -nE '\} else if \(' <changed files>             # chain over one value → dispatch map
```

Each hit is a candidate, not a verdict — the fix is the one the code asks for: name the condition, early-return the guard, extract the block, or replace the chain with a map.

**Parameter lists:** look at the call sites, not the signature. `f(a, undefined, undefined, d)`, or callers counting positions, means the parameters outgrew a positional list.

**Also confirm:** functions small by meaning (no "and" in the one-sentence description) · `const` + arrow for every declaration (`grep -nE '^\s*(export )?function '`) · no `for` loop without one of the three justifications, stated in the delivery.

---

## 3. Type and boundary greps

```bash
grep -nE '\bany\b|as unknown as|as any|\bas [A-Z]' <changed files>
grep -nE '(await [a-zA-Z.]+\.json\(\)|JSON\.parse\([^)]*\)|formData\.get\([^)]*\)|localStorage\.getItem\([^)]*\)|sessionStorage\.getItem\([^)]*\)) as ' <changed files>
grep -nE '^\s+(const .* = require\(|import .* from)' <changed files>   # imports mid-body
```

Evaluate every hit:

- `any` anywhere — including generic constraints `(...args: any[]) => any`, form handler parameters, and a trailing `as any` after a correct narrowing. All FAIL.
- `as unknown as` — FAIL categorically. Fix at the source: `select` narrowing, a typed adapter, or `as const` on the source constant.
- A cast over an external boundary — parse with a schema instead.
- A surviving row-to-union assertion — valid only if the schema/migration proving the DB constraint is in *this* delivery AND the delivery report names the file plus the enum/check. Otherwise replace with a runtime check.
- Non-null assertions (`!`) that aren't provably safe.
- Every field accessed on a validated `unknown` is covered by the schema and read from the validated value.
- Imports at the top; only `dynamic(() => import(...))` at module top is exempt.

---

## 4. Reuse scans

- **Search-before-writing reported** — folders/packages searched, what was reused, what was created. If it isn't in the delivery, it didn't happen.
- **Existing symbols reused**, not redeclared — helpers, components, types, and literal unions.
- **Consolidation sweep applied as real edits**, not prose. Shape-duplicates included:

```bash
grep -rnE '^(export )?const (to|from|map|adapt|serialize|normalize)[A-Z]\w*' <feature and shared folders>
```

Two functions taking the same source shape and returning the same target shape are duplicates even with different names. Pick the canonical one (workspace package > app-shared > feature-local), update imports, delete the copies.

---

## 5. Magic-value and env greps

```bash
grep -nE '=== ['\''"][A-Z_]{2,}['\''"]|\b(setTimeout|setInterval)\([^,]+, *[0-9]{2,}|status: *[0-9]{3}|\.slice\(0, *[0-9]+\)' <changed files>
grep -rnE 'process\.env\.|import\.meta\.env\.|Deno\.env|os\.getenv|getenv\(|System\.getenv' <changed files>
```

Every literal carrying business meaning gets a named constant — at **every** site, including ORM `data:`/`where:` arguments, SQL params, REST bodies, GraphQL variables, `useState` initials, default arguments, config defaults, tutorial snippets and test data. Only `0`, `1`, `-1`, `2`, `""`, `true`, `false`, `null`, `undefined` stay inline.

Every env hit must be inside the single centralized env module.

---

## 6. Behavior review

Read, don't grep — these need judgment:

- **For every multi-write operation**: if the process dies mid-way, is the state recoverable? Related writes are in a transaction; no external side effect (email, queue, webhook, third-party call) sits inside one; no network call is holding locks.
- **For every read-then-write**: is it a race? Replaced with a unique constraint, an atomic update, a conditional update, or a locking read.
- **For every retryable handler** (webhook, queue consumer, submit button): running it twice is a no-op.
- **For every write**: what derived state went stale — cache, `revalidatePath`/`revalidateTag`, query invalidation, search index, counter — and is it invalidated here?
- **For every function with 2+ awaits**: are any independent? Parallelized with the tradeoff stated (fail-fast vs partial success, concurrency bound, write contention, transaction affinity).
- **Queries**: no N+1 (`grep -nE 'for .*\{[^}]*await|\.map\(async'`), no `SELECT *` / `findMany` without `select` when few columns are needed, pagination present with a server-side cap, the index a new query relies on exists and is named.
- **Absence**: every `findUnique` / `findFirst` / `find` / `Map.get` / cache read is checked before its result is dereferenced. `grep -nE 'find(Unique|First)?\(' <changed files>` and confirm the next use is guarded — no non-null assertion standing in for the check.
- **Dead code**: `grep -nE '^\s*(const|let) \w+ = await' <changed files>` and confirm each result is actually read; plus unused exports, unused parameters, unreachable branches, commented-out code, state set and never rendered. If the project already has a detector for unused files, exports or dependencies, run it — whatever it happens to be.
- **Errors**: business logic returns `Result`; `try/catch` only at infrastructure boundaries; nothing swallowed (`grep -nE 'catch\s*\([^)]*\)\s*\{\s*\}|\.catch\(\(\) => (null|undefined|\[\]))`); no floating promises; no bare `throw new Error` without context; no silent fallback.
- **Logging**: project logger, never `console.log` (`grep -rn 'console\.'`); no PII or secrets; stack traces on errors.
- **Tests**: present, behavior-focused, deterministic, and covering the failure paths above — not only the happy path.

---

## 7. Security review

For **every entrypoint** you added or touched — route, controller, Server Action, webhook, worker, MCP tool, cron, resolver — walk the seven-point checklist in `security.md` §1 and report the result per entrypoint.

The scans:

```bash
grep -rn "'use server'" <changed files>                    # each one needs authn + authz + validation
grep -rnE 'findUnique\(\{ *where: *\{ *id' <changed files> # IDOR: is the owner in the where clause?
grep -rnE 'data: *\{ *\.\.\.' <changed files>              # mass assignment
grep -rnE '\$queryRawUnsafe|\+ *req\.|\$\{[^}]*\} *(FROM|WHERE|SELECT)' <changed files>
grep -rnE 'dangerouslySetInnerHTML|v-html|innerHTML *=' <changed files>
grep -rnE 'NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)' <changed files>
grep -rnE '(sk_|pk_live|squ_|ghp_|AKIA)[A-Za-z0-9]{8,}' <changed files>   # hardcoded secrets
```

Then confirm by reading: ids taken from the session, not the request body · input schema-parsed at the boundary · rate limits and size caps on anything expensive or unauthenticated (and if the repo has no rate limiter, that gap is stated in the delivery) · no user-controlled URL reaching `fetch` unguarded · no path built from user input without a root check · errors don't leak internals or reveal account existence.

---

## 8. Frontend review

- **Every `useEffect`**: is it synchronizing with an external system? If it derives state, resets state on a prop change, reacts to a user event, or fetches data — it's the wrong tool.
- **Dependency arrays** complete and un-suppressed (`grep -n 'react-hooks/exhaustive-deps'` → any suppression is a finding).
- **Cleanup and abort** present for subscriptions, listeners, timers and in-flight requests.
- **Re-renders**: no object/array/function literal passed as a prop where a memoized child depends on it; context values memoized or split; state not living higher than it needs to.
- **Memoization both ways**: the missing memo that causes a real storm, and the ritual memo that buys nothing.
- **Keys**: `grep -nE 'key=\{(index|i|idx)\}'` — index keys on a list that can reorder are a bug.
- **Boundary**: `'use client'` pushed as low as possible; no server-only module or secret crossing it; props crossing it carry only what the UI renders.
- **Data fetching**: no waterfall where a `Promise.all` or a `<Suspense>` would parallelize; loading and error states present; no per-row fetch in a list; invalidation after every mutation.
- **Forms**: pending state, disabled-while-submitting, server-side validation, rollback on a failed optimistic update.

---

## 9. Restraint review

The counterweight (SKILL.md §0.1) is audited too:

- No interface with one implementation, no config option nobody passes, no factory around a constructor, no generic wrapper for one call site, no registry for one case.
- No optimization without a measurement, a known dataset size, or a clear algorithmic class.
- No extraction chain that makes one operation take five files to follow.
- Nothing outside the task scope changed, except a §3.4 consolidation — and that consolidation only pointed consumers at a canonical version and deleted copies.
- Anything you decided *not* to fix because it cost more complexity than the problem is stated, with the reasoning.

---

## 10. Delivery

- **Comments: zero.** `grep -nE '//|/\*' <changed files>` — only the three narrow exceptions survive (documented workaround with the upstream reference, the single safety line beside a runtime-validated assertion, `// TODO[TICKET-ID]:` with a real ticket). **JSDoc is not an exception** — check for `/**` explicitly; leaving a JSDoc block while self-reporting "zero comments" is the most common slip in this audit.
- **Commit message** follows `type(scope): description`, imperative, lowercase, ≤72 chars. Never commit without explicit user permission.
- **The transparency report** (SKILL.md §13) is written and complete: discovery, files and why, search-before-writing, consolidation, data safety, concurrency, security, control flow, surviving assertions, what you chose not to do, and any deviation.
