# AGENTS.md — Web

> Web-specific conventions. Inherits all standards from `AGENTS.md` at the repo root.

## Stack

- Next.js 16 (App Router, Server Components)
- React 19
- TypeScript strict
- Tailwind CSS 4
- bun

## Next.js Architecture (Strict)

### Directory Structure (Thin Router, Thick Modules)

Domain-Driven Design. `app/` is for routing only. Logic lives in `modules/`.

```text
app/                     # Routing layer (Pages, Layouts)
modules/                 # Domain layer (Business Logic)
shared/                  # Utilities & UI Kit
```

### Server vs Client Components

- **Default to Server Components:** Use them for data fetching and initial render.
- **"use client" only when needed:** Only for `useState`, `useEffect`, or event listeners.

### Data Fetching — Server First

All API communication goes through the Next.js server. A client component NEVER calls `fetch()` directly to the backend or uses an HTTP client from the browser.

```
Client (React) → Server Action/Query (Next.js) → API Backend (NestJS)
```

- **Mutations (POST/PUT/PATCH/DELETE):** Server actions (`server/actions/`). The component calls the action, the action uses `apiServer` (or `fetch` for multipart), invalidates cache with `updateTag()`, and returns the result.
- **Reads (GET):** Server queries (`server/queries/`). The parent Server Component calls the query with `await`, the query uses `apiServer` with `'use cache'`.
- **No direct `fetch()` calls in client components.** No exceptions. Server actions may use `fetch()` because they run on the server.
- **No `useEffect` for API calls.** Client-side fetching is an anti-pattern for initial data.
- **`import "server-only"`** at the top of every server file (queries, actions, server utilities).

## Components

- **One component per file.** No exceptions.
- **Props as `IProps`.** All component props are declared as `interface IProps` co-located at the top of the component file.
- **Decouple sub-components.** If a component renders internal sub-components, extract them to their own files. A component should not define sub-components inline.
- **Leaf Pattern:** Push `"use client"` boundaries down to the smallest possible component. Server Components wrap Client Components, not the other way.
- **Responsive by default.** Every component must work across all viewports — mobile, tablet, desktop. No horizontal overflow, no content cut off. Test at 320px width. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) instead of hidden duplicate components.

## Server Actions

- **NSA pattern:** Use `adminAction` / `authenticatedAction` / `publicAction` (from `server/nsa.ts` or `lib/safe-action.ts`).
- **Invalidate cache after mutations.** Always call `updateTag()` after creates, updates, and deletes.
- **Actions mutate, Components read.** An action should not return rendered data — just the result.

## Environment Variables

- **Never use `process.env` directly.** All env vars go through a typed config object validated with Zod at `config/env.config.ts`.
- **Export a typed `env` object** from `config/env.config.ts` using `envSchema.parse(process.env)` — fail fast at startup.
- **Import `env` everywhere** instead of reading `process.env`. Server Components, Server Actions, `lib/`, and `config/` all consume the typed object.
- **Public env vars** (NEXT*PUBLIC*\*) must also be declared in the schema. Next.js inlines them at build time; validation still catches missing values early.
- **Default values** are defined in the Zod schema, not with `??` or `||` in service code.

## Module Structure

```
<module>/
├── types/          # TypeScript types & interfaces (no runtime code)
├── constants/      # Enums, status maps, option arrays, magic numbers, cache tags, routes
├── lib/            # Pure functions, formatters, parsers (no React, no server I/O)
├── schemas/        # Zod schemas
├── hooks/          # Custom React hooks (use*)
├── components/     # React components (leafs, sub-components)
├── views/          # Page-level components consumed by app/
└── server/
    ├── queries/    # Data fetching (use cache) — reads only
    ├── actions/    # Mutations via NSA — writes only
    └── lib/        # Server-only utilities (auth, permissions, server helpers)
```

App-level folders (`config/`, `lib/`, `types/`, `shared/`) follow the same rules but are not per module.

### Submodules

A module that grows past roughly **60 files** is split into submodules. A submodule
is a module: it has the same folders (`types/`, `constants/`, `lib/`, `hooks/`,
`components/`, `schemas/`, `server/`), and it holds everything one coherent
concern needs.

```
<module>/
├── types/ constants/ lib/ schemas/ server/   # the module's own shared core
├── <submodule>/
│   ├── types/ constants/ lib/ components/ …  # same folders, one concern
│   └── <sub-submodule>/                      # only when a submodule itself outgrows 60
└── <submodule>/
```

Three rules decide what goes where:

- **A submodule is a concern, not a size.** Six files that are all one idea earn
  their own folder; sixty files that are three ideas do not stay in one. Split by
  what the code is *about* — the editor, the trash, the attachments — never by
  what layer it belongs to.
- **What two submodules both need belongs to the module's core**, not copied into
  each and not reached for sideways. If `editor/` and `appearance/` both need
  `PageSummary`, it lives in `<module>/types/`.
- **Depth is earned.** A second level only exists where a submodule is itself too
  big to read. Most submodules are one level and should stay that way.

A submodule may import from its own module's core and from `shared/`. Reaching
into another *module* stays forbidden, exactly as before.

## Naming Convention

Dot-separated. No kebab-case. Hierarchy reads left to right: broader → narrower.

| Type           | Pattern                                      | Examples                                            |
| -------------- | -------------------------------------------- | --------------------------------------------------- |
| Types          | `{entity}.types.ts`                          | `auth.types.ts`, `portal.types.ts`                   |
| Constants      | `{entity}.constants.ts`                      | `auth.constants.ts`, `table.constants.ts`           |
| Lib            | `{entity}.lib.ts`                            | `auth.lib.ts`, `account.lib.ts`                     |
| Schemas        | `{entity}.schemas.ts`                        | `auth.schemas.ts`, `profile.schemas.ts`               |
| Hooks          | `{entity}.hooks.ts`                          | `auth.hooks.ts`, `portal.hooks.ts`             |
| Views          | `{entity}.view.tsx`                          | `auth.login.view.tsx`, `account.view.tsx`      |
| Components     | `{entity}.{component}.tsx`                   | `auth.login.form.tsx`, `user.table.tsx`                |
| Sub-components | `{entity}.{component}.{sub}.tsx`             | `user.table.section.tsx`, `user.form.dialog.tsx` |
| Queries        | `{entity}.queries.ts` (in `server/queries/`) | `account.queries.ts`, `user.queries.ts`               |
| Actions        | `{entity}.actions.ts` (in `server/actions/`) | `profile.actions.ts`, `auth.actions.ts`               |
| Server lib     | `{entity}.server.ts` (in `server/lib/`)      | `auth.server.ts`, `permissions.server.ts`           |

> Sub-component dot-suffix creates a visual hierarchy: `order.table.section.tsx` is
> clearly part of `order.table.tsx`, without nested folders.

Non-module paths (`shared/`, `config/`, etc.) follow the same rule: `api.client.ts`,
`use.data-table.hook.ts`, `safe-action.constants.ts`.

## Caching

- **All queries use `"use cache"`.** Every file in `server/queries/` starts with `"use cache"`, imports `cacheLife` and `cacheTag` from `next/cache`.
- **`cacheLife()` duration** set per query: `"seconds"`, `"minutes"`, `"hours"`, `"days"`, `"weeks"`.
- **`cacheTag()` for selective invalidation.** Tag individual items (`user-${id}`) and collections (`users`). Invalidate with `updateTag()` in actions.
- **Cache tags in constants.** All cache tags defined in `constants/cache.constants.ts` as a `CACHE_TAGS` object.
- **Return type as exported type.** `export type Entity = Awaited<ReturnType<typeof getEntity>>` at the bottom of query files.

## Routes

- **Routes as constants.** All application routes defined in a single `routes.constants.ts` (or `routes.ts`). Never hardcode paths like `/dashboard/orders`.
- **Import and reference.** Use the constant everywhere: `<Link href={routes.orders.detail(id)}>`.

## Path Aliases

| Alias            | Maps to                 |
| ---------------- | ----------------------- |
| `@/modules/*`    | `./modules/*`           |
| `@/shared/*`     | `./shared/*`            |
| `@/app/*`        | `./app/*`               |
| `@/lib/*`        | `./lib/*`               |
| `@/components/*` | `./shared/components/*` |
| `@/hooks/*`      | `./shared/hooks/*`      |
| `@/config/*`     | `./config/*`            |
| `@/types/*`      | `./types/*`             |
| `@/mocks/*`      | `./mocks/*`             |

## Testing

### Stack

- **Vitest 4** (jsdom), RTL, MSW 2 (setupServer)

### Structure

```
tests/
├── unit/                     # mirrors modules/
├── integration/              # MSW + RTL
├── app/                      # page-level tests
├── mocks/
│   ├── server.ts             # setupServer + lifecycle
│   └── handlers/             # one per domain
└── vitest.setup.ts           # jest-dom matchers + MSW lifecycle
```

### What & How

| What | Tool |
|---|---|
| Client Components | RTL + MSW |
| Sync Server Components | RTL |
| Async Server Components | ❌ (E2E) |
| Server Actions | Logic function in isolation |
| Pure functions, schemas, constants | Direct Vitest, no MSW |

### Rules

- Unit tests mirror `modules/`. `tests/unit/auth/lib/auth.form.lib.spec.ts` → `modules/auth/lib/auth.form.lib.ts`.
- Never mock `fetch` or `api-client.ts` directly — MSW intercepts at network level.
- Default handlers in `handlers/` for happy path; `server.use(...)` for per-test overrides.
- `onUnhandledFrame: 'error'` — any unmatched fetch fails the test.
- Files that `import "server-only"` or use `next/headers` cannot be imported in jsdom. Test `apiRequest` (no `next/headers` dependency) instead of `apiServer`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
