---
name: code-comments
description: Use when writing, reviewing or cleaning comments in this repo's code (TypeScript, TSX, tests, Prisma schema, scripts). Defines when a comment earns its place, what it may say, what it must never say, how long it may be, and the language it is written in. Also the playbook for a comment-cleaning sweep over many files.
metadata:
  version: '1.0'
  scope: [general]
  auto_invoke: 'When adding, editing or removing code comments, or when asked to clean comments'
---

# Code comments

The code says **what** it does and **how**. The tests say **what it must keep doing**. A comment is
only for what neither can say: **why** it is this way, and what a reader would otherwise get wrong.

The best comment is the one that was not needed because the name, the type or the test already says
it. Every comment costs reading time and goes stale when the code changes and the comment does not.
A wrong comment is worse than none.

## The test every comment must pass

Read the comment, then cover it and read only the code. Ask:

1. **Would a competent reader, new to this file, miss something important without it?** If not, delete it.
2. **Does it say why, or warn about something the code cannot show?** If it only restates what the
   code does, delete it.
3. **Will it still be true after the next unrelated change?** If it describes history, a process or a
   moment in time, delete it or rewrite it in the present tense.
4. **Is it the shortest form that carries the point?** If not, cut it.

A comment that survives all four stays, trimmed. Everything else goes.

## Keep (and write) a comment for

- **Intent behind a non-obvious choice.** Why this approach and not the obvious one; the alternative
  that was rejected and why. *"Locks the row: two writers reading the same shape would each overwrite
  the other's column."*
- **A constraint the code cannot express.** Ordering requirements, invariants, a limit's reason, a
  unit or format. *"Milliseconds, because the browser timer takes them."*
- **Code that looks wrong or redundant but is not.** Explain it so nobody "simplifies" it away.
  *"Imported bare and first: it installs the DOM Mermaid needs before Mermaid loads."*
- **A workaround.** Name what it works around (library, version, browser, platform) and link the issue
  when there is one.
- **The safety of an unavoidable assertion** (`as`, `!`) or an empty `catch`: why it cannot fail, or why
  doing nothing is correct.
- **A source or standard.** Link the RFC, spec, doc page or copied snippet where it helps the reader.
- **A public contract that the name and type do not finish saying.** Exported functions, types and
  constants whose purpose, units, edge cases or side effects are not obvious from the signature.
- **A tool directive.** `biome-ignore`, `eslint-disable`, `@ts-expect-error` keep their exact syntax and
  carry a short reason after the colon. (Adding new suppressions is still forbidden by AGENTS.md.)
- **A known limitation**, written as `TODO(TICKET-ID): what is missing` when a ticket exists. A bare
  `TODO` with no owner or ticket is deleted or turned into a ticket.

## Delete (or never write) a comment that

- **Restates the code or the name.** `/** Returns the user. */` over `getUser`. `// increment i`.
  `/** The page id. */` over `pageId: string`.
- **Restates the types.** TypeScript already says them: no `{string}` in JSDoc, no `@param x the x`,
  no `@returns` that repeats the return type. `@param`/`@returns` only when they add information.
- **Labels a type or a field with its own name.** `/** A comment on a block. */` over `McpComment`,
  `/** Who owns the page, if anyone. */` over `ownerId?: string`. Most interfaces and fields need
  no comment at all; one earns it only with a unit, an invariant, a meaning of `null`, or a non-obvious
  consequence. Translating a label into English does not make it worth keeping.
- **Narrates the steps of a function.** `// validate`, `// build the result`, `// step 2`. The function
  should read as named steps; if it does not, that is a refactor, not a comment. In a cleaning sweep,
  delete the narration and leave the code as it is.
- **Tells history or process.** "Previously…", "now…", "changed to…", "moved from…", "fixed the bug
  where…", "added for the review", "as requested", "new:", dates, authors, sprint names. History lives
  in git and in the commit message.
- **Names the tooling behind a change.** No rule ids from linters or scanners, no "audit", "finding",
  "quality pass", "AI", "Claude". A reader must not be able to tell how a line came to be.
- **Is commented-out code.** Delete it; git keeps it.
- **Decorates.** Banners, separators, closing-brace comments (`} // end if`), boxes of asterisks.
- **Describes the test instead of the test name doing it.** A test whose name says the behavior needs
  no comment repeating it. Keep a test comment only for a non-obvious setup detail or the reason a
  case exists (a past regression, a boundary).
- **Duplicates documentation that lives elsewhere.** Business rules belong in `docs/business-rules/`
  (through `bun run rules:add`), designs in `docs/`. A comment may point there in one line.

## Never put in a comment

Comments ship with the code and are read by anyone who can read the code
([CWE-615](https://cwe.mitre.org/data/definitions/615.html)).

- Secrets of any kind: tokens, passwords, keys, connection strings, signed URLs.
- Personal data: real names, emails, phone numbers, user ids of real people, customer data.
- Internal infrastructure details: hostnames, IPs, internal URLs, account ids, paths on a machine.
- Exploitable detail: "this endpoint skips the check when…", "sending X crashes Y".
- Opinions about people or blame.

Test fixtures use made-up data (`ana@example.com`, `11111111-…`); comments follow the same rule.

## Length and form

- **One line is the default.** Two or three lines when the why needs it. More than five lines means
  the content belongs in a doc, an ADR or a business rule, with a one-line pointer here.
- **No line wider than 120 columns** (the formatter's width, which it does not apply to comments).
  Squeezing three lines into one wide line is not shortening: cut the words instead.
- **Plain, present tense, third person.** A function doc starts with a verb or a noun phrase that
  says what it gives: *"Rows the token may read, nearest rule first."* No "This function…".
- **English**, like the identifiers. User-facing text (i18n messages, UI copy) is not a comment and
  keeps its own language.
- **No metaphors, no storytelling, no rhetorical flourish.** Say the fact.
- `/** … */` documents a declaration (exported symbols, types, props, constants). `//` explains an
  implementation detail inside a body. `{/* … */}` only inside JSX.
- A comment sits directly above what it explains, never at the end of a long line.

## Rewriting a comment that stays

1. Keep only the why, the constraint or the warning; drop everything the code already says.
2. Cut it to the shortest sentence that still carries the point.
3. Translate to English if it is not.
4. Check it is still true for the code as it is now; if it is not, fix it or delete it.

Example, before:

```ts
/**
 * Lo que va delante del espacio de trabajo en el candado de las mudanzas: dos
 * páginas que se mueven a la vez, una dentro de la otra, se turnan en vez de
 * cerrar un ciclo.
 */
export const PAGE_MOVES_LOCK_PREFIX = 'page-moves:';
```

After:

```ts
/** Serializes moves per workspace so two concurrent moves cannot close a cycle. */
export const PAGE_MOVES_LOCK_PREFIX = 'page-moves:';
```

## Cleaning sweep (many files)

When asked to clean the comments of a set of files:

- **Comments only.** Do not change behavior, names, imports, formatting of code, string literals,
  user-facing text or tests' assertions. If a comment exists because a name is bad, keep a trimmed
  comment and report the rename instead of doing it.
- **Edit with the Edit tool, file by file.** Never with scripts, `sed`, or bulk replacement.
- **Out of scope:** generated code, applied database migrations (`migrations/**/*.sql`), Markdown
  docs, business-rule YAML, i18n JSON, lockfiles, vendored code.
- Walk every comment of every file in the slice through the test above: delete, rewrite or keep.
- When a deleted comment leaves an empty line pair or an empty JSX block, remove the leftover so the
  formatter has nothing to fix.
- After the slice: run the app's `bun run format` and `bun run check`, and the tests of the touched
  files. Both must pass with 0 warnings and 0 errors.
- Report: files touched, comments deleted / rewritten / kept, any comment left as is with the reason,
  rename candidates, and anything that looked like a secret or personal data.

## Sources

- Ellen Spertus, *Best practices for writing code comments*, Stack Overflow Blog (2021).
- Jeff Atwood, *Code Tells You How, Comments Tell You Why*, Coding Horror.
- Google TypeScript Style Guide, *Comments and documentation*.
- John Ousterhout, *A Philosophy of Software Design*: comments describe what is not obvious from the code.
- Robert C. Martin, *Clean Code*, ch. 4: redundant, misleading, mandated and commented-out comments.
- MITRE CWE-615, *Inclusion of Sensitive Information in Source Code Comments*.
