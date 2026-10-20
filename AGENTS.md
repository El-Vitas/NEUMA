# AGENTS.md

> Single source of truth for engineering standards across the entire monorepo.

Caution is preferred over speed. Clarity is preferred over cleverness. Simplicity is preferred over flexibility.

---

## Product Principle: Agent First

Neuma is **Neural Enterprise Unified Memory & Agents**: the company brain, built for AI agents first and for people second. The portal exists and people use it, but every design decision starts from what an agent needs.

- **Parity.** Anything a person can do in the portal, an agent can do through the MCP: read, search, create, edit, move, comment, share, restore. A feature is not done until its MCP path exists and is tested. A read-only MCP path for something people can write is a gap, not a scope choice.
- **Efficiency.** The agent path is the efficient one: few calls, precise results, no over-fetching. Search returns citable blocks with stable ids, reads can target a block instead of a whole page, and writes are block-level operations, not whole-document rewrites.
- **Context.** An agent must find what it needs without guessing: stable ids, links between blocks, search before answering, and responses that say where each fact lives so it can be cited.
- **Same rules.** Agents get exactly the permissions of the person who owns their token. There is no agent bypass and no agent-only shortcut around validation, versions or audit.
- **Self-describing.** The MCP explains itself: how to use each tool goes in its instructions and tool descriptions, never in repository docs the agent does not read.

When a change makes the portal better and the agent path worse, the change is wrong.

---

## Setup Commands

- Install dependencies: `bun install`
- Run check (format + lint + typecheck): `bun run check` (per-app) or `turbo run check` (root)

---

## Dependencies

**Never modify `package.json` directly.** Use the Bun CLI:

```
bun add <package>
bun add -d <package>
bun remove <package>
bun update <package>
```

No silent dependency changes.

---

## Engineering Philosophy

### Think Before Writing

State assumptions explicitly. If unclear, stop and ask. If multiple interpretations exist, list them. Push back against overcomplication. Prefer the simplest correct solution.

**Don't get stuck.** If you don't understand the request, ask. Never force a misinterpretation.

**Confirm before acting.** Before writing code or making changes, restate what you understood and wait for confirmation. Example: *"Ok, según lo que entendí quieres que..."*

### Minimalism Over Engineering

Write the minimum code required. No speculative abstractions, no "future proofing", no over-configurable systems, no premature optimization.

### Surgical Changes Only

Modify only what is required. Do not refactor unrelated code. Do not reformat surrounding code. Match existing style exactly. Remove only unused code introduced by your change.

---

## TypeScript Discipline

- Strict mode assumed.
- No `any`. No `as unknown as`. No blind casting.
- No non-null assertions unless provably safe.
- No leaking internal types across modules.
- Explicit return types on exported functions.
- Model domain concepts, not just shapes.

---

## Imports Policy

- All imports static and top-level.
- No `await import()` inside functions. No `try/catch` around imports.
- No deep relative imports that break module boundaries.
- No circular dependencies.
- No barrel `index.ts` files unless the folder exposes a clear public API that justifies the barrel.

---

## Exports

- **Named exports always.** `export const` over `export default`.
- Default exports only for Next.js routing files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Default exports rename silently and break refactoring tools.

---

## Naming

- All code identifiers in English — functions, variables, types, constants, filenames.
- No abbreviations.
- No generic names (`data`, `value`, `obj`, `tmp`).
- Functions describe behavior. Variables describe meaning.
- Booleans read like predicates (`isActive`, `hasAccess`).

---

## File Organization

One concern per file. File names describe what they contain.

### Module Structure

```
<module>/
├── types/          # Interfaces, types, enums
├── constants/      # Constants, magic strings, option arrays
└── lib/            # Pure utility/helper functions
```

Each module owns its types, constants, and utilities. Code shared by 2+ apps or packages
goes in `packages/shared/`. Code shared within a single app goes in that app's `shared/`
or `common/` directory.

### Naming Convention

Dot-separated. No kebab-case. Names read left to right: broader → narrower.

**Pattern:** `{domain}.{descriptor}.{suffix}`

| Type | Pattern | Examples |
|---|---|---|
| Types | `{domain}.types.ts` | `user.types.ts`, `auth.types.ts` |
| Constants | `{domain}.constants.ts` | `product.constants.ts`, `order.constants.ts` |
| Utilities | `{domain}.lib.ts` | `auth.lib.ts`, `cliente.lib.ts` |

App-specific conventions (components, DTOs, views, etc.) are defined in each app's
`AGENTS.md`.

---

## Functions

- **Arrow functions with `const` only.** Never the `function` keyword. `const fn = () => { ... }` over `function fn() { ... }`.
- One responsibility only.
- No hidden side effects.
- No more than 2 indentation levels.
- Early returns over nested branches.
- **Section comments are a symptom of missing extraction.** If you need `// validation`, `// step 1`, or `// build result` inside a function body, that section must become a named function instead. The comment disappears.
- **Tell, Don't Ask.** Callers ask with a named predicate or operation (`canEditOrder(user, order)`), instead of reaching into internals to apply the logic themselves.

---

## Control Flow

- Prefer `switch` over long `if/else` chains.
- No complex boolean expressions inline — extract them.
- Avoid flag parameters that change behavior drastically.

---

## Error Handling

- **Result pattern first.** Use `Result<T, E>` as the default. Business logic never throws.
- `try/catch` only at infrastructure boundaries (HTTP, DB, external APIs) to convert technical exceptions into `Result`.
- Never swallow errors. Never throw generic `Error` without context.
- A function either returns `Result<T, E>` or throws a technical exception, never both for the same failure mode.

---

## Logging

- **Pino everywhere.** Same logger in all apps. JSON in production, `pino-pretty` in development.
- **Uniform format.** All apps produce identical JSON so cloud logging indexes them together.
- **Chilean timezone.** All timestamps in `America/Santiago`. Format: `DD/MM/YYYY HH:MM:ss`.
- **Log levels by name in UPPERCASE.** `INFO`, `WARN`, `ERROR`, `DEBUG`. Never numeric Pino levels.
- **Stack trace on errors.** Every `ERROR` level log includes the full stack trace. No PII in traces (emails, tokens, secrets).
- **File reference.** Every log includes the file and line that emitted it.
- **No PII in logs.** No emails, passwords, tokens, API keys, personal data. Obfuscate or omit.
- **Never `console.log`.** All logs go through Pino.

---

## Comments

**No inline comments explaining _what_ code does.** If explanation is required, refactor — extract function, rename variable, simplify logic.

Allowed:
- Docstrings on exported functions when necessary.
- Short explanation of architectural decisions.
- Public API documentation.

Comments explain **why**, not **what**. They are written in **English**, are short (one line by default, five at most), never tell history or process, and never carry secrets or personal data. The full rules live in `.agents/skills/code-comments/SKILL.md`, and `local/clean-comments` enforces what can be checked mechanically. This section overrides the "zero comments" default of `vitas-guidelines`.

---

## Modularity

- Each module has one clear purpose. Hides internals. Exposes minimal surface.
- No circular imports. No cross-module deep access. Depend on contracts, not concrete details.
- No reaching into other module internals.
- Cross-feature communication goes through services, not direct DB access.

---

## DRY

- **Search before writing.** Before creating any new helper, type, schema, or constant, check the codebase first — feature libs, shared libs, packages. Reuse over new code.
- Eliminate duplication.
- Extract shared logic only when duplication is real.
- Duplicate twice → consider refactor.
- Duplicate once → leave it.

---

## Anti-Patterns (Forbidden)

- Global mutable state
- Catch-all utility folders
- Boolean-driven behavior switching
- Silent fallback logic

---

## Async

- No floating promises. Always await or handle.
- No mixing `.then()` with `async/await`.
- Keep async boundaries clear.

---

## Testing

- **TDD always.** Write the test first, then implement.
- Tests live in `tests/`, mirroring `src/`.
- Test behavior, not implementation. Don't test private methods.
- Follow Arrange–Act–Assert.
- Tests must be deterministic.

---

## Business Rules

- Business rules live in `docs/business-rules/` as YAML files (one per feature).
- To query rules: `bun run rules:query --feature FEA-XXX` or `--id BR-NNN` or `--scope cross-cutting`.
- To add/modify a rule: pipe YAML to `bun run rules:add` (auto-dumps to YAML files).
- Never edit YAML files directly if you're an AI — use `rules:add`. Humans can edit YAML directly.
- After humans edit YAML, run `bun run rules:build` to sync SQLite.
- To retire a rule, replace it: pass `supersedes: BR-NNN`. The old one is kept, marked and linked — history is never deleted.
- `bun run rules:delete --id BR-NNN` is only for a material mistake (wrong feature, duplicate, half-written), never to retire a rule that was thought through.

---

## Check Discipline

- `bun run check` must exit with **0 warnings and 0 errors** — both count.
- **No shortcuts.** Never add `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, or any suppression comment to make checks pass.
- **No rule tampering.** Never modify ESLint rules, TypeScript configs, or any config file to bypass a violation.
- **No silent fixes.** Never alter code to evade detection (e.g., renaming a constant to lowercase just to skip `screaming-snake-in-constants`). Every violation must be fixed properly according to the conventions.
- **When in doubt, ask.** If a rule blocks code that genuinely cannot be fixed while keeping correctness, stop and inform the user so they can decide how to proceed.

---

## PR Discipline

- Small, focused changes only.
- No drive-by refactors. No formatting-only commits.
- No dependency edits without explicit instruction.
- No mixing concerns in one PR.
- **Verify before finalizing.** Run `bun run format` and `bun run check` (per-app) or `turbo run format` && `turbo run check` (root) before committing or asking to commit.
- **Never commit without explicit user permission.** Wait for the user to say "commit" or "pr".

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
