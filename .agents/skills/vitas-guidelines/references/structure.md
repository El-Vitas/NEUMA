# Structure — where every symbol lives

Read this before creating or moving a file, deciding where a symbol goes, building a component, or growing a feature folder.

## Contents

- [1. Project discovery — the questions and the fallbacks](#1-project-discovery--the-questions-and-the-fallbacks)
- [2. Kinds of symbols and where they live](#2-kinds-of-symbols-and-where-they-live)
- [3. The pure vs server helper boundary](#3-the-pure-vs-server-helper-boundary)
- [4. Grouping — the anti-fragmentation rule](#4-grouping--the-anti-fragmentation-rule)
- [5. Layer separation across frameworks](#5-layer-separation-across-frameworks)
- [6. The subcomponent rule](#6-the-subcomponent-rule)
- [7. Modularity — packagelets and extension](#7-modularity--packagelets-and-extension)
- [8. Sub-feature promotion — recursive grouping](#8-sub-feature-promotion--recursive-grouping)

---

## 1. Project discovery — the questions and the fallbacks

Scan the repo first (SKILL.md §0.2). If detection is ambiguous, ask **concrete** questions — never a blank "what's your convention?":

> "I need to confirm where a few things go in this project:
> - Domain constants (statuses, roles, limits, page sizes) → `constants/` or another folder?
> - Project configuration (fonts, metadata, env wiring) → `config/` or another folder?
> - Pure helpers → `lib/`, `utils/`, `helpers/`?
> - Types / interfaces → `types/`, `models/`, co-located, or other?
> - Zod / API schemas → `schemas/`, `validators/`?
> - For server logic, is there a `route → service → query` layering? What names does it use here?
>
> If you have no preference I'll use: `constants/`, `config/`, `lib/`, `types/`, `schemas/`, `server/`, `queries/`. Confirm?"

Remember the answer for the rest of the session. Do not re-ask for the same project.

**Fallback defaults**, only if the user didn't answer — and flag in the delivery that you assumed:

| Kind | Default location |
|---|---|
| Domain constants | `<feature>/constants/` |
| Project configuration | `<feature>/config/` or app-level `config/` |
| Helpers, formatters, parsers | `<feature>/lib/` |
| Custom hooks | `<feature>/hooks/` |
| Types and interfaces | `<feature>/types/` |
| API / Zod schemas | `<feature>/schemas/` |
| Components | `<feature>/_components/` or `<feature>/components/` |
| Business logic | `<feature>/server/` or `<feature>/services/` |
| Data access | `<feature>/queries/` or `<feature>/repositories/` |

The folder names matter less than the one-concern-per-file rule. Whatever the project calls them, the kinds are the same.

---

## 2. Kinds of symbols and where they live

These are **kinds**, not folder names — the names come from discovery. Each kind goes in one of them and nothing else.

| Kind | What lives here | What NEVER lives here |
|---|---|---|
| **Component file** (`.tsx`/`.jsx`/`.vue`/`.svelte`) | exactly ONE public component plus its own `IProps` interface | another public component; any domain type beyond this component's props; a schema; a constant; **any non-rendering helper** — mapping, computation, lookup, formatting, predicates, adapters — even one-use, even three lines, **module scope included**; a hook; business logic; DB access |
| **Pure helpers** (isomorphic) | pure functions grouped by concern (`date.lib.ts`) | components, types, schemas, constants, business logic, **any I/O**, any server-only runtime import (see §3) |
| **Server-side helpers** | impure helpers needing server-only resources but too small to be a service: `requireActiveUser(userId)`, `assertOrderBelongsToUser(orderId, userId)`, `loadUserContext(req)`, `withAuditLog(op)` | client-bundle-safe code (importing these from a Client Component *should* crash); multi-step business orchestration (that's a service); inline types/schemas/constants |
| **Custom hooks** | one or a few related `use*` hooks | components, types, schemas, constants, non-React utils |
| **Types / interfaces** | `type` aliases AND `interface` declarations for a related domain | runtime code, schemas, constants |
| **Schemas** (Zod/Yup/Valibot — not Prisma) | related schemas; the TS type derived via `z.infer` | runtime code, components, constants. **If a schema needs a constant that exists, import it — never redefine it here** |
| **Domain constants** | named literals grouped by concern (`roles.constants.ts`, `http-status.constants.ts`). Canonical home for HTTP status codes, salt rounds, retry backoff, feature flags, enum-like literals. One definition, every consumer imports | runtime code, components, helpers, project configuration |
| **Project configuration** | app-level wiring: fonts, SEO/metadata, env plumbing, third-party client setup, feature toggles | **domain constants**, business logic, components, helpers |
| **HTTP boundary** (route/controller/handler) | request parsing, schema validation, calling the service, mapping result → HTTP status | business logic, DB queries, orchestration, transformations, inline schemas/constants/types/helpers, multiple unrelated routes |
| **Server Action** | `'use server'` + schema-validated entrypoint + **authn/authz check** + delegation to a service | business logic in the body, inline schema/types/constants/helpers, inline DB queries, multiple unrelated actions |
| **Service / business logic** | the operations, orchestrating queries and helpers; decides when to open a transaction | HTTP details, inline schemas/constants/types/helpers, inline DB queries, multiple unrelated services |
| **Query / data access** | DB reads/writes for a single entity or use case | HTTP details, business orchestration, inline schemas/types/constants/helpers, transactions whose business meaning belongs to the service |

**Even strongly-related things go in their own kind-file.** A constant, a type, a helper and a component that belong to the same feature and depend on each other still live in four files. The component imports each one. The sole exception is `IProps`.

---

## 3. The pure vs server helper boundary

PURE means: no I/O, no DB, no network, no `localStorage`, no env reads, no `fs`, **and no language runtime built-in that only resolves on the server**:

- Node/Bun/Deno: any `node:*` import — `node:crypto`, `node:fs`, `node:path`, `node:net`, `node:os`, `node:child_process` — and any non-prefixed equivalent.
- Python: `os`, `subprocess`, `socket`. PHP: filesystem/process/network extensions. Go: `os`, `net`, `os/exec`.

The signal generalizes: **if the import would crash or behave differently when loaded from a client bundle or another isolation boundary, the helper is not pure.**

"It's just hashing" or "it's just path joining" is not an exception — `node:crypto` and `node:path` are server-only. Move it to the server helpers folder.

**Audit grep for the pure-helpers folder:** `node:`, ORM clients, `fetch(`, `http(s)`, `axios`, `process.env`, `Deno.env`, `fs`, `path`, plus the cross-language equivalents. Any hit → move.

---

## 4. Grouping — the anti-fragmentation rule

Within any folder for a kind:

- **Don't create one file per tiny symbol.** This is the trap agents fall into most.
- **Don't cram everything into one giant file.** A 600-line `utils.ts` mixing date + currency + string + validation + DOM is wrong.
- **Group by concern with a clear filename.** Cohesion test: *would a reader looking for one of these symbols reasonably expect to find the others here?*
- **Wrong-folder placement is a kind failure, not a grouping one.** A types file in `lib/`, a schema in `config/`, a hook in `lib/` — move it to the folder that owns the kind, *then* apply the cohesion test in the destination.
- **Extraction does not authorize fragmentation.** Helpers just pulled out of a `.tsx` must still pass the cohesion test in their destination — predicates, formatters and parsers about the same entity belong in one file, not three.

### Over-fragmentation — wrong

```
feature/users/
  types/
    user.types.ts             ← only User
    address.types.ts          ← only Address (used only by User)
    user-status.types.ts      ← only UserStatus
  constants/
    page-size.constants.ts    ← DEFAULT_PAGE_SIZE
    max-name.constants.ts     ← MAX_NAME_LENGTH
    timeout.constants.ts      ← REQUEST_TIMEOUT_MS
  lib/
    format-name.lib.ts        ← formatFullName
    format-address.lib.ts     ← formatAddress
    initials.lib.ts           ← getInitials
```

Eleven files, one symbol each. The reader opens eleven files to learn the feature.

### Correct grouping

```
feature/users/
  types/
    user.types.ts             ← User + Address + UserStatus
  constants/
    user.constants.ts         ← DEFAULT_PAGE_SIZE, MAX_NAME_LENGTH, REQUEST_TIMEOUT_MS
  lib/
    format.lib.ts             ← formatFullName + formatAddress + getInitials
```

### When to split

Split only when you can name a **second concern**, not when you have a second symbol:

- Date helpers *and* currency helpers accumulate → `date.lib.ts` + `currency.lib.ts`.
- Constants split between behavior (timeouts, retries) and domain enums (statuses, roles) → `behavior.constants.ts` + `roles.constants.ts`.
- Types split between the feature's public API and internals → `<entity>.types.ts` + `<entity>.internal.types.ts`.

When a file grows enough that two clear sub-concerns emerge, promote them to a sub-feature folder (§8) rather than fragmenting at file level.

---

## 5. Layer separation across frameworks

Same shape, different names:

| Layer | Job | By framework |
|---|---|---|
| HTTP boundary | parse, validate, authorize, call the service, map the response. **Small.** | Next `route.ts`, Fastify route, Express/Nest controller, Hono handler, Rails controller, Django view |
| Service / business logic | the actual operations; owns transaction boundaries | `*.service.ts`, `server/*`, `domain/*`, Rails service objects |
| Data access | DB reads/writes | `*.query.ts`, `repositories/*`, `dao/*` |
| Helpers | reused across layers | `lib/`, `utils/`, `helpers/` |

A route file with 200 lines of business logic is wrong in every framework. If the project has no service layer yet, ask whether to introduce one.

---

## 6. The subcomponent rule

When writing a component, look for any internal piece with a recognizable meaning of its own and extract it.

Extraction triggers:

- A `<form>` containing a menu, a dropdown, a row of pickers, an upload area, an action bar → each is a subcomponent.
- A loop rendering non-trivial items (>5 nodes or its own logic) → `OrderRow`, `UserCard`, `StatusBadge`.
- A repeated UI structure (badge, pill, avatar group, tag list).
- A self-contained interactive piece (modal, popover, drawer body).
- **Anything with a name a PM or designer could say out loud** — "the order status badge", "the customer filter panel", "the bulk-action toolbar" — even if used once today.

After extraction the parent reads as a composition of named pieces, not a wall of nested JSX. A 250-line component that "is one component" is still wrong if it contains four distinct pieces inline.

Where it goes: reused within the feature → the feature's components folder; reused across features → the shared UI location; genuinely one-use → still a sibling file under the parent's components folder. The import noise is worth the readability.

Balance this against SKILL.md §0.1: extracting a five-node fragment used once, with a name nobody would say out loud, adds a hop and buys nothing.

---

## 7. Modularity — packagelets and extension

Treat each feature, util group and component as a small self-contained packagelet:

- Clear public API (named exports, or a barrel only when the folder genuinely exposes one).
- Internal helpers and types are not exported.
- Consumers depend on the public API; internals stay free to change.
- Adding a variant inside a packagelet changes no consumer.

**Open for extension, closed for modification** — once a second case actually exists:

- Add behavior by adding files (a new variant, strategy, handler), not by editing existing ones.
- UI: variants drive styling. `Button` with `variant`/`size`/`tone` beats `PrimaryButton` / `SecondaryButton` / `DangerButton`.
- Business logic: a dispatch table or strategy object beats a long `if/else` chain — a new case is one entry.
- API: schema-driven validation means adding a field updates one schema; consumers self-correct via inference.

**No extension by hack:** never add a boolean flag that branches the body into two behaviors, never add a `// special case for …` block, never copy a function and change two lines. Extract, parameterize, or split into siblings.

**Predictable locations:** if the user adds a constant or helper to this feature, where it lives must be obvious from the conventions, without searching.

---

## 8. Sub-feature promotion — recursive grouping

A feature doesn't have to be a flat folder. When its pieces cluster into recognizable sub-sections, promote those into sub-feature folders. The structure rules apply recursively.

**Architecture-agnostic** — React `components/`/`sections/`/`panels/`, Vue sub-routes, Angular nested modules, backend sub-areas of `services/`/`handlers/`/`domain/`, mobile nested `screens/`. The shape is "recursion when cohesion appears"; the labels are local.

**Promote when all of these hold:**

- A group of files consistently belongs to one sub-section and only that one.
- The sub-section has a name a PM, designer or domain expert could say out loud (*the filter bar*, *the export flow*, *the payment-step wizard*).
- It has more than two related files.
- Adding more pieces there is foreseeable.

```
<feature>/
  <components>/
    <subfeature>/
      <subfeature entry>
      <components>/          ← recursion continues only while cohesion is clear
      <types>/  <lib>/  <hooks>/
  <types>/  <lib>/  <hooks>/  <config>/
```

**Do NOT promote when:** the "group" is two unrelated files that happen to share a feature; the sub-section has one file (single-file solitude is noise, not structure); the grouping is speculative with no concrete second piece in sight.

The trigger is **observed cohesion**, not anticipation. Never pre-create empty sub-feature folders. Promote the moment the second related file lands. Recursion stops when the next level would hold a single file.

The same applies inside the feature's `lib/`, `types/`, `hooks/`, `schemas/` folders when their contents cluster by sub-concern.
