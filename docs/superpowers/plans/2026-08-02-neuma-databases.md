# Neuma Databases Implementation Plan

> **Status: SUPERSEDED (2026-08-05).** The data model described here — `DatabaseRecord` as an entity separate from `Page` — is replaced by the single-page-primitive model in `docs/architecture/adr/008-adopt-single-page-primitive.md`, executed by `docs/superpowers/plans/2026-08-05-neuma-single-page-primitive.md`.
>
> What survives from this plan: the typed property system, the Tasks/Projects templates, and the table/board view logic. What is replaced: `DatabaseRecord` (records become pages), the optional `pageId` bridge described below (unnecessary once there is one primitive), and the top-level `/databases` route. Kept for the history of why the property engine looks the way it does.

> **For agentic workers:** Use the slice-squad workflow. Agents must not spawn agents, commit, push, or edit files outside their assigned scope.

**Goal:** Add a configurable database engine with typed properties, records, Tasks/Projects templates, table data, and a permission-aware Kanban view.

**Architecture:** Databases belong to spaces. A database defines typed properties and views; records store validated property values and may later reference a full Page body. Tasks and Projects are templates over the same engine, not separate persistence modules. The backend owns schema/value validation and authorization. The portal renders table and board views from one normalized record contract.

**Tech Stack:** Bun, NestJS, Fastify, Prisma 7, PostgreSQL, Zod, Next.js 16, React 19, existing Result/auth/policy conventions.

---

## Scope

This round implements database definitions, typed properties, records, Tasks/Projects templates, table reads, and Kanban grouping. It defers calendar/timeline views, relations, formulas, rollups, automations, comments, and database search indexing.

## Data Model

Required Prisma models, one per file:

- `Database`: space-owned configurable collection with name, slug, template kind, lifecycle, creator, timestamps.
- `DatabaseProperty`: ordered property definition with key, label, type, required flag, options JSON, and database relation.
- `DatabaseRecord`: database-owned record with title, property values JSON, optional page id, lifecycle, creator, timestamps.
- `DatabaseView`: database-owned view with name, type, configuration JSON, and default flag.

Required enums, one per file:

- `DatabaseTemplate`: `TASKS`, `PROJECTS`, `CUSTOM`.
- `DatabasePropertyType`: `TITLE`, `RICH_TEXT`, `SELECT`, `MULTI_SELECT`, `PERSON`, `DATE`, `CHECKBOX`, `NUMBER`.
- `DatabaseViewType`: `TABLE`, `BOARD`.
- `DatabaseLifecycle`: `ACTIVE`, `ARCHIVED`.

Relations must enforce space ownership through database queries and authorization, not through UI assumptions. Record properties are JSON because the schema is configurable, but every value is validated against its property definition before persistence.

## Slice Order

### Slice 1: Database backend foundation

**Files:**

- `packages/db/prisma/models/`
- `packages/db/prisma/enums/`
- `packages/db/prisma/migrations/`
- `apps/backend/src/modules/databases/`
- `apps/backend/tests/unit/modules/databases/`
- `apps/backend/tests/integration/` only for database migrations/authorization where the existing setup supports it

**Deliverable:** Authorized admins/editors can create databases, define typed properties, create/update records, create table/board views, and load normalized records. Viewers can read authorized databases and records but cannot mutate schemas or data.

### Slice 2: Tasks/Projects templates and portal views

**Files:**

- `apps/backend/src/modules/databases/` only for template definitions if Slice 1 leaves a clearly separate template concern
- `apps/portal/app/`
- `apps/portal/modules/databases/`
- `apps/portal/tests/unit/modules/databases/`

**Deliverable:** Portal users can open a database, view records in a table, create a Tasks or Projects database from a template, and render a Kanban view grouped by a select property such as status.

## Authorization

- Admins manage databases, schemas, records, and views.
- Editors manage databases and records where the space policy permits editing.
- Viewers can read authorized databases and records only.
- Restricted-space membership is checked before every database query.
- Database property/schema mutations are separate policies from record mutations so future roles can be added without rewriting components.

## Property Validation

Use a property-type dispatch registry, not a growing conditional spread across controllers:

- `TITLE`: non-empty string with maximum length.
- `RICH_TEXT`: string or structured PageContent reference according to the agreed record contract.
- `SELECT`: one configured option key.
- `MULTI_SELECT`: unique configured option keys.
- `PERSON`: existing employee id with workspace membership.
- `DATE`: ISO date/datetime validated by a shared parser.
- `CHECKBOX`: boolean.
- `NUMBER`: finite number with optional configuration limits.

The database schema definition is validated when created/updated. Record values are validated against the persisted definition on every write. Unknown property keys are rejected instead of silently dropped.

## Templates

Templates are declarative definitions consumed by one template factory:

- `Tasks`: title, status select, assignee person, priority select, due date, description rich text.
- `Projects`: title, status select, owner person, start date, end date, team multi-select, description rich text.

Creating a template must be idempotent within the requested database creation transaction. A template is not a separate model and must not duplicate database/record services.

## Views

### Table

- Stable ordering by record order then id.
- Explicit property columns from view configuration.
- Empty/loading/error states.
- Permission-filtered records.

### Board

- Configuration names one select property as the grouping key.
- Columns derive from configured select options.
- Records without a value appear in an explicit `Sin estado` column.
- Drag/drop mutations are deferred until the record update contract is verified; the first board is read-only grouping plus normal record editing.

## TDD Requirements

- Test property-type validators before implementation and verify RED.
- Test schema creation rejects duplicate keys and invalid options.
- Test record writes reject unknown keys and mismatched property values.
- Test admin/editor/viewer authorization for schema, records, and views.
- Test template definitions produce expected properties without duplication.
- Test board grouping handles configured options, missing values, and stable ordering.
- Test restricted-space database reads never return records for non-members.

## Verification Gate

- Run Bun dependency/migration/generate commands when applicable.
- Run focused database tests and integration tests.
- Run full backend and portal suites after Slice 2.
- Run root `bun run check` with zero code warnings/errors.
- Run root `bun run build`.
- Run Prisma validate/generate and migration against local PostgreSQL.
- Read every changed file after each slice.
- Run a fresh consolidation pass for duplicate validators, property types, template definitions, adapters, and board grouping logic.

## Deferred

- Calendar and timeline views.
- Relation properties, formulas, rollups, and computed fields.
- Drag/drop board mutations.
- Database record full-page editing integration.
- Database search projection and MCP database tools.
- Automations, notifications, comments, and activity history.
