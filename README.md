# Neuma

**English** · [Español](./README.es.md)

**Neural Enterprise Unified Memory & Agents.** The company brain: every block is a neuron, every link a synapse, and agents think with it.

<p align="center">
  <img src="docs/media/neuma.webp" alt="An agent searches NEUMA for the pricing decision, writes the draft email on Camila's page citing the source and marks the task as done." width="960">
</p>

Neuma is an organization's internal memory. Everything is a block, even the page: spaces with pages that several people edit live, collections with views, full-text search and backlinks. AI agents work in it like one more person, through an MCP server with the same permissions as the application.

**Agents first.** Neuma is designed for AI agents before people. It is not enough for an agent to be able to do what a person does: Neuma invents tools, algorithms and structures built around how an agent works, with precise, citable context, changes since its last visit and actions that can be previewed. The portal exists and is used, but the product is a memory that agents think with (see "Product Principle: Agent First" in `AGENTS.md`).

For agents, Neuma is a unified memory architecture (*Neural Enterprise Unified Memory Architecture*): every piece of knowledge has a stable id that can be cited, is linked to others and is found with a search, and each agent only sees what the person who owns its token can read.

The name also comes from neumes, the first musical notation: small signs that, together, form the chant. Here every block is a neume.

Each deployment serves a single organization, and only people for whom an administrator creates an account get in.

## What it does

- **Pages and spaces.** A hierarchy of pages with version history, trash, favorites, icons and export. Spaces can be internal, restricted or private.
- **Live editor.** A ProseMirror editor over blocks, with a live channel and Yjs for the text of each block, with Mermaid diagrams, formulas, tables, attachments and mentions between pages.
- **Collections.** A page can carry a property schema, and its child pages are seen as a table, board, list, gallery or calendar.
- **Search and backlinks.** PostgreSQL full-text search by page and by block, and the "Linked from" section. Both come from the blocks and are up to date as soon as the change is confirmed.
- **Agents.** An MCP server at `/api/v1/mcp` with limited-scope access tokens. Every action of an agent is audited.

## Structure

| Workspace | What it is | Port |
|---|---|---|
| `apps/backend` | NestJS 11 API on Fastify and Bun, the MCP server and the editor's live channel | 3000 |
| `apps/portal` | Next.js 16 (App Router), React 19 and Tailwind 4 | 3010 |
| `packages/db` | Prisma ORM 8 contract, migrations and seed for PostgreSQL 18 | — |
| `packages/shared` | Types, schemas and logic shared between backend and portal | — |
| `packages/design` | Design tokens in light and dark mode | — |
| `packages/eslint-rules` | ESLint rules that enforce the repo's architecture | — |
| `packages/rules-cli` | CLI for the business rules registry in `docs/business-rules/` | — |

## Local development

Requires Bun 1.4 and Docker or Podman for PostgreSQL.

```bash
bun install
cp .env.example .env
docker compose up -d postgres
cd packages/db && bun run db:migrate:deploy && bun run db:seed && cd ../..
bun run dev
```

`bun run dev` starts the backend and the portal; no other process is needed.

The seed creates three users, `admin@example.com`, `worker@example.com` and `client@example.com`, with the password defined in `packages/db/prisma/seed/users.seed.ts`.

## Commands

```bash
bun run dev          # backend and portal in watch mode
bun run check        # format, lint and types for the whole monorepo
bun run check:ramless  # the same, one task at a time, for low-memory machines
bun run test:ramless  # tests for all workspaces
bun run rules:query  # query the business rules
```

## With Docker

`docker-compose.yml` starts PostgreSQL, the migrations (once), the backend and the portal.

There is no open sign-up. On a fresh install, the first administrator is created once from the server, and afterwards administrators create accounts from "Users":

```bash
read -rs PASSWORD && printf '%s' "$PASSWORD" | docker compose exec -T backend \
  bun run admin:create --email you@example.com --name "Your Name"; unset PASSWORD
```

## Documentation

- `AGENTS.md`, at the root and in each app: the engineering conventions, for people and agents.
- `docs/architecture/adr/`: the architecture decisions and why they were made.
- `docs/business-rules/`: the business rules, versioned and queryable with `bun run rules:query`.
- `docs/scope/`: the current scope and what is left out.
