# MCP Content Authoring Contract

> Status: future proposal. This document defines how an MCP will have to
> create and modify content once it is implemented. It does not add MCP tools
> to the current implementation.

## Goal

An agent must be able to work with pages using semantic structures, not by
imitating visual structures with HTML, fragile Markdown or spaces.

The canonical content contract remains the ProseMirror-compatible JSON
document. The MCP will be an adapter over the page use cases and will use
the same validations, permissions, versioning and events as the portal.

## Representation Rule

Each intent must use the block that matches its semantics:

| Intent | Representation | Rule |
| --- | --- | --- |
| Data in rows and columns | Native table | Must persist as `table`, with structured rows, cells and headers |
| ASCII diagrams, trees, logs or commands | Monospaced block | Must persist as a preformatted or code block, preserving spaces and line breaks |
| Executable code | Code block | Must include the language when it is known |
| Visual nodes and relationships | Structured diagram | Will be a future capability; it must not be simulated as a table |
| Normal text | Paragraphs, headings and lists | Must not contain hidden structures made with spaces |

A table written with `|` characters, dashes or spaces is not a native table.
It can be useful as monospaced text, but it must not be presented as tabular
data if the agent needs to sort, edit or query its cells.

## Future Operations

The tools will have to be small, explicit and reviewable:

- `create_page`: creates a page and can receive initial blocks.
- `append_block`: adds a block at the end or under a parent block.
- `insert_table`: creates a table with columns, headers and structured rows.
- `update_table_cell`: changes a cell identified by table, row and column.
- `insert_code_block`: adds code or monospaced text preserving its format.
- `insert_diagram`: adds a structured diagram once that block exists.
- `read_page_blocks`: returns the structured blocks of a page with their ids and order.

Do not start with a generic operation such as `rewrite_page` or
`replace_page_content`. Bounded operations reduce the risk of an agent
destroying content it did not intend to modify.

## How the Agent Works

The agent must:

1. Read the page and get the ids of the relevant blocks.
2. Choose the block type according to the intent, not according to how it looks on screen.
3. Use a specific operation to create or modify that block.
4. Receive the resulting structured state in the write response when
   possible.
5. Re-read the page only to confirm the state, not to rebuild it
   from plain text.

Conceptual example:

```json
{
  "type": "table",
  "header": ["Servicio", "Estado", "Latencia"],
  "rows": [
    ["Portal", "Operativo", "120 ms"],
    ["Backend", "Operativo", "340 ms"]
  ]
}
```

The example above expresses a table. It must not be turned into a string with
manual alignment to try to produce the same result.

## Security and Consistency

- Each tool must resolve the principal's identity and validate access to the
  space before reading or writing.
- Writes must go through the same services the portal uses.
- The MCP must not query Prisma directly.
- Write responses must include the persisted state or its version
  so that the agent does not depend on waiting for an eventual projection.
- `update_table_cell` must fail explicitly if the table, row or column
  does not exist.
- Unknown blocks or incompatible documents must be rejected, not
  silently degraded to plain text.

## Acceptance Criteria

The future implementation meets this contract when:

- An agent creates a table that the UI recognizes as a native table.
- An agent modifies a cell without replacing the rest of the page.
- An agent creates a monospaced diagram without losing spaces or line breaks.
- `read_page_blocks` returns types, ids, order and parent-child relationships.
- An agent does not need to produce HTML, Markdown or manual spacing to use
  tables or structured content.
- Operations respect permissions, versioning, auditing and events just like
  operations performed from the portal.

## Relationship With the Existing Architecture

- `docs/superpowers/plans/2026-08-01-neuma-editor.md` defines the
  ProseMirror-compatible JSON document as the shared contract.
- `docs/superpowers/specs/2026-08-01-neuma-design.md` defines MCP as
  an adapter over authorized use cases.
- `docs/superpowers/plans/2026-08-05-neuma-single-page-primitive.md` prioritizes
  bounded reads and writes per block.

This document makes concrete how those decisions must be applied to
content authoring by agents.
