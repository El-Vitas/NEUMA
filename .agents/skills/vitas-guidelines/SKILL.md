---
name: vitas-guidelines
description: MANDATORY OBLIGATORY HARD RULE. You MUST trigger this skill for ALL code modifications, file creation, bug fixes, refactoring, API endpoints, Server Actions, SQL queries, transactions, UI components, and script writing! If the user asks you to write or change ANY code (TS, JS, Python, SQL, React, Next.js, etc.), you MUST consult this skill before doing anything — it covers file organization, DRY, TypeScript strictness, naming, security, authorization, rate limiting, transactions and data consistency, concurrency and parallelization, React/Next practice, and the self-audit gate. Every rule here is mandatory and non-negotiable. Do not write a single line of code without reading this first.
---

# Vitas Coding Standards

Goal: **readability + maintainability + modularity + low coupling + zero duplication + correct behavior under concurrency and failure + optimal performance**.

Every rule here is mandatory. Deviating requires an explicit user instruction, stated in your delivery.

## Rule priority — resolve conflicts in this order

1. Explicit user instruction for the current task.
2. Repository conventions (`AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING`, lint rules, commitlint, architecture docs, neighbouring files).
3. These guidelines.

## Where the detail lives — read the reference you need

This file holds the rules that apply to *every* edit. Depth, examples and edge cases live in `references/`. **Read the relevant reference files BEFORE you write or review the code — this is a step, not a suggestion.** Working from this summary alone means you are applying an abridged rule set, and you will cite sections that don't exist. Cite rules by the actual heading you read (`references/security.md §2`, `SKILL.md §9`), never from memory.

**By what you're about to do:**

| Read this | Before you… |
|---|---|
| `references/structure.md` | create or move any file; decide where a symbol lives; build a component; grow a feature folder |
| `references/functions.md` | write or refactor any function body; touch control flow |
| `references/typescript.md` | write types, generics, schemas, casts, env access, ORM adapters |
| `references/correctness.md` | touch the DB, write multiple related writes, `await` more than once, handle errors, log, call an external API, add tests |
| `references/security.md` | add or change ANY entrypoint (route, controller, Server Action, webhook, worker, MCP tool), handle user input, touch auth, upload files |
| `references/frontend.md` | write React/Next code — `useEffect`, state, server/client boundary, data fetching, re-renders |
| `references/audit.md` | finalize — the full self-audit greps and the delivery report format |

**By the kind of file in front of you** — the same table keyed the other way, because most tasks start from a file, not from an activity:

| File kind | Read at minimum |
|---|---|
| Server Action, route handler, controller, webhook, worker, MCP tool | `security.md` + `structure.md` + `correctness.md` |
| Service / business logic | `correctness.md` + `structure.md` + `functions.md` |
| Query / repository / migration | `correctness.md` + `typescript.md` |
| React or Next component (`.tsx`) | `frontend.md` + `structure.md` |
| Hook | `frontend.md` + `functions.md` |
| Pure helper / lib / util | `functions.md` + `structure.md` |
| Types / schemas / constants / env | `typescript.md` + `structure.md` |
| Test | `correctness.md` §11 |

---

## 0. The Golden Rule — modify only what's necessary

When modifying existing code:

- **Do NOT refactor surrounding code** unless it contains a critical bug, a security flaw, or the task directly requires it.
- **Do NOT modify existing functions, types or utilities** unless the task requires it.
- To extend functionality, **extend** (wrapper, sibling, option) — don't rewrite the original in place.
- New code meets these standards; existing boundaries are respected.
- Surgical edits only; explain why in the delivery summary.

*Why:* changing what isn't broken introduces regressions and noise in review.

**The one carve-out — and its exact limit.** §3.4 (consolidation sweep) authorizes editing files outside the task scope, but **only** to consolidate a duplicate that your own change created or exposed, and only by pointing consumers at a canonical version and deleting the copy. It does not authorize restructuring, renaming or "improving" the neighbourhood. When the user explicitly asks for a refactor, an audit or a consolidation pass, the wider scope *is* the task and §0 doesn't restrict it.

## 0.1 Simplicity and tradeoffs — the counterweight

The rest of this skill pushes toward extraction, abstraction and structure. This rule pushes back, and carries **equal weight**. Applying the other rules until the code is hard to follow is a FAIL, not compliance.

- **The simplest correct solution wins.** Fewest moving parts that satisfies the requirement, today.
- **No speculative abstraction (YAGNI).** No interface with one implementation, no config option nobody passes, no factory around a constructor, no generic wrapper for a single call site, no plugin system for two cases, no "we might need this later". The trigger for abstraction is a **second real case**, not the anticipation of one.
- **Extraction has a cost.** Each hop is a file to open. If following one operation takes five jumps, the extraction went too far — that's the same disease as a God Function, mirrored. §1's rules serve readability; when they stop serving it, stop applying them.
- **Optimize when there's a reason.** A measurement, a known dataset size, or a clear algorithmic class. Not a hunch.
- **Every recommendation names its tradeoff.** When you parallelize, abstract, cache, index, memoize or add a layer, state in one line what it costs (fail-fast semantics, connection-pool pressure, invalidation burden, write amplification, indirection, re-render cost). A recommendation with no stated cost is incomplete — see `references/correctness.md`.
- **When a rule's fix costs more complexity than the problem, say so and leave it.** Report it as a conscious decision, not silence.

## 0.2 Project discovery — detect or ask, never assume

Folder names differ between projects. **Assuming `constants/` or `lib/` or `config/` without evidence is a FAIL.**

Scan first: existing folder names for each kind (`lib/`|`utils/`|`helpers/`, `types/`|`models/`, `schemas/`|`validators/`, `constants/`|`config/`, `components/`|`widgets/`, `actions/`|`mutations/`); the HTTP layer (`route.ts`, `controllers/`, `handlers/`); the business layer (`services/`, `server/`, `domain/`, `usecases/`); the data layer (`queries/`, `repositories/`, `dao/`); and any `AGENTS.md` / `CLAUDE.md` / `ARCHITECTURE.md` / ESLint config / tsconfig path aliases that pin a convention.

If detection is ambiguous, **ask concrete questions before writing** — never a blank "what's your convention?". Remember the answer for the rest of the session. Full question template and fallback defaults: `references/structure.md`.

**Hard guard:** `config/` is never the home for domain constants. Domain constants (statuses, roles, limits, page sizes, enum-like dictionaries, any magic value with business meaning) go in the constants location. `config/` holds project configuration (fonts, metadata/SEO, env wiring, third-party setup). Putting `PAGE_SIZE` or a status dictionary in a `*.config.ts` is a FAIL.

---

## 1. One concern per file

**A file contains exactly one kind of thing, and only the thing the file is named for.** This is the rule broken most often.

**"One concern" is NOT "one symbol."** This misread causes over-fragmentation — five tiny files where one cohesive file belongs. A concern is a cohesive topic (date helpers, pagination constants, user types); it often holds several related symbols and they share a file. The component file is the only place where "one symbol" applies.

The kinds: component · pure helper (isomorphic) · server-side helper (I/O) · hook · type · schema · domain constant · project config · HTTP boundary · Server Action · service · query. Each goes in its own kind of file, **even when they belong to the same feature and depend on each other**. The single exception is a component's own `IProps`, which may live in its `.tsx`.

Cohesion test when deciding whether two symbols share a file: *would a reader looking for one reasonably expect to find the other here?*

→ Full kinds table (what belongs, what never belongs), the pure-vs-server-helper boundary, anti-fragmentation examples, when to split, subcomponent extraction (§2), packagelets, open-for-extension, and recursive sub-feature promotion: **`references/structure.md`**.

## 2. Function bodies read as narration

A function body is a sequence of named steps. A reader understands **what** it does from the body alone, and opens a helper only to learn **how**.

- **Small by meaning, not by line count.** One function, one thing; if naming it needs "and" or "or", split it. Many small named functions is good — each is trivially testable and the parent reads as prose. Don't impose an artificial LOC limit.
- **A section comment inside a body is a missing extraction.** `// validation`, `// step 1`, `// build result` — extract the section into a function named what the comment said; the comment disappears. Blank-line "paragraphs" inside a body are the same symptom.
- **When extracting, search first (§3.1).** The best outcome is the block disappearing into an *existing* helper, not new code.
- **No `type`, `interface`, schema, `class`, or second named function declared inside a body.** Hoist to its kind-file and import. Locals, transient data and trivial inline callbacks are fine.
- **Tell, don't ask.** When the same property access + logic appears in 2+ places (`user.role === "admin" && user.permissions.includes("write")`), extract a named predicate or operation (`canPerformAdminWrite(user)`) and call it everywhere. Callers stop depending on internal shapes; the rule lives in one place.
- **Branches stay readable.** Early-return the guards and keep the happy path at root indentation — at most two levels of nesting, and no `else` after a `return`. An `if / else if` chain over the same value becomes a dispatch map. **Never nest a ternary inside another**: `a ? b : c ? d : e` is that same chain in disguise. Reach through optional values with `?.` and `??` rather than a staircase of `if`s. The test is the same kind as the one above — read the condition aloud, and if you must hold something in your head to follow it, it is too much. There is no number here to hit.

→ Examples, the narration litmus, the full tell-don't-ask fail patterns, and control-flow detail (early returns, `switch` vs dispatch map, when a `for` loop is justified): **`references/functions.md`**.

## 3. DRY — zero duplication is the target

**Code reuse over new code, always. Cero duplicados.**

### 3.1 Search before writing — MANDATORY and VISIBLE

Before declaring any new function, hook, component, type, schema or constant, run an explicit search **and report it**. Never skip it, never do it silently.

Search: the current feature's folders → the app's shared folders → workspace packages (`packages/*/src/`) → installed UI primitive libraries → installed library APIs that may already do the job (Zod, date-fns, lodash/radash).

Then state, briefly:

> "Searched \<folders/packages\> for \<what I'm about to build\>. Found \<symbol\> in \<path\> — reusing it. No existing \<other\> found — creating one in \<location\>."

### 3.2 Act on the result

- **Equivalent exists** → import and reuse.
- **Almost equivalent** → adapt it (optional parameter) or wrap it. Never a parallel copy.
- **A hand-rolled symbol duplicates an installed library** → use the library, delete the hand-rolled one.
- **Adapting would force a God Function or break callers** → extract the shared core, build two thin wrappers. Prefer wrappers over duplication.
- **Nothing exists** → write it in the correct kind-file.

### 3.3 Silent duplication is forbidden

If duplication is genuinely unavoidable, say so loudly: *"I am duplicating X because Y; the wrapper alternative had these drawbacks."* Never duplicate without explaining.

### 3.4 Post-write consolidation sweep — MANDATORY

After writing, before showing the code, sweep all files in the deliverable set:

1. Re-read the shared folders that may have grown.
2. Detect: the same constant declared twice; a new helper duplicating an older one under a different name; a new type that already existed (including literal unions); a semantic literal inline in 2+ files; a new component re-implementing an existing primitive; and **adapter duplicates by shape** — grep for `to<Domain>` / `from<Source>` / `map<X>Row` / `adapt<X>` / `serialize<X>` / `normalize<X>` and for inline object literals built from an ORM row. Two functions taking the same source shape and returning the same target shape are duplicates even with different names.
3. **Apply the consolidation as a real file change** — not prose about what should be done. Pick the canonical version (workspace package > app-shared > feature-local), update imports, delete the copies. Edit the out-of-scope file too, within the §0 limit.
4. Report what was consolidated and what remains.

### 3.5 Extensibility test

Before writing: *"can I extend, reuse, parameterize or wrap something that already exists?"* After writing: *"if tomorrow a new field / variant / endpoint / column is added, how much code must change?"* The right answer is one new file plus one registry entry, with zero edits to existing code — **as long as reaching it doesn't violate §0.1**. Don't build the registry until the second case exists.

---

## 4. TypeScript strictness

- **Never `any`.** Not in parameters, not in returns, not in generic constraints (`<T extends (...args: any[]) => any>` is a FAIL — use `unknown` plus `Parameters<T>` / `ReturnType<T>`), not as a trailing `as any` after a correct narrowing.
- **Never `as unknown as <Type>`.** Categorically. At ORM boundaries, fix it at the source: narrow with `select`/`include` so the query returns the shape you need, or write a typed adapter helper. "The library forces me" is the rationalization this rule exists to block — fix the source declaration (`as const`) instead.
- **External input is `unknown` — parse, don't cast.** Every door where data enters from outside the type system: `response.json()`, `JSON.parse`, `FormData.get`, `URLSearchParams`, `localStorage`, `process.env`, file reads, DB rows whose column type ≠ domain type. Validate with a schema, then read from the validated value — never from the raw input.
- **Explicit return types on exported functions.** Don't rely on inference across files.
- **Props are a typed `interface` named `IProps`** (or `<Component>Props`), co-located in the component's `.tsx` — the one allowed co-location.
- **All imports at the top of the file**, in every language. No `require()` mid-body, no inline `import()` except genuine code-splitting (`dynamic(() => import(...))`), which still lives at module top.

→ Generic constraints, form handlers and `z.infer`, validation coverage on `unknown`, the ORM adapter pattern and the exact conditions under which a single row-to-union assertion is acceptable, per-language import rules, stub bodies, and the centralized env accessor: **`references/typescript.md`**.

## 5. Naming

- **Full descriptive names.** Never single- or two-letter variables — not in `.map`, `.filter`, `.reduce`, `.find`, callbacks, event handlers or `catch`. `(user) =>`, not `(u) =>`. The only exception is an unambiguous technical abbreviation (`id`, `url`, `api`, `db`, `ip`, `dto`), and even then prefer the full form.
- **No generic names** (`data`, `value`, `obj`, `tmp`). Functions describe behavior; variables describe meaning.
- **Booleans read like predicates**: `is*` / `has*` / `should*` / `can*` / `will*` / `did*`. Extract complex conditions to a named const before the `if`.
- **All code identifiers and internal text in English** — variables, keys, function names, error messages, validation messages, test fixtures. Only end-user-facing text (UI labels, emails, notifications) may use the project's target language.

## 6. Constants and magic values

- **Never hardcode a literal that carries business meaning.** Not `status === "ADMIN"`, not `length < 8`, not `setTimeout(fn, 5000)`.
- **No carve-out.** Config file defaults, tutorial and example snippets, ORM arguments (`prisma.x.create({ data: { … } })`, `where:`), SQL parameters, REST bodies, GraphQL variables, `useState` initials, default arguments, test data — all the same violation. Log truncation sizes included.
- **Allowed inline:** `0`, `1`, `-1`, `2`, `""`, `true`, `false`, `null`, `undefined`. Everything else gets a named constant.
- **Presentational values are not domain constants.** A one-off `padding: 24`, a `z-index`, a grid column count — these carry no business meaning and don't need a `constants/` entry. **But** if the project has design tokens or a spacing scale, use the token; and a presentational value repeated across files is a duplicate like any other. The test is "does this literal encode a business rule?", not "is it a number".
- **Constant dictionaries, not TS `enum`** (enums emit compilation artifacts):
  ```ts
  const OrderStatus = { Active: "ACTIVE", Inactive: "INACTIVE" } as const;
  type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
  ```
- **One definition, every consumer imports.** A literal union redeclared in a second `.types.ts` when the type already exists is the same failure.
- **Never read env inline.** No `process.env.X` / `import.meta.env.X` / `Deno.env.get` / `os.getenv` outside the one centralized, validated env module. See `references/typescript.md`.

## 7. Comments — zero unless the user asks

**Default: cero. Ninguno.** Not in code you write, not in code you modify. If you feel the need to comment, the fix is a better name or an extracted function.

- No comments explaining *what* the code does — that comes from identifiers.
- **No JSDoc / docstrings / `/** … */` in any form** — single-line, file-header, `@param`, `@returns`, `@example`, `@template`. JSDoc is not a carve-out; self-reporting "zero comments" while leaving a JSDoc block is a common slip.
- No `// step 1` narration (that's a missing extraction, §2).
- No comment "for clarity".

If the user says *"añade comentarios"*, *"document this"*, *"deja JSDoc"* — write them in the style they want.

**Three narrow exceptions, allowed without instruction:** a real workaround that naming cannot express (`// works around upstream bug X in pkg@1.2.3`); the single safety line next to an unavoidable, runtime-validated assertion at an external boundary; a `// TODO[TICKET-ID]:` / `// FIXME[TICKET-ID]:` with a real ticket reference (never a bare `// TODO`). That's it.

## 8. Function declaration style (JS/TS)

`const` + arrow function, always: `const computeTotal = (order: Order): Money => { … };`. Never the `function` keyword. Same for components. Exception: framework-decorated classes that require `class` syntax (NestJS `@Controller()`, `@Injectable()`).

## 9. Behavior — the rules that make code correct, not just tidy

These carry the same weight as the structural rules. A perfectly organized file that loses data under concurrency is a worse deliverable than a messy one that doesn't.

- **Anything that must happen together goes in a transaction.** Two writes that must both land, a write plus its dependent write, a create plus its relation — atomic or nothing. Never leave a half-state.
- **External side effects never go inside a transaction.** Emails, queue publishes, webhooks, third-party calls. A transaction that rolls back after the email left is a broken state. Emit after commit.
- **Read-then-write needs a lock, a unique constraint or an atomic update** — not a re-read. Check-then-insert and read-balance-then-write-balance are races.
- **Retryable handlers must be idempotent.** Webhooks, queue consumers, anything a user can double-click. Idempotency key or unique constraint.
- **A write that leaves a derived state stale is a bug.** Cache, search index, materialized counter, `revalidatePath`/`revalidateTag`, query invalidation — invalidate in the same change that writes.
- **Parallelize independent work.** Consecutive `await`s with no data dependency between them → `Promise.all`. This is the single most common miss. **And name the tradeoff you checked**: `all` fails fast (use `allSettled` for partial success), unbounded fan-out exhausts the connection pool or trips a third-party rate limit (bound it), parallel writes to the same rows deadlock, parallel work inside a transaction is usually wrong.
- **No N+1.** A query inside a loop or a `.map` — batch it, `include` it, or `IN (…)` it.
- **Fetch only what's used.** No `SELECT *`, no Prisma `findMany` without `select` when you need three columns, no unbounded list without pagination.
- **Parameterized queries only.** Never concatenate user input into SQL.
- **A lookup that can return nothing must be handled before the value is used.** `findUnique`, `findFirst`, `find`, a cache miss, a `Map.get` — all return null/undefined for a normal input. Dereferencing the result without a check turns "not found" into an unhandled `TypeError` at a random line instead of a controlled 404. Check, or use a variant that throws a typed error (`findUniqueOrThrow`), before the first property access.
- **Leave no dead code behind.** A fetched value nobody reads, a variable assigned and never used, an unused export, a parameter nobody passes, an unreachable branch, commented-out code. A query whose result is discarded is also a wasted round trip. Delete it in the same change — dead code is the cheapest defect to remove and the most expensive to leave, because the next reader assumes it matters.
- **Result pattern first.** Business logic returns `Result<T, E>` rather than throwing. `try/catch` belongs at infrastructure boundaries (HTTP, DB, external APIs) to convert technical exceptions into a `Result`. Never swallow an error; never throw a bare `Error` without context.
- **Never `console.log`.** Use the project's logger. No PII or secrets in logs; stack traces on errors.
- **Tests are part of the deliverable.** Test behavior, not implementation; Arrange–Act–Assert; deterministic. If the repo mandates TDD, write the test first.

→ Transaction scope, isolation and locking; idempotency patterns; concurrency limits and backoff; big-O discipline; index checks; API contracts, timeouts, retries, pagination and backward compatibility; migration safety: **`references/correctness.md`**.

## 10. Security — every entrypoint, every time

- **Every entrypoint authenticates AND authorizes.** Route, controller, Server Action, webhook, worker handler, MCP tool, cron. A **Server Action is a public HTTP endpoint** — `'use server'` does not make it private. Missing authz is the highest-severity defect in this skill.
- **Scope every resource to the caller.** `where: { id, ownerId: user.id }`, not "fetch by id and trust it" (IDOR).
- **Validate at the boundary with a schema before use.** No casting request data into shape.
- **No mass assignment.** Never spread a request body into `create`/`update`.
- **Rate-limit anything expensive or externally reachable** — login, password reset, search, upload, AI/LLM calls, any unauthenticated endpoint. Cap payload sizes and page sizes too.
- **No secrets in the client bundle** (`NEXT_PUBLIC_*` holding anything sensitive), in logs, or hardcoded.
- **No SSRF** (user-controlled URLs into `fetch`), **no XSS** (`dangerouslySetInnerHTML` / `v-html` with unsanitized input), **no path traversal**, **no `eval`/shell interpolation of user input**.

→ Threat-by-threat detail, the entrypoint checklist, upload handling, session and token rules, and what to do when the repo has no rate-limiter: **`references/security.md`**.

## 11. Git commits

`type(scope): description` — Conventional Commits. `type` ∈ `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`. Description imperative, lowercase, ≤72 chars. One commit per logical change. No `wip`, no `--no-verify`, no `--amend` on published commits. **Never commit without explicit user permission.** If the project documents a different convention, follow that.

---

## 12. The gate — self-audit before showing code

Run every check. Any failure gets fixed before delivery. The greps and full definitions are in `references/audit.md`; this is the checklist.

**Structure** — 1. Conventions detected or asked (§0.2). 2. One concern per file: not mixed, not fragmented, right folder for the kind. 3. One public component per file. 4. Subcomponents extracted. 5. Domain constants in the constants location, not `config/`, not inline. 6. Pure helpers isomorphic; anything server-only in the server helpers folder. 7. Types in their kind-file — `IProps` is the only co-location. 8. Sub-feature folders where sub-sections are visible; no folder holding one file. 9. Schemas in the schemas location. 10. HTTP boundary thin. 11. Actions/services/queries hold only their named concern. 12. No non-rendering helper anywhere in a `.tsx` — module scope included.

**Functions** — 13. Small by meaning. 14. No section comments or blank-line paragraphs inside bodies. 15. No type/schema/class/named-function declared in a body. 16. Narration litmus passes. 17. Tell-don't-ask applied. 18. `const` + arrow everywhere. 19. No forced `for` loop. 20. Branch litmus passes: ≤2 levels of nesting, no `else` after `return`, no nested ternary, `if/else` chains over one value replaced by a dispatch map, conditions named rather than inlined. 21. No positional parameter list a caller has to count — options object once optionals pile up.

**Types** — 22. No `any` anywhere, constraints and form handlers included. 23. No `as unknown as`; no cast over an external boundary; any surviving row-to-union assertion is backed by a delivered schema constraint and named in the report. 24. Validation covers every field accessed on `unknown`. 25. All imports at the top.

**Reuse** — 26. Search-before-writing reported. 27. Existing helpers/components/types/unions reused, not redeclared. 28. Consolidation sweep run and applied, shape-duplicates included.

**Values** — 29. No magic literal outside the allowlist, at every site including ORM args and test data. 30. No inline env read.

**Behavior** — 31. Related writes are transactional; no external side effect inside a transaction; no read-then-write race. 32. Retryable handlers idempotent. 33. Derived state invalidated on write. 34. Independent `await`s parallelized, with the tradeoff stated; no N+1; no over-fetch; pagination present. 35. Every lookup that can return nothing is checked before use. 36. No dead code left behind — unused values, discarded query results, unused exports, unreachable branches. 37. Errors returned as `Result` or converted at the boundary; none swallowed. 38. Project logger used; no PII in logs.

**Security** — 39. Every entrypoint authenticates and authorizes; resources scoped to the caller. 40. Input schema-validated at the boundary; no mass assignment. 41. Rate limits and size caps on expensive or unauthenticated endpoints. 42. No secrets in the client bundle or logs; no injection/SSRF/XSS/traversal.

**Frontend** — 43. No `useEffect` doing what render, a derived value, an event handler or the server should do; deps complete and un-suppressed; cleanup and abort where needed. 44. No avoidable re-render (unstable props, unmemoized context, index keys) — and no memoization that buys nothing.

**Restraint** — 45. No speculative abstraction, no interface with one implementation, no premature optimization (§0.1). 46. Nothing outside the task scope changed, except a §3.4 consolidation.

**Delivery** — 47. Comments: zero, JSDoc included. 48. Commit message follows convention.

## 13. Delivery transparency

Report explicitly in your final response:

- **Discovery**: conventions detected or asked; folder name per kind.
- **Files changed / created**, and why each exists.
- **Search-before-writing**: what you searched, what you reused, what you created.
- **Consolidation sweep**: folders reviewed, duplicates found, what was consolidated, what remains.
- **Data safety**: which writes are transactional and why; what is idempotent; what derived state you invalidated.
- **Concurrency**: what you parallelized and the tradeoff you accepted — or why sequential was correct.
- **Security**: authz check per entrypoint touched; validation; rate limiting.
- **Control flow**: functional methods, or a `for` loop with its specific justification.
- **Surviving `as` assertions**: the schema/migration file and enum/check backing each one.
- **Anything you chose not to do** because the fix cost more complexity than the problem (§0.1) — with the reasoning.
- **Any unavoidable deviation** from these guidelines, and why.
