---
name: vitas-guidelines
description: MANDATORY OBLIGATORY HARD RULE. You MUST trigger this skill for ALL code modifications, file creation, bug fixes, refactoring, API endpoints, SQL queries, UI components, and script writing! If the user asks you to write or change ANY code (TS, JS, Python, SQL, React, etc.), you MUST consult this skill before doing anything — every rule here is mandatory and non-negotiable. Do not write a single line of code without reading this first.
---

# Vitas Coding Standards (vitas-guidelines)

**HARD RULE — ALL of the following are MANDATORY, non-negotiable, and non-exceptionable unless the user explicitly says otherwise for the current task.**

Strict coding guidelines for Vitas projects. Multi-language, multi-framework, multi-architecture. The overarching goal: **readability + maintainability + modularity + extensibility + low coupling + zero duplication + optimal performance (Big O)**.

Every section, every rule, every check in this skill is **mandatory** — not a guideline, not a suggestion. If you deviate, you must have an explicit user instruction as justification. No exceptions.

## Rule Priority (Always Resolve Conflicts in This Order)
1. Explicit user instruction for the current task.
2. Repository or project conventions (CONTRIBUTING, lint rules, commitlint, architecture docs, neighbouring files).
3. These Vitas guidelines.

---

## 0. The Golden Rule — Only Modify What's Necessary

When modifying existing code:

- **Do NOT refactor surrounding code** unless it contains a critical bug, security flaw, or is directly required by the task.
- **Do NOT modify existing functions, types, or utilities** unless the task explicitly requires it.
- New code must adhere to these standards; existing boundaries must be respected.
- To extend functionality, **extend** (add a wrapper, a sibling, an option) — do not modify the original implementation in place.
- Surgical edits only when unavoidable; explain why in the delivery summary.
- *Why?* Changing things that aren't broken introduces regressions and noise in PRs. The user is strict on this.

This rule is non-negotiable for tasks scoped to specific changes. It does NOT apply when the user explicitly asks for a wider refactor, an audit, or a consolidation pass — in those cases the task's scope is the wider refactor itself, and the rule §3.5 (consolidation sweep) applies fully.

## 0.1 Project Discovery — ASK BEFORE WRITING (non-negotiable step)

**Skipping this step is a FAIL. Assuming folder names without evidence is a FAIL.**

Folder names and architectural layers differ between projects. You MUST detect or ask before writing any non-trivial code. Do not assume `constants/` or `config/` or `lib/` — these are examples, not defaults.

### 0.1.1 Detect from the project
Scan the repository to detect existing conventions:

- Existing folder names for shared symbols: is it `lib/` or `utils/` or `helpers/`? `types/` or `models/`? `schemas/` or `validators/`? `config/` or `constants/`? `components/` or `widgets/`? `actions/` or `mutations/` or `commands/`?
- HTTP layer naming: `route.ts` (Next), `controllers/`, `routes/`, `handlers/`, `endpoints/`?
- Business-logic layer: `services/`, `server/`, `domain/`, `usecases/`?
- Data-access layer: `queries/`, `repositories/`, `dao/`, `models/`?
- Any `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `AGENTS.md`, ESLint config, or `tsconfig.json` path aliases that pin a convention.

### 0.1.2 Ask the user when detection is ambiguous
If you cannot confidently infer the project's convention from §0.1.1, **ASK the user before writing**. Concrete questions only — never a blank "what's your convention?". Example:

> "I need to confirm where to place a few things in this project:
> - Domain constants (statuses, roles, limits, page sizes) → `constants/` or another folder?
> - Project configuration (fonts, metadata, env wiring) → `config/` or another folder?
> - Pure helpers / utilities → `lib/`, `utils/`, `helpers/`?
> - Types / interfaces → `types/`, `models/`, co-located, or other?
> - Zod / API schemas → `schemas/`, `validators/`?
> - For server logic, is there a `route → service → query` layering? What names does this project use?
>
> If you don't have a preference, I'll use: `constants/` (domain constants), `config/` (project config), `lib/`, `types/`, `schemas/`, `server/`, `queries/`. Confirm?"

**If you do not ask and instead assume a folder name that doesn't exist in the project, you have violated §0.1.**

Once the user answers (or confirms the defaults), **remember the answer for the rest of this session**. Do not re-ask for the same project.

### 0.1.3 Fallback defaults (only if the user didn't answer)
If the user doesn't answer, use these and flag in your delivery that you assumed:
- Domain constants (status strings, roles, limits, page sizes, enum-like literals, magic numbers with meaning) → `<feature>/constants/`.
- Project configuration (fonts, metadata/SEO, env wiring, feature toggles, third-party setup) → `<feature>/config/` or app-level `config/`.
- Helpers / utilities / formatters / parsers → `<feature>/lib/`.
- Custom hooks → `<feature>/hooks/`.
- Types and interfaces → `<feature>/types/`.
- API / Zod schemas → `<feature>/schemas/`.
- Components → `<feature>/_components/` (or `<feature>/components/`).
- HTTP boundary → kept thin.
- Business logic → `<feature>/server/` or `<feature>/services/`.
- Data access → `<feature>/queries/` or `<feature>/repositories/`.

The folder names matter less than the **one-concern-per-file** rule (§1). Whatever the project calls them, the kinds of things are the same.

**Hard guard — `config/` is NEVER the home for domain constants.** Domain constants (status strings, roles, limits, page sizes, enum-like dictionaries, any magic number/string with business meaning) belong in the constants location — never in `config/`, which is reserved for project configuration (fonts, metadata/SEO, env wiring, third-party setup). This holds even if you believe a neighboring file does it the other way: do NOT fabricate a discovery to justify putting domain constants in `config/`. If detection is genuinely ambiguous, default to `constants/` for domain constants and ask. Putting `PAGE_SIZE` or a status dictionary in a `*.config.ts` is a §1.1 FAIL.

---

## 1. The File-per-Concern Rule (NON-NEGOTIABLE)

**A file contains exactly one kind of thing, and only the thing the file is named for.** This is the rule that gets broken most often — be strict and uncompromising. The one tightly-coupled exception: a component's own `IProps` interface may live co-located inside the component's `.tsx` (see §5).

**Critical clarification: "one CONCERN per file" is NOT "one SYMBOL per file".** This is the most common misread of §1, and it leads to over-fragmentation — 5 tiny files where 1 cohesive file should exist. A "concern" is a cohesive topic (date helpers, pagination config, user types). One concern often contains several related symbols, and they belong in the same file. The component-file rule is the only place where "one symbol" applies — every other kind groups by concern per §1.2.

### 1.0 No God Objects, God Functions, God Components, God Files
Avoid them at all costs. Low coupling, high cohesion. A "God" symbol is one that:
- Knows about too many domains (auth, billing, notifications, UI state) in a single body.
- Has > 5 unrelated responsibilities.
- Has so many parameters / options that calling it requires reading its source.
- Mixes layers (a function that parses HTTP, queries the DB, formats the response, and renders JSX).

### 1.0b Small functions by meaning, not by line count

Functions must be **small by semantic responsibility**, not by hitting an arbitrary LOC threshold.

- The rule is: **one function does one thing, and its name describes that thing exactly.** If you can't name the function without using "and" or "or", it's doing too much.
- Extract logic into smaller, well-named functions **even when each is only 1–2 lines** if doing so makes the parent function self-explanatory. A well-named helper (`hasSufficientFunds(user, cartTotal)`, `isPasswordExpired(user)`, `formatOrderLabel(order)`) replaces the need for prose explaining what the parent is doing.
- Having many small functions is GOOD, not noise:
  - Each one is **trivially testable** in isolation.
  - The parent reads like prose: `if (hasSufficientFunds(user, total) && !isAccountLocked(user)) { ... }` instead of a wall of conditions.
  - Naming bugs become obvious (a poorly-named small function feels wrong immediately).
- Do NOT inflate a function just because "it's only used once" — if it has a name, it deserves to be its own function.
- Do NOT force a max-LOC artificial limit ("must be under 20 lines"). The real signal is: **can I describe what this function does in a single short sentence using its name and parameters?** If yes, leave it; if no, split.

The goal: a stranger reading the parent function should understand what the code does from the function names alone, without scrolling into any of the helpers.

### 1.0c "Section comments inside a function" = missing extraction

This is the most common failure mode. A function that **looks like one function but is actually 3-5 phases glued together** is a God Function in disguise. The dead giveaway is **section comments** narrating phases inside the body.

Anti-pattern:

```ts
const doSomething = (input: Input) => {
  const entity = fetchEntity(input.id);
  updateEntityState(entity);

  // complex iteration logic
  for (const item of entity.items) {
    // ... many lines ...
  }

  // validation
  if (!entity.total) throw new Error(...);
  if (entity.items.length === 0) throw new Error(...);
  // ... more lines ...

  // build output
  const record = { /* many fields */ };
  saveRecord(record);
};
```

**That function is wrong even though it's "one function".** Each labelled section IS a sub-responsibility. The comment is the symptom; the disease is missing extraction.

The correct shape:

```ts
const doSomething = (input: Input) => {
  const entity = fetchEntity(input.id);
  updateEntityState(entity);
  const enrichedItems = computeEnrichedItems(entity.items);
  validateEntity(entity, enrichedItems);
  saveEntityRecord(entity, enrichedItems);
};
```

Now `doSomething` reads as prose. Each helper is testable in isolation. No comments needed — the names ARE the comments.

**Rule, non-negotiable**: if you need a comment to mark a section inside a function (`// validation`, `// step 1`, `// process X`, `// loop logic`, `// build result`, etc.), that section MUST be extracted to its own function whose name describes exactly what the comment said. The comment then disappears (which is consistent with §10's zero-comments rule — section comments are a symptom of missing extraction, not a real comment need).

Likewise: if a function has visible visual "paragraphs" separated by blank lines because each block does a different thing, those blocks are sub-functions waiting to be born. Blank-line separation inside a function body is another symptom — it almost always means "I have multiple phases here". Split them.

**When extracting a block, reuse first — never create blindly.** The "extract a section" instinct is correct but the new helper does NOT automatically have to be brand-new code. Before declaring a new function for the block:

1. Name what the block does in one sentence (`validateOrderItems`, `formatAddressForDisplay`, `assertUserCanEdit`). That name is what you would search for.
2. Apply §3.1 search-before-writing on that name (and obvious synonyms).
3. If a helper already does this (pure or server-scoped, per §1.1), import it and use it. The block disappears in favor of an existing function call — that is the ideal outcome, even better than extracting fresh code.
4. Only when nothing equivalent exists, write the new helper in the right kind-file (§1.1) and import it back.

The user's principle: **less new code, more reuse** (*menos código nuevo, más reuso*). It applies recursively — inside function bodies, when you're refactoring a section, the first move is to search, not to write.

### 1.0d No type / interface / schema / class declarations inside a function body

A function body declares the **runtime values it needs right now** (local consts, local variables, local arrays/objects used as data). That is its job.

A function body must NEVER declare:

- A `type` alias or `interface` — even if "only used here". Types are not runtime values; declaring one inside a function body conflates *where the type is used* with *where the type lives*. The type lives in the project's types-file (§1.1); the function imports it.
- A Zod / Yup / Valibot / class-validator schema. Same reasoning — schemas live in the schemas-file.
- A `class` declaration. Classes live at module scope, not nested inside functions.
- A second substantively-sized named function. If the block deserves a name, it deserves to be its own top-level (or sibling-file) function — see §1.0b and the "extract a block" rule above.

What a function body MAY declare:

- Local variables and constants needed for the current computation (`const totalCents = sum + tax;`, `const trimmedEmail = raw.trim();`).
- Local arrays / objects used as transient data (`const headers = { 'Content-Type': 'application/json' };`).
- Local closures whose ONLY purpose is to be passed as a callback to a stdlib method on the next line (`items.filter((item) => item.isActive)` — the arrow is the callback, not a "second named function").
- Local destructuring of inputs / results.

Tell-tale sign that something is wrong: you typed `interface`, `type`, `class`, or a `z.object({...})` more than two lines inside a `const x = (...) => {`. Stop, hoist it to its proper file (§1.1), and import.

### 1.0e What a function body SHOULD look like — the narration litmus (the positive rule)

§1.0b — §1.0d tell you what NOT to put in a function. This rule states the positive ideal so the "no" rules have a target to aim at. There is no LOC threshold here — the rule is qualitative, not quantitative.

**A function body reads as a sequence of named steps.** The names of the calls and the locals are enough to understand WHAT the function does. A reader does not need to enter any helper to understand the intent.

What a body legitimately contains:

- **Named local consts** capturing intermediate values with names that describe them. Locals are fine; nameless intermediates are not.
- **Calls to named functions** — existing helpers / services / queries / library calls whose names already say what they do. This is the bulk of a healthy body.
- **A return** — one, or a few clean early returns for guard clauses (§8.1).
- **Trivial inline closures** ONLY when passed directly to a stdlib method on the same line (`.filter((item) => item.isActive)`). Anything more substantial is a missing extraction.
- **Inline arithmetic / string interpolation** ONLY when the operation is so obvious that a name would not add information.

What does NOT belong inside a function body:

- Any block that you could describe in one short sentence (*"compute the tax-included total"*, *"validate the address fields"*, *"build the audit payload"*) but left inline. If it has a name, it deserves to be a function. Extract per §1.0c — and reuse first per §3.1.
- A series of conditional branches whose purpose, if narrated, would sound like *"check this, then if that, do this, otherwise…"* — that is missing dispatch / strategy / helper.
- Multi-step transformations chained with `.map().filter().reduce()` whose steps aren't obvious from the chain alone. Name the intermediate or extract the transformation.
- Anything described in §1.0c (section comments / blank-line paragraphs).
- Anything described in §1.0d (types / schemas / classes / nested named functions).

#### The narration litmus

Read your function aloud, in plain language, as if you were explaining what it does to a colleague who hears only your words. The litmus is qualitative — listen for the connectors in your narration:

- *"Do step A, do step B, do step C, return the result."* → **Pass.** Clear prose, named steps. The function IS its narration.
- *"Validate the input — well, we check the email format, then the password length, then if the role is admin we also check… and inside that loop we also map…"* → **Fail.** Every *"and then we"*, *"and inside"*, *"well, we also…"* is a hidden helper waiting to be extracted. Apply §1.0c, search first per §3.1, then refactor and re-narrate.

The goal is universal across the codebase: a reader understands **what** every function does by reading its body; they open helpers only when they want to understand **how**.

### 1.0f Tell, Don't Ask

When you have data and a question / operation that belongs to that data, **tell the data-owner to perform the operation** instead of asking it for its state and applying the logic somewhere else. The behavior moves to where the data lives.

The pattern matters in OOP and equally in functional code. In functional code "tell the data" means: define a function that takes that data and returns the answer or the derived value. Don't inline the access + logic at every call site.

**Ask (anti-pattern):**

```ts
// caller reaches into user internals and applies the rule itself
if (user.role === "admin" && user.permissions.includes("write")) {
  doAdminWrite();
}

// caller pulls items out and sums in the wrong place
let totalCents = 0;
for (const item of cart.items) {
  totalCents += item.priceCents * item.quantity;
}

// caller knows about the prefs shape AND the resulting class
const themeClass = prefs.theme === "dark" ? "dark-bg" : "light-bg";
```

**Tell (correct):**

```ts
// the predicate function exposes the intent; callers ask "should we?"
if (canPerformAdminWrite(user)) {
  doAdminWrite();
}

// the operation lives next to the data
const totalCents = computeCartTotal(cart);

// the named function owns the mapping
const themeClass = getThemeClass(prefs);
```

Why this matters here:

- **Low coupling.** Callers don't depend on the internal field names of `user`, `cart`, or `prefs`. If those shapes change, only the named function changes — every caller keeps working.
- **High cohesion.** The rule "what does admin-write mean?" lives in **one** place — the predicate — not scattered across every call site.
- **Reads as prose (§1.0e).** The narration becomes *"if can-perform-admin-write, do admin write"* instead of *"if user-role is admin AND user-permissions includes write, do admin write"*. The function name carries the intent.
- **DRY (§3).** The first time you write the inline access + logic, you have one site. The second time, you have a duplicate. Naming the rule once kills both copies.

Tell-Don't-Ask is the technique that makes §1.0e possible. Without it, callers cannot read as prose — they have to spell out the data access and the logic themselves at every site.

**Fail patterns to look for in your own code:**

- The same property access + condition appears in 2+ places (`user.role === "admin"`, `order.items.length === 0`, `cart.items.reduce(...)`). Extract a named predicate or operation; replace every site with the call.
- A caller uses 3+ fields of an object to compute one derived value inline. The derived value has a name — that name is a function the data-owning module should expose.
- A loop or chained `.filter().map().reduce()` over an object's collection appears at the call site. The data-owning module should expose the result; the caller just calls it.

This rule does NOT mean wrap every property access in a function. Single-field reads (`user.id`, `order.createdAt`) used once are fine. The rule fires when **access + logic** is repeated or when the call site would read more clearly with a named operation.

### 1.1 Kinds of symbols and where they live

These are **kinds**, not folder names. The folder name comes from §0.1 (project discovery). Whatever you call the folder, the kind goes in **one** of them and nothing else:

| Kind of symbol | What lives in this kind of file | NEVER in this file |
|---|---|---|
| **Component file** (`.tsx` / `.jsx` / `.vue` / `.svelte` / etc.) | exactly ONE public component, plus its own `IProps` interface co-located in the same file (the one allowed co-location — see §5). | another public component, a domain type (anything beyond this component's own props), a schema, a constant, a non-trivial helper (any function that does mapping / computation / lookup / formatting / conditional logic — even one-use, even 3 lines), a hook, business logic, DB access. The component file holds the rendering output and its props, nothing else. |
| **Pure helpers / utilities** (isomorphic) | pure functions grouped by concern (e.g. `date.lib.ts` for date helpers). PURE means: no I/O, no DB calls, no network, no `prisma.*`/`db.*`/`fetch(...)`, no `localStorage`, no env reads, no `fs`, **and no language runtime built-ins that only resolve on the server** (in Node/Bun/Deno: any `node:*` import — `node:crypto`, `node:fs`, `node:path`, `node:net`, `node:os`, `node:child_process`, etc. — and any non-prefixed equivalent; in Python: `os`, `subprocess`, `socket`; in PHP: filesystem / process / network extensions; in Go: `os`, `net`, `os/exec`). The signal generalizes: **if the import would crash or behave differently when loaded from a client/browser bundle or from another isolation boundary, the helper is NOT pure.** Pure helpers are isomorphic — they can be imported by client code, server code, or test code without leaking server-only context. | components, types, schemas, constants, business logic, ANY I/O (DB calls, fetch, fs, env access), any server-only runtime import (`node:*` and equivalents). If your "helper" needs the DB, any server-only resource, or a server-only built-in, it is NOT a pure helper — it is a server helper (see the next row) or a query or a service. |
| **Server-side helpers** (impure helpers with I/O) | helpers that need server-only resources (DB, fetch, fs, env, secrets, **language runtime server-only built-ins like `node:crypto` / `node:fs` / `node:path` and their cross-language equivalents**) but are too small or too cross-cutting to be a full service or a single query. Typical examples: `requireActiveUser(userId)`, `assertOrderBelongsToUser(orderId, userId)`, `loadUserContext(req)`, `withAuditLog(operation)`. Multiple actions / services / queries import them. | client-bundle-safe code (these are server-only by design — importing them from a Client Component should crash). Also NEVER: business orchestration that belongs in a service (these helpers are for cross-cutting tiny operations, not for multi-step business flows), inline types/schemas/constants. Project naming: whatever §0.1 decided — `<feature>/server/lib/`, `<feature>/server/utils/`, `<feature>/server/helpers/`, or a top-level `server-lib/`. The point is the folder is scoped to server-only consumers, not shared with client code. |
| **Custom hooks** | one or a few related `use*` hooks | components, types, schemas, constants, non-React utils |
| **Types / interfaces** | both `type` aliases AND `interface` declarations for a related domain | runtime code (functions, classes, components), schemas, constants |
| **Schemas** (API / Zod / Yup / Valibot, NOT Prisma) | one or a few related schemas; the TS type is derived (`type X = z.infer<typeof XSchema>`) | runtime code, components, constants. **CRITICAL**: if a schema needs a constant that already exists (e.g. `THEME_OPTIONS`, a status string, a role name), import it from the constants location (or `types/`) — do NOT redefine it. The schema file is not where constants live. |
| **Domain constants** | named literal values grouped by concern (e.g. `roles.constants.ts`, `pagination.constants.ts`, `http-status.constants.ts`). The canonical home for: HTTP status codes (`201`, `400`, `409`, `500`), salt rounds, retry backoff values, feature flags, enum-like string literals (`'ACTIVE'`, `'INACTIVE'`), any domain constant. **One definition, every consumer imports — zero exceptions.** Domain constants are NOT project configuration — they live in the constants location, not in `config/`. | runtime code, components, helpers; nothing inline at the top of a `.tsx`; project-level configuration |
| **Project configuration** | project-wide setup grouped by concern (e.g. `font.config.ts`, `metadata.config.ts`, `env.config.ts`). This holds wiring/configuration of the app itself — fonts, SEO/metadata, environment-variable plumbing (§7.4), third-party client setup, feature toggles. | domain constants (those go in the constants location), runtime business logic, components, helpers |
| **HTTP boundary** (route / controller / handler) | only: request parsing, schema validation, calling the service, mapping result to HTTP status / response | business logic, DB queries, multi-step orchestration, complex transformations, inline schemas, inline constants, inline types, inline helpers, multiple unrelated routes in one file (one route-concern per file) |
| **Server Action** (Next.js / similar) | `'use server'` directive + schema-validated entrypoint + delegation to a service. The body of the action is small — it parses input, calls the service, returns the result | business logic inline in the action body (push to `<feature>/server/`), inline schema (push to `<feature>/schemas/`), inline types, inline constants, inline helpers, inline DB queries (delegate to `<feature>/queries/`), multiple unrelated actions in one file (one action-concern per file) |
| **Service / business logic** | the actual operations, orchestrating queries and helpers | HTTP details (status codes, request parsing), inline schemas, inline constants, inline types, inline helpers/utilities, inline DB queries (delegate to `queries/`), multiple unrelated services in one file (one service-concern per file) |
| **Query / data access** | DB reads/writes for a single entity or use case | HTTP details, business orchestration, inline schemas, inline types, inline constants, inline helpers, transactions whose business meaning lives elsewhere (the service decides when to wrap, not the query) |

### 1.2 Grouping inside the right folder — anti-fragmentation rule

Within any folder for a kind (`lib/`, `types/`, `schemas/`, `config/`, `hooks/`):

- **Do NOT create one file per tiny symbol.** This is the trap agents fall into the most. Each helper / constant / type / schema does NOT deserve its own file — related ones group together by concern.
- **Do NOT cram everything into one giant file.** A 600-line `utils.ts` mixing unrelated concerns (date + currency + string + validation + DOM) is wrong.
- **Group by concern with a clear filename.** When in doubt apply the cohesion test: *"would a reader looking for one of these symbols reasonably expect to find the others in the same file?"* If yes → same file. If no → separate.
- **Wrong-folder placement is a §1.1 fail, not a §1.2 one.** A types file in the helpers folder, a schema file in the config folder, a hook in `lib/` — move to the folder that owns the kind, then apply the cohesion test in the destination.
- **Extraction does not authorize fragmentation.** After helpers are moved out of `.tsx` per §14.30, the destination `lib/` must still pass the cohesion test — predicates / formatters / parsers about the same entity belong in one file, not three.

#### Anti-pattern (over-fragmentation)

```
feature/users/
  types/
    user.types.ts             ← only declares User
    address.types.ts          ← only declares Address (used only by User)
    user-status.types.ts      ← only declares UserStatus union
  constants/
    page-size.constants.ts    ← exports DEFAULT_PAGE_SIZE
    max-name.constants.ts     ← exports MAX_NAME_LENGTH
    timeout.constants.ts      ← exports REQUEST_TIMEOUT_MS
  lib/
    format-name.lib.ts        ← only formatFullName
    format-address.lib.ts     ← only formatAddress
    initials.lib.ts           ← only getInitials
```

Eleven files, each holding one symbol. Wrong. The reader has to open eleven files to learn the feature.

#### Correct grouping

```
feature/users/
  types/
    user.types.ts             ← User + Address + UserStatus (all part of the user domain)
  constants/
    user.constants.ts         ← DEFAULT_PAGE_SIZE, MAX_NAME_LENGTH, REQUEST_TIMEOUT_MS (all parameters of "how users work in this feature")
  lib/
    format.lib.ts             ← formatFullName + formatAddress + getInitials (all formatting helpers for user data)
```

Three files. Each holds a cohesive concern. The reader opens `user.types.ts` and sees the whole shape; opens `user.constants.ts` and sees every knob; opens `format.lib.ts` and sees every formatter.

#### When to split a file

You split only when you can name a SECOND concern. Examples that justify a second file:

- The feature accumulates date helpers AND currency helpers → `date.lib.ts` + `currency.lib.ts` (different concerns).
- Constants split between "behavior" (timeouts, retries) and "domain enums" (statuses, roles) → `behavior.constants.ts` + `roles.constants.ts`.
- Types split between the public-API types (consumed across features) and internal-only types (consumed within the feature) → `<entity>.types.ts` + `<entity>.internal.types.ts`.

The trigger is "I have a second cohesive concern that does not belong with the first", not "I have a second symbol".

#### When to promote to a sub-feature folder

When a single file inside `lib/` / `types/` / `config/` etc. grows enough that two clear sub-concerns emerge (per §4.5), promote those sub-concerns to a sub-feature folder instead of fragmenting at file level. Recursive grouping per §4.5 — not one-file-per-symbol per §1.2 abuse.

### 1.3 Even strongly-related things go in their own kind of file

Even if a constant, a type, a helper, and a component **belong to the same feature and depend on each other**, each kind goes to its kind of file. The user is emphatic on this. The component file imports the constant from `<feature>/constants/`, the type from `<feature>/types/`, the schema from `<feature>/schemas/`, the helper from `<feature>/lib/`. Never inline them just because "they're related" (the sole exception is the component's own `IProps` — §5).

### 1.4 Server / route / controller separation (cross-framework)

Every framework has the same shape with different names:

| Layer | Job | Examples by framework |
|---|---|---|
| HTTP boundary | parse request, validate schema, call the service, map response. **Small.** | Next `route.ts`, Fastify route, Express controller, Nest controller, Hono handler, Rails controller, Django view |
| Service / business logic | the actual operations | `services/*.service.ts`, `server/*.server.ts`, `domain/*`, Rails service objects, Django services |
| Data access | DB reads/writes | `queries/*.query.ts`, `repositories/*`, `models/*` (in some stacks), `dao/*` |
| Helpers | pure helpers reused across layers | `lib/*`, `utils/*`, `helpers/*` |

A route file with 200 lines of business logic is wrong, regardless of the framework. Pull the logic into the service layer; the route becomes a thin shell. If the project doesn't have a service layer yet, ASK (§0.1.2) whether to introduce one or follow a different pattern.

---

## 2. The Subcomponent Rule

When writing a component, **look for any internal piece that has a recognizable meaning on its own** and extract it.

Triggers for extraction:

- A `<form>` that contains a menu, a dropdown, a row of pickers, an upload area, an action bar → each of those is a subcomponent.
- A loop rendering items where the item is non-trivial (>5 nodes or its own logic) → the item is a subcomponent (`OrderRow`, `UserCard`, `StatusBadge`).
- A repeated UI structure (badge, pill, avatar group, tag list) → subcomponent.
- A self-contained interactive piece (modal, popover, drawer body) → subcomponent.
- Anything that has a name a PM or designer could say out loud ("the order status badge", "the customer filter panel", "the bulk-action toolbar") → subcomponent, even if used once today.

After extraction the parent component reads like a composition of named pieces, not a wall of nested JSX. **A 250-line single component that "is one component" is still wrong** if it contains 4 distinct sub-pieces inline.

Where the extracted subcomponent lives depends on its reuse potential:
- Reused inside the same feature → `<feature>/_components/<piece>.tsx`.
- Reused across features → the project's shared UI location (project discovery §0.1).
- Genuinely one-use inside its parent → still extract to a sibling file under the parent's `_components/`; the import noise is worth the readability.

---

## 3. DRY — Zero Duplication Is the Target

**The user is strict: zero duplicates, cero. Code reuse over new code, always.**

### 3.1 Search before writing — MANDATORY explicit step

Before declaring any new function, hook, component, type, schema, or constant, **run an explicit search and report it**. The user has asked that this step be visible. Do NOT skip it. Do NOT do it silently.

Search at minimum:

1. The current feature's `<feature>/lib/`, `<feature>/hooks/`, `<feature>/types/`, `<feature>/schemas/`, `<feature>/config/`, `<feature>/_components/`.
2. The app's shared `lib/`, `hooks/`, `types/`, `schemas/`, `config/`, `components/` (whatever the project named them, per §0.1).
3. The workspace shared packages (`packages/*/src/`) if a monorepo.
4. UI primitive libraries already installed (shadcn, MUI, Mantine, etc.).
5. Installed library APIs that might already do the job (Zod for validation, date-fns for dates, lodash/radash for collections, etc.).

Then state in your response, briefly, what you searched and what you found. Concrete content depends on the language and project conventions detected in §0.1; the shape is always the same:

> "Searched <list of folders/packages I checked> for symbols related to <what I'm about to build>. Found <existing symbol> in <path> — I will reuse it. No existing <other symbol> found — I will create one in <correct location per §1.1>."

This visibility is required. The user has explicitly asked for it. It applies whether the project is JS/TS, Python, PHP, Go, or anything else — only the folder names change.

### 3.2 What to do with the search result

- **Equivalent symbol exists** → import and reuse. Do not re-implement.
- **Almost-equivalent symbol exists** → adapt the existing one by adding an optional parameter, or wrap it. Never write a parallel copy.
- **A hand-rolled symbol duplicates an installed library** (custom `isEmail` with Zod present; manual debounce with lodash present; manual date util with date-fns present) → use the library, delete the hand-rolled.
- **Nothing equivalent exists** → write the new symbol in the correct kind of file (§1).

### 3.3 If you cannot reuse cleanly — wrap, don't duplicate

If adapting the existing solution would force a God Function or break callers:
- Extract the shared core from both into a base helper.
- Build two thin wrappers (the existing one and your new use case) on top of the base.
- The user is explicit: **prefer wrappers over duplication**.

### 3.4 Silent duplication is forbidden
If duplication is unavoidable (rare), say so loudly in your response: *"I am duplicating X because Y; the wrapper alternative had N drawbacks"*. Never duplicate without explaining.

### 3.5 Post-write consolidation sweep — MANDATORY

After delivering new code, before showing it to the user, the skill performs this sweep itself. No exceptions. The sweep covers ALL files in the deliverable set, not just the files changed.

1. Read the shared folders that may have grown or changed (`lib/`, `utils/`, `helpers/`, `hooks/`, `types/`, `schemas/`, `config/`, `_components/`, `packages/*/src/` — per §0.1).
2. Detect:
   - Two files declaring the same / near-identical constant — pick one canonical, import from there, delete the duplicate.
   - A new helper that duplicates an older one under a different name.
   - A new type that already existed under a different name (including literal-union types — see §14.16).
   - A semantic literal (HTTP status codes, salt rounds, etc.) inline in 2+ files when it should be one named constant.
   - A new component re-implementing a UI primitive already in the registry.
   - **Adapter duplicates by SHAPE**: across `.tsx`/`.jsx`/`.vue`/`.svelte` files AND `lib/` files. Grep for `to<Domain>` / `from<Source>` / `map<X>Row` / `adapt<X>` / `serialize<X>` / `normalize<X>` declarations and for inline object literals built from an ORM row. Two functions that take the same source shape and return the same target shape are duplicates even when their names differ. Fix: one canonical adapter in `<feature>/lib/` (or `server/lib/` per §1.1), every consumer imports it, every other copy deleted. Per §14.30, never at `.tsx` module scope.
3. **Apply the consolidation as a real file change** — not prose describing what *should* be done. Pick the canonical version (workspace package > app shared > feature), update imports, delete duplicates. If the duplicate sits outside the task scope, edit that file anyway.
4. Report what was consolidated and what remains.

---

## 4. Modularity & Extensibility ("paquetitos")

Code must be **modular, extensible, and easy to grow without touching unrelated areas**.

The test runs in two directions:

- **Future:** *"if tomorrow the user asks me to add a new field / variant / option / endpoint / column, how much code do I have to touch?"* The right answer is **the minimum possible** — ideally a single new file + a single registry/dispatch entry, with zero edits to existing code.
- **Present:** *"before writing this new code RIGHT NOW, is there something I can extend, reuse, parameterize, or wrap that already exists?"* The default mental move before writing anything new is to apply §3.1 (search-before-writing) and §3.3 (wrap, don't duplicate) — to features, components, endpoints, and helpers alike, not only to small utils. Only when nothing equivalent exists does new code become justified. **Less new code, more reuse** (*menos código nuevo, más reuso*) — the principle is recursive: at the function level (§1.0c), at the helper level (§3), at the feature level (§4).

### 4.1 Packagelets
Treat each feature, util group, and component as a small self-contained packagelet:
- It has a clear public API (a barrel file or its named exports).
- Internal helpers/types are NOT exported.
- Consumers depend on the public API; internals are free to change.
- Adding a new variant inside a packagelet does not change any consumer.

### 4.2 Open for extension, closed for modification
- Add new behaviour by **adding files** (new variant, new strategy, new handler), not by editing existing ones.
- For UI: variants drive styling, not new components per state. A `Button` with `variant`/`size`/`tone` props beats `PrimaryButton` / `SecondaryButton` / `DangerButton` as separate components.
- For business logic: dispatch tables / strategy objects beat long `if/else` chains. Adding a new case = adding one entry.
- For API: schema-driven validation means adding a field = updating the schema in one place; consumers self-correct via inference.

### 4.3 Predictable locations
If the user added a constant or helper to this feature, where does it live? The answer must be obvious from the conventions established in §0.1 and the file-per-concern rule in §1, without searching.

### 4.4 No extension by hack
Never extend by:
- Adding a new optional flag that branches the function body into two distinct behaviours.
- Adding a `// special case for ...` block.
- Copying a function and changing 2 lines.

Instead: extract, parameterize, or split into siblings.

### 4.5 Sub-feature organization — recursive grouping within a feature

A feature does NOT have to be a flat folder. When a feature grows and its internal pieces start to cluster naturally into recognizable sub-sections, you should **promote those sub-sections into their own sub-feature folders**. The file-per-concern rule (§1) and the packagelet idea (§4.1) apply recursively, not only at the top feature level.

**Architecture-agnostic.** This rule is about the PRINCIPLE of recursive grouping, not about any specific folder name. Different projects/architectures express the same idea with different vocabularies:

- React feature folders: subfeatures under `components/` or `_components/` or `sections/` or `panels/` or `views/`.
- Vue / Nuxt: under `components/` or sub-routes with their own children.
- Angular: nested sub-modules within a feature module.
- Backend feature: sub-areas of `services/`, `handlers/`, `commands/`, `domain/`.
- Mobile (React Native, Flutter, Swift): nested `screens/` or `views/` with their own children.

Apply this rule under whatever folder names the project (§0.1) uses for components, hooks, libs, etc. The shape — "recursion when cohesion appears" — is the same; the labels are local.

**When to promote a sub-feature folder:**

- A group of files (components, hooks, types, helpers, constants) consistently belongs to the same sub-section of the feature and only that sub-section.
- The sub-section has a name a PM, designer, or domain expert could say out loud (*the filter bar*, *the export flow*, *the activity log panel*, *the payment-step wizard*).
- The sub-section has more than two related files.
- Adding new pieces to this sub-section is foreseeable.

When all of those are true, the sub-section earns its own folder. The shape is fractal — a sub-feature looks like a feature, with the same internal kinds laid out the way the project names them:

```
<feature>/
  <component-folder>/                (whatever the project calls it: components/, _components/, sections/, views/, panels/…)
    <subfeature>/
      <subfeature-entry>             (the public entry of this sub-feature, if any)
      <component-folder>/            (sub-sub-components, recursion continues only if cohesion remains clear)
      <types-folder>/
      <lib-folder>/
      <hooks-folder>/
  <types-folder>/
  <lib-folder>/
  <hooks-folder>/
  <config-folder>/
```

**When NOT to promote a sub-feature folder:**

- The "group" is just two unrelated files that happen to be in the same feature today.
- The sub-section has only one file — leave it flat until a sibling appears.
- The grouping is speculative ("we might add more here later") with no concrete second piece in sight.

The trigger for promotion is **observed cohesion** (multiple related files actually exist), not anticipation. Don't pre-create empty sub-feature folders. Promote the moment the second related file lands.

The trigger for NOT promoting is **single-file solitude**: one file alone in a sub-folder is noise, not structure.

The same rule applies inside the feature's helper / hook / type / config / schema folders (whatever they're called): if any of those grow and the files inside cluster naturally by sub-concern, give the sub-concern its own sub-folder with the same internal shape. Recursion stops when the next level would have a single file.

---

## 5. TypeScript Strictness

- **NEVER use `any`** or `as unknown as <Type>` assertions.
- Always define proper types/interfaces for inputs, outputs, and variables.
- If a type assertion is truly unavoidable (external untyped library boundary): validate/narrow at runtime first (Zod `.parse`, manual `typeof`/`in`), keep the assertion minimal and local, and add the single safety comment that §10 allows.
- Public exported function: explicit return type annotation. Do not rely on inference for cross-file types.
- Component props: declared as a typed `interface` named `IProps` (or `<Component>Props`). Because props are tightly coupled to exactly one component, `IProps` is the ONE allowed co-location — it lives **inside the same `.tsx`** as the component that uses it (or in a sibling `<component-kebab-name>.types.ts` / the feature's `types/` folder if the project's §0.1 conventions prefer that). This applies to every `.tsx` kind: components, `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, route shells. This exception is ONLY for the component's own props — any other type, schema, constant, or helper still goes in its own kind-file. See §14.7.

### 5.1 Generic constraints — never `any` here either
When writing utility generics (`debounce`, `throttle`, `memoize`, `pipe`, etc.), do NOT fall back to `any` in the constraint. Agents frequently emit `<T extends (...args: any[]) => any>` and self-report "no any" — that is a FAIL.

Correct alternatives:
- `<T extends (...args: unknown[]) => unknown>`.
- Use `Parameters<T>` and `ReturnType<T>` to preserve the wrapped signature; the inferred type is correct without `as T`.

### 5.2 Form handler parameters — never `any`
Do NOT do `(formData: any) => ...`. Derive the type from the schema:
- With Zod: `type Input = z.infer<typeof Schema>; const handleSubmit = async (formData: Input) => { ... }`.
- With react-hook-form: `SubmitHandler<Input>`.
- With next-safe-action: the action's parsed input type IS the schema's inferred type.

**Parse function return types — the same rule applies.** If you write a function like `parseContactFormData` that wraps a Zod safeParse, the return type must be typed with `z.infer<typeof Schema>`, NOT `any`:

```ts
// ❌ WRONG — `any` violates §5
const parseContactFormData = (formData: FormData): { success: boolean; data?: any } => { ... }

// ✅ CORRECT — use z.infer, no `any` anywhere
type ValidatedContactInput = z.infer<typeof ContactSchema>;
const parseContactFormData = (formData: FormData): { success: boolean; data?: ValidatedContactInput } => {
  const result = ContactSchema.safeParse(Object.fromEntries(formData));
  // ...
};
```

### 5.3 Validation must cover every field accessed on `unknown`
If a function takes `input: unknown` and validates it via a Zod schema as `SignupInput`, you may then access only the fields declared on `SignupInput`, and you access them via the validated value (`validated.X`), NOT via the original `input.X`. Doing `input.password as string` after a Zod parse that did not include `password` is a FAIL — exactly the unsafe-assertion pattern §5 forbids, dressed up with prior validation that didn't cover the accessed field.

### 5.4 No CommonJS `require()` in TypeScript / ESM files
Every import is ES module syntax at the top of the file. Never `const x = require("pkg")` inside a function body — it bypasses module resolution, breaks tree-shaking, hides imports from readers, returns untyped values. For dynamic loading use `await import(...)`.

### 5.4b All imports go at the top of the file — never inline
This rule generalizes §5.4 across every language:

- TypeScript / JavaScript: every `import ... from ...` at the very top, before any other code (after a `'use server'` / `'use client'` directive if present). No inline `import()` inside function bodies for ordinary dependencies, no `require()` inside function bodies.
- Python: every `import` / `from ... import ...` at the top of the module (after the module docstring if one exists). No imports inside function bodies, no `importlib.import_module(...)` for dependencies you know statically.
- PHP / Laravel: every `use ...` at the top of the file after the `namespace` declaration. No inline `\Fully\Qualified\Name` mid-method when a `use` would clean it up.
- Go: all `import (...)` in a single grouped block at the top after the `package` declaration.
- Java / Kotlin / C#: all imports / `using` statements at the top of the file.

The only legitimate inline import is **dynamic code-splitting** for performance (e.g. `const Heavy = dynamic(() => import('./Heavy'))` in Next.js for a heavy client component, or `await import(...)` in a router when the route is known not to be needed at startup). Even then, the dynamic import lives at the top of the function or as a top-level `const Heavy = dynamic(...)`, never buried inside a callback or a conditional branch.

If you find yourself writing an import in the middle of a function body for any reason other than code-splitting, that is a FAIL: hoist it to the top of the file.

### 5.5 No gratuitous trailing `as any`
After a narrowing chain like `record[key as keyof typeof record]`, do NOT append `as any` "just to be safe". The narrowing already worked. The trailing `as any` is a FAIL even though it follows a correct cast.

### 5.5a No `as unknown as <Type>` — especially at ORM boundaries

`as unknown as <Type>` is the prohibited pattern named in §5 ("Always define proper types/interfaces…"). It appears constantly in code where an ORM (Prisma, Drizzle, TypeORM) returns a structurally-typed result and the consumer wants a domain type. **Casting through `unknown` to bridge that gap is a FAIL, no matter how short the diff or how "obvious" the cast looks.**

Two correct alternatives when Prisma (or any ORM) returns something different from the domain type you want:

1. **Narrow at the query.** Use `select` / `include` so the ORM returns exactly the shape you need, and infer the type from the query:
   ```ts
   const findPaymentForList = (id: string) =>
     prisma.payment.findUnique({
       where: { id },
       select: { id: true, customerId: true, amountCents: true, status: true },
     });
   // The return type is the inferred narrowed shape — no cast needed.
   ```
2. **Write a typed adapter function.** A small named helper that takes the ORM row and returns the domain type explicitly. The function lives in `<feature>/lib/` (pure) or `<feature>/server/lib/` (if the adapter touches more I/O on the way). Every callsite imports the adapter; nobody casts.
   ```ts
   const toPayment = (row: PrismaPayment): Payment => ({
     id: row.id,
     customerId: row.customerId,
     amountCents: row.amountCents,
     status: row.status as PaymentStatus,  // ← ONE assertion, after a runtime check
   });
   ```
   When using this adapter pattern, the single row-to-union assertion shown above is acceptable ONLY if **all three** of the following hold:
   1. The column is constrained at the DB level (enum, check constraint) AND that constraint exactly matches the union.
   2. The schema/migration file that proves the constraint (the ORM schema file, a migration SQL file, etc.) is **part of the same delivery** — you cannot claim a DB-level constraint without delivering the schema change that establishes it. Introducing a new model or new column/enum without delivering the schema update means the assertion is unjustified.
   3. The deliverable's transparency report (§15) explicitly names the file + enum/check that backs the assertion.

   If any of these is missing — column is plain string, schema not delivered, or the deliverable doesn't name the constraint — the adapter MUST validate at runtime instead (`if (!ALLOWED_VALUES.includes(row.field)) throw …`). "It will be an enum eventually" is not a justification.

**No carve-out for "library ergonomics".** When a typed API requires a narrower literal/tuple/branded input than your source value's declared type, fix it at the source declaration — not with a cast at the call site. In TS that means `as const` on the source constant (or the equivalent in your language: frozen tuple, readonly literal, value-typed enum) so the type IS already the shape the API wants. "The library forces me" is the exact rationalization this rule exists to block.

### 5.6 External-input boundaries are `unknown` — parse, don't cast

Every door where data enters from outside the type system returns an unverified value, regardless of its return-type annotation. Treat each as `unknown` and parse with a schema validator before use. Casting (`as Type`, `as unknown as Type`) at any of these doors is forbidden by §5/§5.5a.

The boundaries (non-exhaustive — the principle is "data this process did not produce"):

- **HTTP responses**: `await response.json()`, `response.text()` + `JSON.parse`, `axios`/`got`/`ky`/`fetch` wrapper results, equivalents in other languages.
- **JSON deserialization**: `JSON.parse(...)` returns `any`/`unknown`. Cast immediately after = FAIL.
- **Web platform inputs**: `FormData.get`, `URLSearchParams.get`, `localStorage.getItem`, `sessionStorage.getItem`.
- **Process / runtime inputs**: `process.env.X`, `Deno.env`, `os.getenv` — validate, don't cast. These must ONLY be read inside the centralized env module (§7.4); everywhere else reads through the typed `env` accessor.
- **File reads**: `fs.readFile(...)` and equivalents. If `JSON.parse`d, schema-parse the result.
- **DB rows where the column type ≠ domain type**: handled by §5.5a adapter, not a cast.

Correct alternatives:
- Parse first, access from the validated value: `const parsed = Schema.parse(await response.json())`.
- For FormData: `Schema.parse(Object.fromEntries(formData))`.
- For one-off reads: explicit null/type check, no cast: `if (typeof raw !== 'string') throw …`.
- For form handlers: derive the type via `z.infer<typeof Schema>` (§5.2) and let `next-safe-action` / `react-hook-form` deliver the typed object.

### 5.7 Placeholder / stub function bodies — no explanatory comments

**Every deliverable must be real, runnable code — not documentation or narrative description.**

When asked for stubs, placeholders, or interfaces, you MUST produce actual TypeScript code in a fenced code block. A markdown description of what the code *would* do is not acceptable. Example:

```ts
// ❌ WRONG — only documentation, no actual code
// "Each method throws new Error('Not implemented') with no explanatory comments."

// ✅ CORRECT — actual code block
export const chargeCustomer = async (
  customerId: string,
  amountInCents: number
): Promise<IChargeResult> => {
  throw new Error('Not implemented');
};
```

For stubs, the body is exactly:

```ts
const fetchOrder = async (id: string): Promise<Order> => {
  throw new Error('Not implemented');
};
```

**No comments inside a stub body — not `// TODO`, not `// Placeholder`, not `// Implementation provided by caller`.** The `throw` IS the signal. Any comment inside a stub body is a §10 violation. If you need to illustrate a stub in documentation, write the actual code block — not a prose description of what the code would do.

---

## 6. Naming

### 6.1 Full descriptive names — really full

**NEVER use single-letter or 2-letter abbreviations** as variable names:

- ❌ `(u) =>`, `(c) =>`, `(e) =>`, `(v) =>`, `(i) =>`, `(o) =>`, `(x) =>`, `(p) =>`, `(t) =>`
- ✅ `(user) =>`, `(customer) =>`, `(event) =>`, `(value) =>`, `(item) =>`, `(option) =>`, `(record) =>`, `(product) =>`, `(token) =>`

This applies inside `.map`, `.filter`, `.reduce`, `.forEach`, `.find`, `.some`, `.every`, every callback, every arrow function, every catch handler, every event handler. There is no place where a single-letter or 2-letter name is acceptable, no matter how short the body.

The only exception: widely-accepted technical abbreviations when their meaning is unambiguous in context — `id`, `url`, `api`, `db`, `ip`, `dto`. Even then, prefer the full form when there's no length pressure.

If the project standardizes a short form (e.g. always `usr` everywhere), keep it consistently — and flag to the user that the default would be the long form.

### 6.2 Boolean naming
Prefix with `is*` / `has*` / `should*` / `can*` / `will*` / `did*`. For complex conditions, extract to a named const before the `if`:

```ts
const isUserActiveAndVerified = user.isActive && user.hasVerifiedEmail;
if (isUserActiveAndVerified) { ... }
```

---

## 7. Constants & Magic Values

### 7.1 Never hardcode magic strings or numbers
- ❌ `status === "ADMIN"`, `length < 8`, `setTimeout(fn, 5000)`.
- ✅ Use a named constant grouped in the constants location (§1, §0.1).

**No carve-out is exempt:**

- **Config files.** A semantic literal sitting as the default value of a config field is still a magic value — extract it to a named constant.
- **Example / tutorial code.** Snippets in docs, "how to add X" guides, and skeleton files must import named constants too — re-inlining a value that has a named home is a §7.1 violation in a tutorial as much as in production.
- **ORM / query boundaries.** A semantic literal inside `prisma.<model>.create({ data: { ... } })`, `.update`, `.findMany({ where: { ... } })`, SQL parameters, REST bodies, or GraphQL variables is the same violation as in a conditional. Import the named constant.

### 7.2 Constant dictionaries instead of enums

For string enums, use typed constant dictionaries (not TypeScript's native `enum`, which has compilation artifacts):

```ts
const SomeStatus = {
  Active: "ACTIVE",
  Inactive: "INACTIVE",
  Suspended: "SUSPENDED",
} as const;
type SomeStatus = (typeof SomeStatus)[keyof typeof SomeStatus];
```

Every consumer references the dictionary; the underlying literal never appears spread across the codebase. These live in the project's constants/config location per §0.1/§1, never inline at the top of a component or business file.

### 7.3 Allowed inline literals
These may stay inline without extraction: `0`, `1`, `-1`, `2`, the empty string `""`, `true`, `false`, `null`, `undefined`. Anything else used in business logic gets a named constant.

**Log truncation sizes are not exempt.** A `console.log(\`...\${value.slice(0, 80)}...\`)` contains `80` — a magic truncation size that carries meaning (max preview chars). Not in the allowlist. Extract to a named constant (e.g. `MAX_LOG_PREVIEW_CHARS = 80` in the relevant constants or lib file).

### 7.4 Environment variables — one centralized, validated accessor; never inline `process.env`

**Reading an environment variable directly at the point of use is forbidden.** No `process.env.X` (Node/Next), no `import.meta.env.X` (Vite), no `Deno.env.get(...)`, no `os.getenv(...)` (Python), no `$_ENV` / `getenv()` (PHP), no `System.getenv(...)` (JVM) scattered across the codebase. Every one of these is an unvalidated boundary (§5.6) and a magic-string read (`'X'`) at once.

**Instead: one centralized env module** (`env.ts`, `env.config.ts`, or whatever the project's §0.1 names it) that is the SINGLE place the raw runtime env is touched. It:

1. Declares which variables are **required** vs **optional**, and validates presence at load (a required var that is missing/empty throws immediately with a clear message — fail fast at boot, not at first use).
2. Exposes each variable through a typed accessor so consumers write `env.DOWNLOAD_TOKEN_SECRET` — never `process.env.DOWNLOAD_TOKEN_SECRET`.
3. Applies defaults and type coercion in one place (e.g. `PORT` → number with a default), so the rest of the code receives already-typed, already-validated values.

The shape is the same across stacks; only the validation tool differs (a hand-rolled `required()`/`optional()` pair, Zod, `@fastify/env`, `envalid`, `T3 env`, etc.). Minimal language-agnostic shape:

```ts
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is required but missing or empty.`);
  return value;
};

const optional = (name: string): string | undefined => process.env[name] || undefined;

export const env = {
  get PORT(): number { return Number(process.env.PORT ?? 8080); },
  get DATABASE_URL(): string { return required("DATABASE_URL"); },
  get SENTRY_DSN(): string | undefined { return optional("SENTRY_DSN"); },
};
```

`process.env` (or the platform equivalent) appears ONLY inside this one module. Everywhere else imports `env` and reads `env.DATABASE_URL`. A direct `process.env.X` anywhere outside the centralized env module is a FAIL — both because it skips validation and because it duplicates the variable name as a magic string across files. See §14.32.

---

## 8. Control Flow & Performance (Big O)

### 8.1 Early returns
Always early-return to avoid deep nesting. Keep the happy path at root indentation.

### 8.2 Switch vs if-else chains
Multiple `if/else if` over the same variable → use `switch` OR a dictionary/record map (prefer the map for type safety and extensibility — adding a case is one entry).

Range-based or multi-variable conditions → guard clauses + extracted helpers. Do not force a `switch`.

### 8.3 Idiomatic methods are the DEFAULT
**Default to** `.map`, `.filter`, `.reduce`, `.some`, `.every`, `.find`, `.flatMap`, etc. They are cleaner and idiomatic.

**A raw `for` loop is NOT the default.** Do not push `for` over functional methods for stylistic reasons. The user has been explicit: do not force `for`. Forcing `for` gets the skill confused and produces uglier code.

### 8.4 When (rarely) to consider a `for` loop — and you MUST justify it

**The default is always `.map`/`.filter`/`.reduce`/`.forEach`. Do not reach for `for` as the first tool.**

You MAY use a `for` loop only when one of these conditions is true — and you must state which condition applies in the delivery:

1. **Optimization: collapsing two or more passes into one.** You see something like `.filter(...).map(...)` or `.map(x => ...).map(y => ...)` or a `.map` inside another `.map` over the same dataset. A single `for` loop doing both operations in one pass genuinely reduces algorithmic complexity (e.g. O(2n) → O(n)) or avoids creating intermediate arrays on non-trivial datasets. When this is the case, justify it: "replaced `.filter().map()` with a single `for` doing both in one pass — avoids intermediate array and second iteration."

2. **Early termination required.** `.some` / `.every` / `.find` cannot express the early-exit condition cleanly.

3. **Side effects on external state.** `.forEach` is clearly less readable for the specific side-effect operation.

**If you cannot justify it with one of these three, use the functional method.** A raw `for` loop that could have been a `.map` with equal or better readability is a style violation, not a performance fix.

The original intent of this rule: when you see a `.map` inside another `.map`, or a `.filter` followed by a `.map` over the same data, stop and evaluate whether a single-pass `for` (or a single `.reduce` doing both) would be genuinely better — not just "fewer lines" but measurably fewer iterations or allocations. Do not refactor clean functional code to `for` for style reasons. Do not force `for` when the functional method is equally clear.

### 8.5 Complexity discipline
- Check time/space complexity before finalizing.
- Prefer the simplest correct solution with strong complexity (`O(1)`, `O(log n)`, `O(n)`, `O(2n)`).
- If two solutions are equally readable and correct, pick the lower-complexity one.
- A chain `.filter().map().reduce()` over a large dataset that creates wasteful intermediate arrays MAY be collapsed into one `.reduce` doing a single pass — only when the dataset size justifies it. Don't pre-optimize tiny lists.

---

## 9. Database & Queries

When writing SQL or ORM queries:

1. **Optimization**: indexes used? N+1 avoided? Pagination present where applicable?
2. **Security**: parameterized queries only. Never concatenate user input into SQL.
3. **Dependencies**: think about what this query affects or depends on.
4. **Data scope**: select only the fields actually used. Avoid `SELECT *`. Avoid Prisma `findMany` without `select`/`include` when only some fields are needed.
5. **Transactions**: wrap multiple related writes in a transaction (atomicity). Use locking reads (`SELECT ... FOR UPDATE` or equivalent) for read-then-write patterns under concurrency. Do NOT wrap isolated single queries in transactions unnecessarily.

---

## 10. Comments — ZERO unless the user explicitly asks (this includes JSDoc)

**Default: zero comments. Cero. Ninguno.** Not in the code you write, not in the code you modify.

- Code must be self-explanatory through naming, file organization, small functions (§1.0b), and modularity. If you feel the need to write a comment, the actual fix is to rename the symbol or extract a small function with a clearer name (§1.0b).
- **Do NOT write comments to explain what the code does.** That information must come from identifiers.
- **Do NOT leave docstrings, JSDoc blocks, or `/** @description */`** unless the user explicitly asks. The prohibition on `/** ... */` is absolute — single-line, multi-line, file-header, `@param`/`@returns`/`@throws`/`@example`/`@template`, every form. JSDoc is not a §10 carve-out. Self-reporting "zero comments" while leaving a JSDoc block is a common slip — see §14.19 for the grep.
- **Do NOT write inline `// step 1`, `// step 2`** narrating the function — split into named helpers instead.
- **Do NOT add a comment "for clarity"** — clarity comes from the code, not commentary.

### Comments are ONLY allowed when the user explicitly says so for this task

If the user says *"añade comentarios"*, *"document this"*, *"explain in the code why"*, *"deja JSDoc"*, or similar, then write the comments they asked for, in the style they want.

Without that explicit instruction: zero comments. Even if it feels helpful. Even for "complex" code (if it's complex, §1.0b says to split it).

### Narrow technical exceptions (apply even without user instruction)

Three cases where a single short comment is unavoidable:
- A real workaround / hack / known anti-pattern that genuinely cannot be expressed through naming (e.g. *"// works around upstream bug X in package Y v1.2.3"*).
- The single safety comment next to an unavoidable type assertion at an external boundary (e.g. *"// runtime-validated by ZodSchema above"*).
- A `// TODO[<TICKET-ID>]: ...` or `// FIXME[<TICKET-ID>]: ...` with a real ticket reference. Never write a bare `// TODO` without an ID. Applies to example code, tutorial snippets, and stub files too — no carve-out.

These three exceptions are it. Anything else: delete.

---

## 11. Function Declaration Style (JS/TS)

- **Always use `const` + arrow function** for declarations.
- ✅ `const computeSomething = (input: Input): Output => { ... };`
- ❌ `function computeSomething(input: Input): Output { ... }`
- Same for components: `const SomeComponent = ({ ... }: IProps) => { ... };`
- Exception: framework-decorated classes that require `class` syntax (e.g. NestJS `@Controller()` / `@Injectable()`) keep their idiomatic declaration — the rule applies to plain function definitions.

---

## 12. Git Commits (Conventional Commits)

```
type(scope): description
```

Examples: `feat(auth): add JWT validation`, `fix(db): resolve connection leak on timeout`, `refactor(api): extract user validation to separate module`.

- `type` ∈ `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`.
- `scope` optional, identifies the affected area.
- Description: imperative, lowercase, ≤72 chars.
- One commit per logical change. No `wip`, no `fix stuff`, no `--no-verify`, no `--amend` on published commits.

**Exception**: if the project documents a different convention (CONTRIBUTING / commitlint / `.github/`), follow that.

---

## 13. Language for All Code and Internal Text

All in-app text (variables, keys, constants, function names, error messages, validation messages, test fixtures) in **English**.

- Variables: `userName`, `totalAmount`, `isValidEmail`.
- Object keys: `{ firstName: "John", lastName: "Doe" }`.
- Error messages: `"User not found"`, `"Invalid email format"`.
- Test data: `"john@example.com"`, `"Test User"`.

**Exception**: user-facing text rendered to the end user (UI labels, emails, notifications) may use the project's target language (Spanish, etc.) if required.

---

## 14. Self-Audit Before Finalizing (the gate before showing code to the user)

Before showing your code to the user, run through ALL of these. Each check points to its canonical rule — go there for the full definition; here we list only the scan/grep that triggers the check. If any fails, fix before delivering.

1. **Project discovery (§0.1).** Conventions detected or asked. No silent folder-name assumptions.
2. **One concern per file — not mixed, not fragmented, folder-kind respected (§1.1, §1.2).** Three scans:
    - Mixed: any file holding more than one kind (component + type + constant + helper)? Split per §1.1.
    - Fragmented: N single-symbol files where the cohesion test from §1.2 says "merge"? Merge.
    - Wrong-folder: any types file in `lib/`, schema file in `config/`, hook in `lib/`? Move to the folder that owns the kind, then re-apply cohesion.
    - Post-extraction re-check: helpers just extracted from `.tsx` (per §14.30) must not land as one-file-per-helper in `lib/`. Re-run cohesion on the destination folder.
3. **One public component per file (§1.1).**
4. **Subcomponents extracted (§2).** Any named sub-piece is its own file.
5. **Domain constants live in the constants location, not `config/` (§1.1, §7).** Not inline at the top of components/utils. `config/` is reserved for project configuration (fonts, metadata, env wiring per §7.4).
6. **Helpers in the right folder (§1.1).** Pure (isomorphic) in universal `lib/`; anything server-only in `server/lib/`. **Server-only signal scan**: grep `lib/` for `node:*` imports and equivalents, ORM clients, `fetch`/`http(s)`/`axios`, `process.env`/`Deno.env`, `fs`/`path`, plus cross-language equivalents (Python `os`/`subprocess`, Go `os`/`net`, PHP filesystem/process extensions). Any hit → move to `server/lib/`. "It's just hashing/signing" is not an exception.
7. **Types in their kind-file — `IProps` is the only co-location exception (§1.1, §5).** A component's own `IProps` may live inside its `.tsx` (or a sibling `.types.ts` per §0.1). EVERY OTHER type/interface — domain types, shared types, anything beyond this component's props — lives in the types location, never inline in a `.tsx`, a service, an action, or a query.
8. **Sub-feature folders when sub-sections are visible (§4.5).** Flat folder with clear sub-sections = FAIL. Sub-folder containing one file = also FAIL.
9. **Schemas in the schemas location (§1.1).** Not inline in routes/controllers/actions.
10. **HTTP boundary (route/controller/handler) thin (§1.4).** No business logic inline; delegate to service/server.
11. **Server-side files hold exactly their named concern (§1.1).** Scan every action / service / query / route / controller for leaked inline types, schemas, constants, helpers, or DB queries. Same strictness as components.
12. **No single-letter variables anywhere (§6.1).** No `(c) =>` / `(u) =>` / `(e) =>` / `(v) =>` etc.
13. **No `any`, no unsafe assertions (§5, §5.5a, §5.6).** Grep for:
    - `as unknown as <Type>` — forbidden categorically. Fix at the source (`select` narrowing in the ORM query, or typed adapter per §5.5a, or `as const` on the source constant per §5.5a "no carve-out"). Never the double-cast.
    - Cast over external boundaries: `(await response.json()) as`, `JSON.parse(...) as`, `formData.get(...) as`, `localStorage/sessionStorage.getItem(...) as`, `process.env.X as`, `fs.readFile(...)` results cast directly. Parse with schema validator, do not cast.
    - Adapter row-to-union (`row.field as <Union>`): only valid when the schema/migration file proving the DB constraint is in the delivery AND §15 names the file/enum backing it. Otherwise replace with a runtime check.
14. **No magic strings/numbers outside the §7.3 allowlist (§7.1).** Includes ORM `data:` / `where:` arguments, SQL params, REST bodies, GraphQL variables — the ORM/query boundary is NOT exempt. See also check 29 for the SSOT scan.
15. **Explicit search before writing reported (§3.1).** What folders/packages searched, what found, what reused.
16. **Reuse over re-implementation (§3.2).** Imported existing helpers / components / types / **type unions** instead of redeclaring the same literal union in another `.types.ts`.
17. **Post-write consolidation sweep run (§3.5).** Duplicates created by the new code detected and consolidated, including adapter duplicates by shape.
18. **No forced `for` loop (§8.3, §8.4).** Where `.map`/`.filter`/`.reduce` is O(n) and clear, use it. `for` only with explicit early-termination justification per §8.4.
19. **Zero comments and zero JSDoc (§10).** Grep for `//`, `/* */`, `/** */` (any form, including single-line, file-header, `@param`/`@returns`). Only the three §10 narrow exceptions remain.
20. **Functions small by meaning (§1.0b).** No "and" in the description of what a function does.
21. **No section comments inside function bodies (§1.0c).** Grep for `// validation`, `// step N`, `// build`, `// loop`, `// process`, or blank-line "paragraphs" — each is a missing extraction. Search for an existing helper before creating a new one (§3.1).
22. **No type / interface / schema / class declared inside any function body (§1.0d).** Hoist to the kind-file that owns it (§1.1) and import.
23. **Narration litmus passes for every function body (§1.0e).** No "and then… and inside that… and after that" — each connector is a missing extraction.
24. **Tell, Don't Ask (§1.0f).** No call-site patterns like `user.role === "admin" && user.permissions.includes(...)` repeating in 2+ places — extract to a predicate on the data-owning module.
25. **`const` + arrow function for every declaration in JS/TS (§11).**
26. **No `any` anywhere (§5, §5.1, §5.2).** Including inside generic constraints, form handler parameters, and trailing `as any` after narrowing.
27. **All imports at the very top of the file (§5.4, §5.4b).** No `require()` mid-body, no PHP `\Fully\Qualified\Name` mid-method when a top-level `use` would do. Only dynamic code-splitting (`dynamic(() => import(...))`) at module top is exempt.
28. **Validation covers every field accessed on `unknown` (§5.3).** Access fields from the validated value, not the raw `input`.
29. **Magic-value SSOT — every site (§7.1, §7.2).** For every literal carrying business meaning (outside §7.3 allowlist): if a named constant or type already exists in scope, import it; otherwise create one in the right constants file and use it everywhere — function bodies, default args, `useState` initials, store initializers, validation rules, test data, default props. No "it's just the default" carve-out. Also covers literal unions: `"admin" | "customer"` redeclared in a second `.types.ts` when `UserRole` already exists is a FAIL.
30. **No non-rendering helpers anywhere in a `.tsx` / `.jsx` / `.vue` / `.svelte` file.** Scan BOTH inside the component body AND at module scope. Includes one-line getters (`getStatusVariant`), parsers (`parsePageNumber`), formatters, predicates, and especially adapters (`to<Domain>` / `from<Source>` / `map<X>Row` / `adapt<X>` / `serialize<X>` / `normalize<X>`). All belong in `<feature>/lib/` (or `server/lib/` if server-only). Module-scope is NOT a loophole. Cross-check with §3.5 for shape-duplicates.
31. **Commit message follows convention (§12).** `type(scope): description`.
32. **No inline `process.env` / env reads (§7.4).** Grep for `process.env.`, `import.meta.env.`, `Deno.env`, `os.getenv`, `getenv(`, `System.getenv`. Every hit must be inside the single centralized env module; everywhere else reads through the typed `env` accessor. A direct env read elsewhere is a FAIL — skips validation and duplicates the variable name as a magic string.

---

## 15. Required Delivery Transparency

In your final response for implementation tasks, explicitly report:

- **Project discovery (§0.1)**: conventions detected or asked about; folder names for each kind.
- **Files changed / created** and **why each file exists** (one concern per file).
- **Search-before-writing (§3.1)**: folders/packages searched, what reused, what newly created.
- **Consolidation sweep result (§3.5)**: shared folders reviewed, duplicates the work created, what was consolidated, what remains.
- **If duplication was chosen**: why duplication was safer than a wrapper.
- **DB changes**: whether a transaction was used and why.
- **Control flow**: `.map`/`.filter`/`.reduce` (default) or `for` with the specific §8.4 justification.
- **`as` assertions (§5.5a/§5.6)**: if any row-to-union adapter assertion remains, name the schema/migration file + enum/check backing it.
- **Any unavoidable deviation** from these guidelines and its justification.
