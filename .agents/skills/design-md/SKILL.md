---
name: design-md
description: Authoritative standard for authoring, reviewing, and validating DESIGN.md files — the markdown design-system contract that coding agents read before writing any UI. Use this whenever the user wants to create a DESIGN.md from scratch, port a brand or existing UI into one, audit or fix an existing DESIGN.md, define design tokens (colors, typography, spacing, radius, components) for an agent to consume, or asks "how should my design system file be structured". Trigger even when the user just says "design system", "design tokens", "brand guide for the agent", "make the UI consistent", or drops a screenshot/site and wants the look captured as a reusable spec. This is the canonical format; prefer it over ad-hoc token JSON or prose style guides.
---

# DESIGN.md — The Standard

A DESIGN.md is a single markdown file that hands a coding agent a complete, persistent, machine- and human-readable understanding of a visual identity. It is read *before any UI is written* so the agent reaches for the right color, type, spacing, and component every time — without the user re-prompting.

It is **not** a token dump, a Figma export, or a brand PDF. A token export says *what value*; a brand PDF says *what vibe*. DESIGN.md keeps **token + rule + rationale in one place** so the agent can make a correct decision even in a situation the file never explicitly covers. That last property — reasoning under the brand's logic, not just lookup — is the whole point. Every choice you write down must carry its *why*.

## The two layers

1. **YAML front matter** — the normative tokens, fenced by `---` at the very top. Exact, machine-readable values. This is the source of truth.
2. **Markdown body** — the rationale. Prose organized into canonical `##` sections that tell the agent *where each token applies, why it exists, and when to bend it.*

The tokens are normative. The prose makes them actionable. Neither alone is a DESIGN.md.

## Authoring principles (read before writing a single line)

- **Every value earns a reason.** `#F76B1C` is noise; "`#F76B1C`, the single brand voltage, carries every primary CTA and nothing else, so it never dilutes" is a directive the agent can generalize. If you can't state why a token exists, you don't yet understand the system.
- **Name by role, never by appearance.** `primary`, `ink`, `canvas`, `hairline`, `on-primary`, `sale` — never `blue1`, `gray-100`, `accent-2`. The key teaches the job.
- **Write prescriptively, not descriptively.** "Cards separate via 1px `{colors.hairline}`, never shadows" beats "cards have borders." State the stance.
- **Constrain the agent's creativity on purpose.** The Don'ts are as important as the Dos. An agent told only what it *may* do invents generic filler. Tell it what the system *refuses*.
- **Declare absences as decisions.** "No hover states documented — by system policy" stops the agent from hallucinating one. Silence reads as oversight; an explicit gap reads as intent.
- **Preserve given values verbatim — never normalize toward the conventional.** A system's identity often lives in its outlier values, the ones that look "wrong" next to web defaults. The instinct to round them toward safe, common settings is exactly how a design system gets sanded down into the generic average it exists to escape. Transcribe every supplied or observed value exactly; an extreme value is usually deliberate, not a mistake to correct. Only invent a value when the source genuinely omits it, and then choose the one most consistent with the system's stated stance over the one most common elsewhere.
- **Concrete over abstract.** Hex values, px, rem, ratios, weights, token references. "Approachable yet premium" is a brand PDF; agents cannot act on it.
- **Reference, never paraphrase.** In prose, write `{colors.ink}`, `{rounded.lg}`, `{typography.display}` — the literal token, so a value defined once is pointed to everywhere and never drifts.

## YAML token schema

```yaml
---
version: alpha            # spec version
name: <BrandName>
description: >            # dense atmosphere paragraph, NOT a tagline — the agent reads this as the brand's voice
  One paragraph an agent can act on before reaching the prose.
colors:
  <role-name>: "<CSS color>"      # hex, rgb(), oklch(), named — any valid CSS color
typography:
  <role-name>:
    fontFamily: "<stack>"
    fontSize: <n>px|rem
    fontWeight: <n>
    lineHeight: <n>
    letterSpacing: <n>px|em        # optional
rounded:
  <scale>: <n>px                   # none, sm, md, lg, full, etc.
spacing:
  <scale>: <n>px                   # xs, sm, md, base, lg, xl, section, etc.
components:
  <component-name>:
    backgroundColor: "{colors.<role>}"
    textColor: "{colors.<role>}"
    typography: "{typography.<role>}"
    rounded: "{rounded.<scale>}"
    padding: <n>px <n>px
---
```

Rules that the linter and consuming agents depend on:

- **Token reference syntax is `{group.token}`** — `{colors.primary}`, `{spacing.section}`. References must resolve to a defined token, or it is a hard error (`broken-ref`).
- **Components are composed only of `{token.refs}`** — never inline hex/px inside a component. A component out of sync with the system is the most common rot. Raw `padding: 12px` is acceptable; a raw color or radius is not.
- **Variants are separate component entries**, not nested state objects: `button-primary`, `button-primary-active`, `button-primary-disabled`. Keep names related by prefix.
- **Valid component sub-tokens are exactly:** `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. Anything else (`border`, `boxShadow`, `gap`, `opacity`, etc.) is **not** a recognized sub-token and warns. The schema does not model them — do not invent component keys.
- **Borders and shadows have no sub-token — express them in prose, not YAML.** This is the single most common mistake, and it bites hardest in systems that separate surfaces with hairline borders instead of shadows. There is no `border` key. State the rule in the Colors and Components prose ("cards separate via a 1px `{colors.hairline}` border, never a shadow") and keep the hairline as a *color token* that components reference indirectly through that documented rule. The token still counts as referenced if the prose points to it.
- **Dimensions always carry a unit — even zero.** `letterSpacing: 0` is an error; write `0px` or `0em`. Same for any size/spacing: a bare number with no unit is invalid (`spacing` is the one place a bare number is tolerated, but prefer units everywhere for safety).
- **Define `primary` and at least one `typography` token** when colors exist — otherwise the agent auto-generates a brand color and falls back to default fonts (linter warns `missing-primary`, `missing-typography`).
- **Every color token must be referenced** by a component *or* the prose, or it is orphaned dead weight. If a token (a hairline, a tertiary text shade) is only used via a documented prose rule, make sure that prose actually names the `{colors.x}` reference.
- **Verify contrast on every CTA and badge.** Accent colors used as a `backgroundColor` under white `textColor` frequently fail WCAG AA (4.5:1). Check the pairing before committing; if the brand accent fails, darken it or switch the text color and document the choice.

## The body: nine canonical sections, in this order

Sections use `##` headings. Omit any that don't apply, but those present **must** appear in this order (out-of-order is a `section-order` warning). Each section answers a specific question the agent has while building.

| # | Section | Answers | Must contain |
|---|---------|---------|--------------|
| 1 | **Overview** | Why does it look like this? | Multi-paragraph atmosphere statement in plain English — the brand's stance, what carries the "voltage", the page rhythm. Close with a **Key Characteristics** bullet list of the most-quoted facts. This is the only section about *why*; the rest are *what* and *where*. |
| 2 | **Colors** | Where does each color apply? | Every role from `colors:`, grouped under `###` sub-headings (Brand & Accent, Surface, Hairlines, Text, Semantic). One sentence per color stating its **job**, with the `{colors.x}` ref and hex. |
| 3 | **Typography** | Which style goes where, and why? | Font families with fallbacks; a full hierarchy table (token, size, weight, line-height, letter-spacing, use); a `### Principles` paragraph explaining the scale's shape; and a `### Note on Font Substitutes` giving the closest open-source path (exact family + size/weight/tracking to match optical density) for licensed faces. |
| 4 | **Layout** | How is space organized? | Spacing scale (base unit + tokens), grid/container max-widths, and a whitespace-philosophy paragraph. Tokens as `{spacing.x}`. |
| 5 | **Elevation & Depth** | How do surfaces separate? | Surface tiers and shadow/divider definitions in a table. If the system uses no shadows, say so explicitly and name what replaces them (e.g. hairline + photography). |
| 6 | **Shapes** | What is the geometry vocabulary? | Border-radius scale table with use per token; any photography/image ratios and crop rules. |
| 7 | **Components** | What does each element look like, made of tokens? | One prose entry per component in the YAML, **1:1 with the `components:` block** (a coverage linter checks this). Each entry: component key in bold-code, then surface, type, padding, radius — all as `{token.refs}`, plus press/active state and any documented non-default behavior. |
| 8 | **Do's and Don'ts** | What does the system refuse? | Two bullet lists. Dos reinforce the signature moves; Don'ts are the guardrails that stop generic drift (no extra button shapes, no shadows, accent never as text, etc.). This section is what keeps an agent on-brand. |
| 9 | **Responsive Behavior** | What changes on small screens? | Breakpoint table; `### Touch Targets` (with WCAG assessment); `### Collapsing Strategy` for nav/grid/spacing. |
| 10 | **Known Gaps** | What isn't covered? | An honest list of what the file does *not* cover (animation timings, error/success states, dark mode, modals). Its own `##` heading. Stating gaps keeps the contract honest and prevents the agent from hallucinating undocumented styles. |

Responsive Behavior and Known Gaps are **two separate `##` headings**, in this order, at the end of the file.

Accepted aliases: Overview = Brand & Style; Layout = Layout & Spacing; Elevation & Depth = Elevation. `### Note on Font Substitutes` (in Typography) is only needed when the system uses licensed/proprietary fonts; omit it when the stack is already open-source or system fonts.

## Consumer behavior the format guarantees

Write knowing the agent will: preserve unknown section headings (no error); accept unknown-but-valid color/typography tokens; accept unknown component properties with a warning; and **reject the file on a duplicate section heading**. So extend freely with custom tokens and sections, but never repeat a `##` heading.

## Validate before declaring done

The reference CLI ships the linter that enforces this standard. Run it after authoring or editing:

```bash
npx @google/design.md lint DESIGN.md        # structural + contrast + reference checks
npx @google/design.md diff OLD.md NEW.md     # catch token/prose regressions between versions
npx @google/design.md spec --rules           # print the active rule table
```

Resolve, at minimum: `broken-ref` (error), `contrast-ratio` (component bg/text below WCAG AA 4.5:1), `missing-primary`, `missing-typography`, `orphaned-tokens`, and `section-order`. A clean lint is the bar for "done", not a substitute for the rationale being genuinely useful.

## Workflow

1. **Capture the stance first.** Before any token, settle the one-sentence identity (the Overview's seed): what carries the voltage, what the system refuses. Ask the user if it isn't clear — the Overview drives every later choice. If porting an existing site/screenshot, extract the *system* behind the pixels (the repeated devices), not the pixels.
2. **Lay the YAML tokens** by role, primary and typography first.
3. **Compose components** purely from `{token.refs}`, variants as separate entries.
4. **Write the prose** section by section in canonical order, attaching the *why* to every group. Keep the Components prose 1:1 with the YAML.
5. **Add Do's/Don'ts and Known Gaps** — the guardrails and the honest limits.
6. **Lint, fix, and only then call it done.**

## Self-check before finishing

- Does every token carry a stated reason somewhere in the prose?
- Is every name a role, not an appearance?
- Are components built only from references (no inline colors/radii)?
- Is the Components prose 1:1 with the YAML block?
- Are sections in canonical order with no duplicates?
- Are absences declared as decisions (Known Gaps, "no hover by policy")?
- Does `npx @google/design.md lint` pass with no errors?
- Could an agent, reading only this file, make a correct on-brand decision about something the file never explicitly mentions? If not, the rationale is too thin.
