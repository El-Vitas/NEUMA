---
name: business-rules
description: Use when querying, adding, or modifying business rules in the docs/business-rules/ system. Do NOT read YAML files directly — use CLI commands.
metadata:
  version: '2.0'
  scope: [general]
  auto_invoke: 'When you need to understand business requirements, check rule lineage, or propose new rules'
---

# Business Rules

## DO NOT read YAML directly

The YAML files in `docs/business-rules/` are the source of truth for humans. You never open them. You use CLI commands.

## What is a business rule

A business rule documents **what the system must do** — the behavior, the flow, the constraint. It captures what is required from a business or operational perspective.

### Belongs here

- WHAT the system must do — even if technical in nature. A step-by-step flow like "connect to service X, authenticate with token, send payload, process response" is valid.
- Business constraints — limits, permissions, validations, state machines, cardinalities.
- Operational requirements — logging of operations, export capabilities, file restrictions.

### Does NOT belong here

Implementation-specific jargon: library names, class names, framework patterns, DI tokens, file paths, architectural pattern names.

| Wrong (implementation jargon) | Right (what the system must do) |
|---|---|
| "Use Strategy pattern with IStorageProvider" | "Files are stored outside the database and are accessible via URL" |
| "Log with INFO level on success, WARN on invalid transitions" | "Every operation must record: what was done, result, duration, and timestamp" |
| "Tests require 80% coverage, verified in CI" | "Code must have automated tests covering success, error, and validation paths" |
| "Inject provider via token in global module" | "Local storage in development, cloud storage in production" |

The litmus test: **can you explain this rule to a stakeholder without naming a library, class, or file path?** If you need a specific tool or implementation detail to make the rule understandable, it is too technical.

## Query

```bash
# All active rules for a feature
pnpm run rules:query --feature FEA-ORD

# All statuses in a feature (active, superseded, inactive)
pnpm run rules:query --feature FEA-ORD --status all

# By status within a feature
# A specific rule with its full evolution history
pnpm run rules:query --id BR-104

# Cross-cutting rules (apply system-wide)
pnpm run rules:query --scope cross-cutting

# All active rules across every feature
pnpm run rules:query --all

# All rules across features by status
pnpm run rules:query --status all

# List all features with metadata + rule counts per status
pnpm run rules:query --features

# Just feature IDs and names (to find where a requirement fits)
pnpm run rules:query --features --names

# Search features by name or purpose
pnpm run rules:query --search cliente
```

Output is JSON. The `lineage` field in `--id` queries shows every past version with `superseded_reason`. The `--features` output includes `rules: { active, superseded, inactive }` counts.

## Add or modify

Pipe YAML to `rules:add`. **Do NOT include `id`** — it is auto-generated as a deterministic hash from feature + rule content:

```bash
pnpm run rules:add << 'YAML'
feature: FEA-XXX        # Required
feature_name: Feature Name
feature_purpose: What it does.
feature_scope: feature-name-or-cross-cutting
status: active          # active | superseded | inactive
title: Short title
rule: The business rule itself.     # Required
why: Reason it exists.
context: Scope, exceptions, notes.
supersedes: ~           # Pass BR-xxx when replacing an existing rule
scenarios:
  - title: Scenario name
    given: Context
    when: Trigger
    then: Expected result
YAML
```

- **ID auto-generated** as `BR-{sha256(feature + ":" + rule)[:7]}` — deterministic, same rule → same ID
- **Duplicate detection** — if same content already exists, skipped silently
- **Supersedes validation** — target must exist and be `active`
- **Status validation** — must be one of: `active`, `superseded`, `inactive`
- **Always add `feature_name`, `feature_purpose`, and `feature_scope` when creating a new feature.** Omit them when adding rules to an existing feature.

## Supersede behavior

When you set `supersedes: BR-xxx`:
1. New rule is created with auto-generated ID
2. Old rule (`BR-xxx`) is marked `superseded` with `superseded_by` linking to the new ID
3. Backup is created in `history/`

Validation: target must exist and be `active`. Cannot supersede already superseded or inactive rules.

## After humans edit YAML

```bash
pnpm run rules:build    # Sync YAML -> SQLite
```

## Lifecycle

- `active` — approved, official knowledge
- `superseded` — was active, replaced by another rule. Preserved for history
- `inactive` — no longer applicable but not superseded (archived)

State changes only happen when a human reviews. The default status for new rules is `active` unless there is a reason to mark it otherwise.

## No generated files

SQLite is gitignored. YAML is the source of truth. Backups go to `docs/business-rules/history/` automatically on every `dump`.
