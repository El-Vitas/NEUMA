# Neuma Foundation Implementation Plan

> **For agentic workers:** Use the slice-squad workflow for the implementation round. Agents must not spawn agents, commit, or edit files outside their assigned scope.

**Goal:** Deliver the first usable Neuma foundation: one company workspace, employee roles, public/restricted spaces, hierarchical pages, version history, trash, and the search/outbox contracts required by later slices.

**Architecture:** Extend the existing NestJS modules and Prisma schema. The backend owns use cases, policies, persistence, and outbox events. The Next.js portal consumes the backend through server queries/actions. Search is represented by a durable projection contract even when the first UI search is delivered in a later slice.

**Tech Stack:** Bun, NestJS 11, Fastify, Prisma 7, PostgreSQL, Next.js 16 App Router, React 19, Zod, Bun test, Vitest, existing `Result<T, E>` conventions.

---

## Scope Boundary

This round does not implement the complete editor, configurable databases, files, collaboration, BullMQ, Valkey, embeddings, SSO, or external sharing. Their approved target architecture remains in `docs/superpowers/specs/2026-08-01-neuma-design.md` and will be handled by later plans.

## Slice Plan

The first slice is sequential because every later slice depends on its database contracts. After it is verified, the portal slice and MCP contract slice may run in parallel because they touch disjoint files.

### Slice 1: Workspace, spaces, pages, and search contracts

**Scope:**

- `packages/db/prisma/`
- `apps/backend/src/modules/workspaces/`
- `apps/backend/src/modules/spaces/`
- `apps/backend/src/modules/pages/`
- `apps/backend/src/modules/search/`
- `apps/backend/src/common/` only for genuinely cross-cutting authorization/outbox contracts
- Matching backend tests and database migration files

**Deliverable:** Authenticated employees can create and browse the single workspace's spaces and hierarchical pages, restricted spaces enforce membership, pages can be moved to trash and restored, page versions are immutable, and mutations emit durable outbox records suitable for search projection.

### Slice 2: Portal spaces and pages

**Scope:**

- `apps/portal/app/` route files required for spaces/pages
- `apps/portal/modules/spaces/`
- `apps/portal/modules/pages/`
- Matching portal tests and mocks

**Deliverable:** Employees can browse spaces, inspect page trees, create/edit pages, move pages to trash, restore pages, and see loading, empty, error, mobile, and permission-denied states.

### Slice 3: MCP read contract

**Scope:**

- `apps/backend/src/modules/mcp/`
- MCP-specific backend tests
- MCP package configuration only through `bun add` if the package is not already installed

**Deliverable:** A local stdio MCP server exposes authorized read tools for searching/listing spaces/getting pages using application use cases, with bounded Zod input/output schemas and contract tests. The actual full-text search implementation belongs to the later search plan; this slice must not introduce a second search implementation.

## Task Details

### Task 1: Map existing auth contracts

**Files:**

- Read: `apps/backend/src/modules/auth/`
- Read: `apps/backend/src/modules/users/`
- Read: `packages/db/prisma/models/user.model.prisma`
- Read: `apps/backend/src/common/`
- Test: existing auth tests before changing any shared contract

- [ ] Confirm the current authenticated-user request shape, global role enum, guard, and `Result` error mapping.
- [ ] Reuse the existing auth guard and user identity in every new controller; do not create a second JWT or role guard.
- [ ] Record the exact existing imports in the slice brief before writing new files.
- [ ] Run `bun run check` from `/path/to/neuma` and record the clean baseline.

### Task 2: Add workspace and space persistence

**Files:**

- Create: `packages/db/prisma/models/workspace.model.prisma`
- Create: `packages/db/prisma/models/space.model.prisma`
- Create: `packages/db/prisma/models/space-member.model.prisma`
- Create: `packages/db/prisma/enums/space-visibility.enum.prisma`
- Create: the generated migration under `packages/db/prisma/migrations/`
- Test: backend repository integration tests for public and restricted spaces

- [ ] Add one workspace boundary and connect the existing user model to it without introducing tenant billing or subscription fields.
- [ ] Add space visibility as a database enum with public-internal and restricted values.
- [ ] Add a unique space slug per workspace and a unique membership pair per user/space.
- [ ] Add created/updated timestamps and a soft-deletion field only where the domain lifecycle requires it.
- [ ] Generate the Prisma client and create a named migration with the repository's Bun command.
- [ ] Verify unique constraints and membership queries against a real test database.

### Task 3: Implement workspace and space authorization

**Files:**

- Create: `apps/backend/src/modules/workspaces/workspaces.module.ts`
- Create: workspace types, service, controller, DTOs, repository, and policy files under `apps/backend/src/modules/workspaces/`
- Create: corresponding files under `apps/backend/src/modules/spaces/`
- Test: unit policy tests and integration tests under the backend test structure

- [ ] Define use cases for resolving the single workspace, listing spaces, creating a space, and updating space visibility.
- [ ] Implement `admin`, `editor`, and `viewer` mutation/read rules in pure domain policy functions.
- [ ] Let public-internal spaces be discoverable to employees while restricting mutations to authorized roles.
- [ ] Require `SpaceMember` for restricted spaces and deny access before repository results are returned.
- [ ] Keep controllers thin: validate DTO, call service, map `Result` to HTTP response.
- [ ] Test admin/editor/viewer behavior and restricted-space membership behavior with Arrange-Act-Assert tests.

### Task 4: Implement hierarchical pages and versions

**Files:**

- Create: `packages/db/prisma/models/page.model.prisma`
- Create: `packages/db/prisma/models/page-version.model.prisma`
- Do not create a separate trash model; represent trash lifecycle on `page.model.prisma` and document the lifecycle invariant in the slice report
- Create: `apps/backend/src/modules/pages/pages.module.ts`
- Create: page types, domain rules, DTOs, service, controller, repository, and policy files under `apps/backend/src/modules/pages/`
- Test: page service, repository, authorization, version, and trash integration tests

- [ ] Represent the hierarchy with a nullable parent page relation and a stable ordering field.
- [ ] Prevent cycles when moving a page under another page.
- [ ] Create immutable versions for every successful content mutation.
- [ ] Implement trash as an explicit lifecycle state with restore and permanent-delete boundaries left out unless required by existing conventions.
- [ ] Apply space authorization to every page read, create, update, move, trash, and restore operation.
- [ ] Return a typed domain error for invalid parent, unauthorized access, missing page, or invalid lifecycle transition.
- [ ] Test nested page creation, move-cycle rejection, version creation, trash, restore, and permission denial.

### Task 5: Add outbox and search projection contracts

**Files:**

- Create: `packages/db/prisma/models/outbox-event.model.prisma`
- Create: `packages/db/prisma/models/search-document.model.prisma`
- Create: `apps/backend/src/modules/search/search.module.ts`
- Create: search types, projection contract, repository, and service under `apps/backend/src/modules/search/`
- Create: cross-cutting outbox contract only if used by at least two modules
- Test: outbox transaction and search projection unit/integration tests

- [ ] Store an outbox event in the same transaction as each page or space mutation that affects search.
- [ ] Include aggregate type, aggregate id, event type, payload version, status, attempt count, and next-attempt timestamp.
- [ ] Define a `SearchDocument` projection contract containing title, extracted text, language metadata, tags/properties, space id, content type, version marker, and indexing state.
- [ ] Do not implement embeddings, Redis, BullMQ, or a second ad hoc search path.
- [ ] Define the future full-text query interface so portal and MCP consume one service later.
- [ ] Test atomic mutation plus outbox creation and idempotent projection processing.

### Task 6: Build the portal space/page experience

**Files:**

- Create: route files under `apps/portal/app/` only for approved navigation paths
- Create: `apps/portal/modules/spaces/` views, components, queries, actions, schemas, constants, and types
- Create: `apps/portal/modules/pages/` views, components, queries, actions, schemas, constants, and types
- Create: MSW handlers and tests under the portal test structure

- [ ] Use Server Components for initial reads and Server Actions for mutations.
- [ ] Keep client boundaries limited to tree interactions and form state.
- [ ] Use route constants and cache tags; invalidate relevant space/page tags after mutations.
- [ ] Render public/restricted visibility and permission-denied states without leaking restricted metadata.
- [ ] Include responsive layouts at 320px, keyboard navigation, focus states, loading states, empty states, and error states.
- [ ] Use the approved versioned JSON content contract with `schemaVersion` and a minimal block list for this foundation round; do not store arbitrary HTML. The complete ProseMirror block schema belongs to the editor plan.
- [ ] Test queries, actions, permission states, and critical client interactions with existing Vitest/MSW conventions.

### Task 7: Add read-only MCP tools

**Files:**

- Create: `apps/backend/src/modules/mcp/mcp.module.ts`
- Create: MCP server factory, tool schemas, tool adapters, and transport entrypoint under `apps/backend/src/modules/mcp/`
- Test: MCP contract tests under the backend test structure

- [ ] Use the current official MCP TypeScript SDK compatible with Bun.
- [ ] Register bounded tools for listing spaces and fetching pages; add search only when the shared search service has a real text implementation.
- [ ] Resolve the authenticated principal before invoking application use cases.
- [ ] Return structured output and concise human-readable text.
- [ ] Reject unauthorized pages and restricted spaces without exposing existence details.
- [ ] Keep write tools out of this round until read contracts, authorization, and confirmation behavior are tested.
- [ ] Verify the stdio transport manually with a local MCP client or the SDK test client.

## Verification Gate

- [ ] Run `bun install` after any dependency change.
- [ ] Run the applicable Prisma generation and migration commands.
- [ ] Run backend unit and integration tests for the slice.
- [ ] Run portal tests for the portal slice.
- [ ] Run `bun run check` from the repo root with zero warnings and errors.
- [ ] Run `bun run build` after the final slice integration.
- [ ] Read every changed file and confirm each agent stayed within its assigned scope.
- [ ] Run a final consolidation pass for duplicate types, constants, policies, schemas, adapters, and search logic.

## Later Plans

After this foundation plan is verified, create separate plans for:

1. Complete ProseMirror editor and version-aware structured content.
2. Configurable databases and Tasks/Projects templates.
3. PostgreSQL full-text search implementation and indexing worker.
4. Local file assets and multimedia blocks.
5. Yjs/Hocuspocus collaboration.
6. BullMQ/Valkey evaluation and operational jobs.
7. SSO, integrations, semantic search, and other backlog items.
