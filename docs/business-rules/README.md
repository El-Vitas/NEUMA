# Business Rules Registry

Versioned registry of the project's business rules. Each feature has a YAML file (`fea-XXX.yaml`) with identified rules (`BR-NNN`), their business reason and Given/When/Then scenarios that serve as the basis for acceptance tests.

## Files

- `fea-aut.yaml` - authentication and access control rules (real example, working with Company Brain).
- `fea-usr.yaml` - user management rules (real example, working with Company Brain).
- `fea-template.yaml` - template for creating the YAML of a new feature (copy, rename and fill in; it is not indexed as a real rule until it is given definitive ids).

## Conventions

- Feature `id`: `FEA-` + 3 letters (`FEA-ORD`, `FEA-PAG`).
- Rule `id`: `BR-NNN`, globally sequential (not per feature).
- `status`: `draft` | `active` | `deprecated`.
- Every new rule is born with a `why`; a rule without a business reason is not accepted.
- Rules are written in English, ids and statuses included.

## CLI

The registry is indexed into SQLite with `packages/rules-cli` (associated skill in `.agents/skills/business-rules`):

```bash
bun run rules:build          # rebuilds rules.db from the YAML files
bun run rules:query <text>   # searches rules
bun run rules:add            # adds a rule via the CLI
bun run rules:dump           # exports the registry
bun run rules:delete --id BR-xxx   # deletes a rule entered by mistake
```

`rules:delete` is not the way to retire a rule. A rule that was badly thought out is
replaced with `supersedes`, and the old one stays marked and linked to the new one:
having been wrong in our thinking is part of the product's history and is kept.
`delete` is for a material mistake (the wrong feature, the same rule submitted twice,
a half-written submission), and it refuses to touch a rule that has history hanging
from it.

`rules.db` is a generated artifact: it is not versioned, it is rebuilt with `rules:build`.
