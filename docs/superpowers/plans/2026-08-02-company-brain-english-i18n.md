# Company Brain English And I18n Implementation Plan

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Make the portal English-first with English technical routes and a type-safe i18n foundation ready for Spanish and future locales.

**Architecture:** Use `next-intl` with `en` as `defaultLocale` and `localePrefix: 'as-needed'`. Default English routes remain clean (`/spaces`, `/users`, `/account`, `/databases`); future locales can use a prefix without changing domain routes. UI copy comes from namespaced message catalogs, while route constants remain locale-independent English identifiers.

**Tech Stack:** Next.js 16 App Router, `next-intl`, React Server/Client Components, TypeScript, Bun, JSON message catalogs.

---

## Scope

This round migrates all existing portal routes, navigation labels, page headings, forms, errors, empty states, editor labels, database labels, and metadata to English-first message keys. Spanish messages are added for the existing UI so localization is real rather than a placeholder.

## Slice Order

### Slice 1: i18n and route foundation

**Files:**

- `apps/portal/package.json` via Bun CLI only
- `apps/portal/next.config.ts`
- `apps/portal/proxy.ts`
- `apps/portal/i18n/`
- `apps/portal/messages/en.json`
- `apps/portal/messages/es.json`
- `apps/portal/app/layout.tsx`
- `apps/portal/app/[locale]/layout.tsx`
- `apps/portal/app/[locale]/(auth)/`
- `apps/portal/app/[locale]/(portal)/`
- `apps/portal/shared/routes/constants/routes.constants.ts`

**Deliverable:** Locale routing works with English as default, route directories are English, the default URL paths are English, and all existing routes resolve under the locale-aware App Router.

### Slice 2: English message migration

**Files:**

- `apps/portal/modules/portal/`
- `apps/portal/modules/auth/`
- `apps/portal/modules/account/`
- `apps/portal/modules/users/`
- `apps/portal/modules/spaces/`
- `apps/portal/modules/pages/`
- `apps/portal/modules/databases/`
- `apps/portal/shared/components/`
- Matching portal tests

**Deliverable:** No hardcoded user-facing Spanish strings remain in portal UI. Components use `next-intl` server/client APIs with namespaced keys. English is the default output; Spanish catalog entries cover the migrated keys.

### Slice 3: Navigation, links, and regression verification

**Files:**

- `apps/portal/shared/routes/`
- `apps/portal/modules/portal/`
- `apps/portal/tests/`
- Any route consumer identified by the route search, only within portal scope

**Deliverable:** Internal links, redirects, nav visibility, tests, and metadata use English route constants. Old Spanish paths are either removed or explicitly redirected to the English equivalents without creating duplicate route implementations.

## Routing Contract

```text
/                         English default home
/login                    English default auth route
/spaces                   English default spaces route
/spaces/:spaceId          English default space route
/users                    English default users route
/account                  English default account route
/databases                English default databases route
/databases/:databaseId   English default database route

/es/...                   Future Spanish-prefixed equivalents
```

The route pathname stays English for every locale in this round. Translation applies to UI copy, not API paths or technical identifiers.

## Message Catalog Rules

- Use namespaces by module: `common`, `auth`, `portal`, `account`, `users`, `spaces`, `pages`, `databases`, `errors`.
- Keys describe meaning, not current wording.
- Use sentence case and ICU interpolation for dynamic values.
- Do not concatenate translated fragments.
- Do not use hardcoded fallback strings in components.
- Server Components use `getTranslations`; Client Components use `useTranslations`.
- Shared non-UI code must not import `next-intl`.
- Technical identifiers, route constants, API paths, database keys, and test names remain English.

## Migration Rules

- Rename route folders, not only route constants:
  - `app/(portal)/espacios` -> `app/[locale]/(portal)/spaces`.
  - `app/(portal)/usuarios` -> `app/[locale]/(portal)/users`.
  - `app/(portal)/cuenta` -> `app/[locale]/(portal)/account`.
- Keep route groups and layouts thin.
- Update every internal href and redirect through `ROUTES` or `next-intl` navigation helpers.
- Set root document language from the resolved locale.
- Replace starter metadata with Company Brain metadata.
- Do not leave compatibility Spanish route implementations; use redirects only if preserving old bookmarks is explicitly desired.

## Verification

- Write routing/message tests before implementation and verify RED.
- Verify `/`, `/login`, `/spaces`, `/users`, `/account`, and `/databases` resolve with default English.
- Verify `/es/...` resolves using the Spanish catalog without changing API paths.
- Search portal source for Spanish hardcoded UI strings and old route segments.
- Run full portal tests.
- Run root `bun run check` with zero code warnings/errors.
- Run root `bun run build`.
- Test keyboard navigation, focus states, loading/error/empty states, and 320px layouts after message expansion.
- Read every changed file and run a final consolidation pass for duplicate translation keys and route constants.

## Deferred

- Locale-specific route pathnames such as `/es/espacios`.
- User locale preference persistence beyond the `next-intl` locale cookie.
- Right-to-left locales.
- Translation management tooling and missing-key CI enforcement.
