# Neuma Design

## Status

Approved design baseline. This document defines the target architecture and implementation roadmap. It does not authorize implementation of every phase in one pass.

## Goal

Build a private, single-company knowledge and work system inspired by Outline and Notion, while following the `neuma` starter conventions and preserving a search-first architecture.

The system will combine flexible pages for knowledge with configurable databases for tasks, projects, and future operational data.

## Product Scope

### Initial scope

- One company workspace per deployment.
- Employees as the initial user population.
- Email and password authentication.
- Global roles: `admin`, `editor`, and `viewer`.
- Spaces visible to employees by default, with restricted spaces available through membership authorization.
- Hierarchical pages inside spaces.
- Rich structured editor with multimedia and advanced blocks.
- Page version history and trash from the first usable document release.
- Configurable databases with initial Tasks and Projects templates.
- Table, board, calendar, and timeline views where the data model supports them.
- PostgreSQL full-text search with tags, properties, filters, permissions, ranking, typo tolerance, and incremental indexing.
- MCP access through the same application use cases as the portal.
- Local filesystem storage behind a storage abstraction for the first local phase.

### Explicitly deferred

- SSO providers such as Google Workspace and Microsoft Entra.
- Multi-tenant organizations.
- Billing, subscriptions, plans, and commercial entitlements.
- External guests and public sharing.
- Embeddings and semantic search.
- External object storage migration to S3-compatible infrastructure.
- Distributed Redis/Valkey infrastructure.
- Background job queues beyond the initial PostgreSQL outbox worker.
- Advanced notifications and integrations.
- Public API and third-party plugin marketplace.

## Architecture

```text
Next.js portal
    |
    | REST / server actions
    v
NestJS + Fastify backend
    |
    +-- Prisma + PostgreSQL
    |     - users and authorization
    |     - spaces and pages
    |     - databases and records
    |     - versions and trash
    |     - search projection
    |     - outbox events
    |
    +-- MCP adapter
    |     - same use cases
    |     - no direct Prisma access
    |
    +-- Collaboration boundary
          - Yjs + Hocuspocus
          - introduced after the single-user editor is stable
```

The architecture deliberately does not copy Outline's Koa, RPC, Sequelize, MobX, or Vite structure. Outline is a functional reference; the implementation follows the starter's Bun, Next.js, NestJS/Fastify, Prisma, and module conventions.

## Repository Conventions

All implementation must follow the current `neuma` repository instructions:

- Backend features live under `apps/backend/src/modules/<feature>/`.
- Portal features live under `apps/portal/modules/<feature>/`.
- Next.js routing and layouts remain in `apps/portal/app/`.
- Cross-application contracts and utilities belong in `packages/shared/` only when genuinely shared.
- Module-local types, constants, schemas, services, queries, and utilities stay in their owning module.
- Filenames use dot-separated names such as `page.types.ts`, `search.service.ts`, and `space.policy.ts`.
- Code identifiers and filenames are English.
- Business logic returns `Result<T, E>`; technical infrastructure errors are converted at boundaries.
- Prisma access stays behind data-access infrastructure and is not exposed to MCP or UI code.
- New dependencies are added through Bun CLI, never by editing `package.json` manually.
- Every slice must pass repository formatting, linting, typechecking, dependency checks, and relevant tests.

## Domain Model

The model is divided by capability rather than placed in a single shared domain module:

- `User`: employee identity and global role.
- `Workspace`: one company boundary per deployment.
- `Space`: knowledge or work area with visibility and membership rules.
- `SpaceMember`: authorization relation between a user and a restricted space; it is not a subscription.
- `Page`: hierarchical content node and optional database record page.
- `PageBlock`: structured editor content.
- `PageVersion`: immutable published snapshot for history and restore.
- `Database`: configurable collection definition.
- `DatabaseProperty`: typed field definition for a database.
- `DatabaseRecord`: row in a database that can also have a full page body.
- `DatabaseView`: table, board, calendar, or timeline configuration.
- `FileAsset`: metadata for local files and future object storage.
- `SearchDocument`: denormalized searchable projection.
- `OutboxEvent`: durable event used to update projections and future workers.
- `AuditEvent`: security-sensitive mutation history.

Suggested backend modules:

```text
apps/backend/src/modules/
├── users/
├── workspaces/
├── spaces/
├── pages/
├── databases/
├── search/
├── files/
├── collaboration/
└── mcp/
```

The exact internal files are determined during each slice after inspecting existing module conventions. No empty speculative folders should be created.

## Authorization

### Global roles

- `admin`: manages employees, workspace settings, spaces, and all content.
- `editor`: creates and edits content where the space policy allows it.
- `viewer`: reads content where the user has access but cannot mutate it.

### Space visibility

- Spaces are visible to all employees by default.
- Restricted spaces use `SpaceMember` authorization.
- Visibility and mutation authorization are separate decisions.
- A user can discover a public space without automatically gaining edit access.
- Page permissions inherit from the space initially.
- Page-specific exceptions are deferred until the inherited model is stable.

Every read path, search result, MCP tool, and file download must apply authorization before returning data. Authorization must not be implemented only in the UI.

## Content And Editor

Pages use structured editor data rather than arbitrary HTML. The first editor target is Notion-like and includes:

- Paragraphs and headings.
- Ordered and unordered lists.
- Checklists.
- Quotes and callouts.
- Dividers.
- Links.
- Code blocks.
- Tables.
- Toggles.
- Columns or composition blocks where the editor model supports them safely.
- Images and file attachments.
- Supported embeds with explicit allowlists.

ProseMirror is the initial editor foundation. The content schema must be versioned so blocks can be migrated without rewriting historical versions. Search extraction must operate on structured content and produce plain searchable text, titles, tags, and relevant property values.

## Configurable Databases

The database engine is generic, but the first product experience ships with templates:

- Tasks: status, title, assignee, priority, due date, space, and description.
- Projects: status, owner, dates, team, and description.

Users with the appropriate authorization can create or modify database properties and views. Viewers cannot change schemas or records.

Initial property types should cover the smallest useful set for tasks and projects:

- Title.
- Rich text.
- Select.
- Multi-select.
- Person.
- Date.
- Checkbox.
- Number.
- Relation, only when a concrete use case requires it.

Database records are indexable and may open as full pages. A Kanban board is a view grouped by a select/status property, not a separate task storage system.

## Search-First Design

Search is a domain capability from the first content slice, not a later UI feature.

### Initial search behavior

- PostgreSQL `tsvector` projection.
- GIN index for full-text matching.
- `websearch_to_tsquery` for forgiving user queries.
- `ts_rank_cd` or a documented custom ranking function.
- Title and heading weights above body text.
- `unaccent` for accent-insensitive matching.
- `pg_trgm` for partial and typo-tolerant matching.
- Exact filters for tags, space, content type, author, status, and dates.
- Permission predicates inside the query path.
- Cursor pagination and stable ordering.
- Snippets/highlights generated from the matched projection.
- Bilingual support with recorded language metadata and a `simple` fallback.

### Search projection

The `SearchDocument` projection contains enough metadata to query without joining every content table. It stores the current indexable representation, ownership, space, content type, tags, properties needed for filters, version marker, and indexing state.

Content edits create a durable outbox event in the same PostgreSQL transaction as the mutation. A worker consumes pending events, updates the projection, records failures, and retries with bounded backoff. The user-facing edit operation accepts controlled eventual consistency of a few seconds.

Embeddings are intentionally not part of the first implementation. The projection can later gain an embedding column or companion table without changing the page or database-record model.

## MCP

MCP is an adapter over application use cases. It never queries Prisma directly and never bypasses authorization.

Initial read tools:

- `search_neuma`.
- `get_page`.
- `list_spaces`.
- `list_databases`.
- `get_database_record`.

Write tools are separate and require explicit confirmation in the host:

- `create_page`.
- `update_page`.
- `create_task`.
- `move_page`.

The current MCP TypeScript SDK supports Bun and provides `stdio` for local process integrations and Streamable HTTP for remote integrations. The first integration should use local `stdio`; authenticated HTTP can be added when remote access is required.

Tool input and output schemas are explicit and bounded. Search results should return structured metadata plus concise text, with resource links for larger page content where supported.

## Files And Storage

The first local implementation uses the filesystem. It must be hidden behind a `StorageProvider` boundary with operations for upload, download, delete, and metadata lookup. The database stores ownership, content type, size, checksum, and the logical asset identifier, not an assumption about a permanent filesystem path.

S3-compatible storage is a future deployment option. The local provider must not leak into page or editor domain logic.

## Collaboration

Collaboration is implemented after single-user page editing, versioning, permissions, and search extraction are stable.

- Yjs provides CRDT state and conflict-free merges.
- Hocuspocus provides the collaboration WebSocket boundary and persistence hooks.
- ProseMirror remains the editor schema and rendering model.
- Authorization is checked during collaboration connection and document access.
- PostgreSQL stores durable snapshots or updates according to the chosen persistence strategy.
- Valkey is introduced only when multiple collaboration nodes require shared coordination.

The collaboration module must not become the source of truth for authorization or page metadata. It synchronizes content state; the application domain owns identity, permissions, versions, and lifecycle.

## Roadmap

### Phase 0: Documentation and foundations

- Keep this design and the future backlog current.
- Record domain boundaries and naming decisions.
- Add license and dependency inventory process.
- Define API error and authorization conventions.

### Phase 1: Existing authentication and company workspace

- Reuse the starter's email/password auth.
- Establish the single workspace boundary.
- Add employee global roles.
- Add authorization primitives and test policies.

### Phase 2: Spaces and pages

- Create/list/update/archive spaces.
- Add public internal and restricted visibility.
- Add space memberships as authorization.
- Create hierarchical pages.
- Add page lifecycle and trash.
- Emit audit and outbox events.

### Phase 3: Editor and versioning

- Add the structured ProseMirror document schema.
- Implement the complete approved block set incrementally.
- Save immutable page versions.
- Restore a previous version through an explicit use case.
- Extract searchable text from blocks.

### Phase 4: Configurable databases

- Add database definitions and typed properties.
- Add database records with optional page bodies.
- Ship Tasks and Projects templates.
- Add table, board, calendar, and timeline views as data-driven configurations.
- Apply schema and record permissions.

### Phase 5: Search and MCP

- Create SearchDocument projection and PostgreSQL indexes.
- Implement bilingual text normalization, tags, filters, ranking, snippets, and pagination.
- Add outbox consumer and retry state.
- Add read-only MCP tools over use cases.
- Add write MCP tools only after confirmation and authorization tests.

### Phase 6: Files and multimedia

- Add local filesystem provider.
- Add asset metadata and authorization.
- Add editor upload and rendering blocks.
- Add safe embed allowlists.

### Phase 7: Real-time collaboration

- Add Yjs document state.
- Add Hocuspocus connection/authentication boundary.
- Add persistence and recovery.
- Add presence, cursors, reconnect behavior, and conflict tests.
- Add Valkey only if multi-process deployment requires it.

### Phase 8: Operations and jobs

- Evaluate whether the outbox worker is sufficient.
- Add BullMQ and Valkey only for concrete delayed/retried workloads.
- Add notifications, scheduled jobs, and indexing maintenance commands.
- Add metrics, health checks, backup/restore documentation, and operational runbooks.

## Backlog For Later

These items are intentionally excluded from the initial implementation but must remain visible:

- Google Workspace and Microsoft Entra SSO.
- External guests and public document sharing.
- Multi-tenant organizations.
- Billing and subscriptions.
- Embedding-based semantic search.
- S3-compatible object storage and CDN delivery.
- Advanced page-level permission exceptions.
- Team mentions, comments, notifications, and inbox.
- Slack, GitHub, Jira, Linear, and calendar integrations.
- Import/export compatibility with Notion, Markdown, and Outline.
- Public API keys and webhooks.
- Plugin/extension marketplace.
- Offline-first client support.
- Advanced analytics and knowledge freshness scoring.

## Licensing And Provenance

Outline and Notion are functional references for the user experience. No source code, styles or assets are taken from them; every component is written for this project.

Preferred independent dependencies for new capabilities:

- ProseMirror: MIT.
- Yjs: MIT.
- Hocuspocus: MIT.
- BullMQ: MIT.
- Valkey: BSD-3-Clause.

Every added dependency needs a license check, transitive dependency review, and a record in the project's dependency inventory. This document is not legal advice; production distribution requires a formal license review.

## Verification Strategy

Every implementation slice must include the smallest meaningful tests:

- Domain policy tests for roles, visibility, and membership.
- Service/use-case tests for page, database, version, and trash flows.
- Query tests for authorization predicates and search filters.
- Integration tests for Prisma migrations and outbox processing.
- MCP contract tests for schemas, permissions, structured output, and errors.
- Portal tests for editor states, keyboard access, loading, empty, and error states.
- Full repository `bun run check` before completing a slice.
- Relevant build and test commands before handing a slice back.

## Slice-Squad Rules For Implementation

Implementation will be split only after this design is approved and the implementation plan exists.

- Maximum five slices per round.
- Slices must touch disjoint file scopes.
- Vertical slices must deliver working value, not isolated layers.
- Shared foundations are implemented and verified before parallel slices when file scopes would overlap.
- Agents do not commit, spawn agents, or modify another slice's scope.
- Every changed file is read and verified after each agent completes.
- A final consolidation pass searches for duplicate types, constants, helpers, schemas, and logic before tests are run.
