---
version: alpha
name: Company Brain
description: >
  English-first company knowledge workspace with an editorial athletic edge: near-black ink,
  disciplined white space, signal red used with restraint, condensed display typography for decisive
  moments, and neutral text typography for long reading. The interface feels like a sharp internal
  operations tool, not a generic admin dashboard: flat surfaces, hairline structure, strong hierarchy,
  fast navigation, and content always louder than chrome.
colors:
  primary: "#c1121f"
  primary-hover: "#a30f1a"
  on-primary: "#ffffff"
  ink: "#111111"
  ink-soft: "#2a2a28"
  ink-muted: "#6b6b68"
  canvas: "#f7f7f4"
  surface: "#ffffff"
  surface-subtle: "#efefeb"
  surface-dark: "#171717"
  hairline: "#d8d8d2"
  hairline-strong: "#b8b8b0"
  danger: "#b42318"
  danger-surface: "#fef0ee"
  success: "#166534"
  success-surface: "#ecfdf3"
  warning: "#92400e"
  warning-surface: "#fffbeb"
  info: "#1d4ed8"
  info-surface: "#eff6ff"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: 72px
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.02em
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -0.01em
  title:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
  subtitle:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-strong:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.04em
  button:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "Inter, Helvetica Neue, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 2px
  md: 6px
  lg: 10px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 12px 20px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 12px 20px
    height: 44px
  button-secondary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: 12px 20px
    height: 44px
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 14px
    height: 44px
  text-muted:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  card-subtle:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 16px 16px
  divider:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  focus-indicator:
    backgroundColor: "{colors.hairline-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
  sidebar:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    padding: 24px 16px
  page-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 32px 32px
  page-title:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    padding: 0px 0px
  editor:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 48px 64px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 24px 24px
  badge-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  status-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  status-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  status-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  status-info:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 10px
---

## Overview

Company Brain is a private operating memory for a team. Its visual language borrows the useful part of
athletic editorial design: decisive headlines, disciplined rhythm, and a strong monochrome base. It is
not a Nike clone and it does not use Nike proprietary fonts or assets. The reference is optical energy,
not brand imitation.

The interface stays quiet while knowledge is being read. `{colors.ink}` and `{colors.surface}` carry the
workspace; `{colors.primary}` is the single signal color for intentional actions, selection, and errors
that need attention. Large condensed type is reserved for moments of orientation. Normal reading uses
neutral sans typography with generous line-height. Flat surfaces and `{colors.hairline}` structure replace
decorative gradients and noisy shadows.

### Key Characteristics

- Near-black and white are the load-bearing surfaces.
- `{colors.primary}` is rationed; never use red as wallpaper or decoration.
- Display headlines use condensed uppercase typography only for orientation, not body content.
- Reading surfaces are wide enough for documents but constrained to a comfortable prose measure.
- The sidebar is dark, the content canvas is light, and the editor is a calm white sheet.
- Components are sharp or lightly rounded; avoid soft SaaS-card aesthetics.

## Colors

### Brand & Accent

- **`{colors.primary}` `#c1121f`** is the action signal for primary CTAs, active page markers, and focused emphasis. Its white pairing is chosen to maintain readable contrast.
- **`{colors.primary-hover}` `#a30f1a`** is the pressed/hover state for primary actions, never a second accent.
- **`{colors.on-primary}` `#ffffff`** is reserved for text and icons on the red action surface.

### Surface

- **`{colors.canvas}` `#f7f7f4`** is the application canvas behind content.
- **`{colors.surface}` `#ffffff`** is the document/editor and elevated content surface.
- **`{colors.surface-subtle}` `#efefeb`** is for quiet rows, code backgrounds, and selected-but-not-active surfaces.
- **`{colors.surface-dark}` `#171717`** is the navigation/sidebar surface.

### Text & Structure

- **`{colors.ink}` `#111111`** is primary text and the dark action surface.
- **`{colors.ink-soft}` `#2a2a28`** is secondary strong text and headings that should not compete with the page title.
- **`{colors.ink-muted}` `#6b6b68`** is metadata, helper text, and inactive navigation.
- **`{colors.hairline}` `#d8d8d2`** is the default one-pixel structural divider.
- **`{colors.hairline-strong}` `#b8b8b0`** is for focused or emphasized structural boundaries.

### Semantic

- **`{colors.danger}` `#b42318`** communicates destructive/error state with text, icon, or border; pair it with `{colors.danger-surface}`.
- **`{colors.success}` `#166534`** communicates completed/safe state with a label, never color alone; pair it with `{colors.success-surface}`.
- **`{colors.warning}` `#92400e`** communicates attention; pair it with `{colors.warning-surface}`.
- **`{colors.info}` `#1d4ed8`** communicates neutral information; pair it with `{colors.info-surface}`.
- **`{colors.danger-surface}` `#fef0ee`**, **`{colors.success-surface}` `#ecfdf3`**, **`{colors.warning-surface}` `#fffbeb`**, and **`{colors.info-surface}` `#eff6ff`** are low-intensity semantic backgrounds.

Cards and panels separate with a one-pixel `{colors.hairline}` border. Shadows are not the default depth cue.

## Typography

### Font Roles

- Display uses `Barlow Condensed, Arial Narrow, Arial, sans-serif`. Barlow Condensed is the open-source optical substitute for Nike's proprietary condensed display lineage.
- Body uses `Inter, Helvetica Neue, Arial, sans-serif` for high-density reading and UI clarity.
- Code uses `JetBrains Mono, SFMono-Regular, Consolas, monospace`.

### Hierarchy

| Token | Size | Weight | Line height | Tracking | Use |
|---|---:|---:|---:|---:|---|
| `{typography.display}` | 72px | 700 | 0.95 | -0.02em | Rare workspace hero/orientation headline, uppercase |
| `{typography.headline}` | 40px | 700 | 1.0 | -0.01em | Page and section headlines |
| `{typography.title}` | 24px | 700 | 1.2 | normal | Cards, dialogs, database names |
| `{typography.subtitle}` | 18px | 500 | 1.45 | normal | Supporting introduction |
| `{typography.body}` | 16px | 400 | 1.6 | normal | Document and application reading |
| `{typography.body-strong}` | 16px | 600 | 1.5 | normal | Emphasis, active labels |
| `{typography.label}` | 12px | 700 | 1.3 | 0.04em | Eyebrows, status labels, metadata headings |
| `{typography.button}` | 14px | 600 | 1.2 | normal | Interactive controls |
| `{typography.caption}` | 13px | 400 | 1.4 | normal | Supporting metadata |
| `{typography.mono}` | 14px | 400 | 1.5 | normal | Code and technical identifiers |

### Principles

Condensed display type creates the athletic signal; it is not a replacement for readable body type. Do
not turn all UI labels into uppercase: only labels and eyebrows use `{typography.label}`. Body text stays
sentence case. The visual system gets its energy from scale contrast, not from making every element loud.

### Note on Font Substitutes

Nike's custom display faces are proprietary. Use Barlow Condensed for the display role and Inter for body/UI;
do not load, copy, or approximate a proprietary Nike font file. If a licensed brand font is supplied later,
replace only the font-family tokens and preserve the same sizes, weights, tracking, and line heights.

## Layout

The spacing base is 4px: `{spacing.unit}`. Use `{spacing.xs}` for icon gaps, `{spacing.sm}` for compact
control gaps, `{spacing.md}` for component internals, `{spacing.lg}` for card padding, `{spacing.xl}` for
sections, `{spacing.2xl}` for page groups, and `{spacing.3xl}` for major editorial breaks.

The portal uses a full-height shell with a fixed-width navigation rail and a flexible content canvas. The
editor uses `{components.editor}` and caps prose at approximately 720px; database views may use the full
available content width. Do not center every screen into a floating card: documents are primary surfaces.

Whitespace is structural. A page title gets breathing room; a toolbar stays compact; related blocks are
grouped by proximity. Never add padding to hide a missing hierarchy.

## Elevation & Depth

The system is intentionally flat. Use `{colors.hairline}` borders and surface changes instead of default
drop shadows. A popover may use the existing platform shadow only when it must visually detach from content;
cards, pages, and navigation do not receive decorative shadows.

| Surface | Background | Separation |
|---|---|---|
| Application canvas | `{colors.canvas}` | none or `{colors.hairline}` |
| Document/editor | `{colors.surface}` | `{colors.hairline}` only when adjacent |
| Quiet row | `{colors.surface-subtle}` | none |
| Sidebar | `{colors.surface-dark}` | one `{colors.hairline-strong}` boundary |
| Modal/popover | `{colors.surface}` | existing overlay treatment plus `{colors.hairline}` |

## Shapes

- `{rounded.none}` is the default for buttons, editor chrome, page headers, and structural containers.
- `{rounded.sm}` is for tiny status elements where a one-pixel softening prevents visual noise.
- `{rounded.md}` is for inputs, compact quiet actions, and cards that need grouping.
- `{rounded.lg}` is for dialogs and larger focused surfaces only.
- `{rounded.full}` is reserved for status badges and compact tags, never large cards.

Images and attachments use their natural aspect ratio inside the document. Do not force rounded thumbnail
cards or crop knowledge assets unless the asset explicitly declares a crop.

## Components

- **`button-primary`** uses `{colors.primary}` with `{colors.on-primary}`, `{typography.button}`, `{rounded.none}`, and `{components.button-primary.padding}`. It is the one primary action in a view and darkens to `{colors.primary-hover}` on press.
- **`button-primary-active`** uses `{colors.primary-hover}` with `{colors.on-primary}`, `{typography.button}`, `{rounded.none}`, and `{components.button-primary-active.padding}` for pressed/active feedback.
- **`button-secondary`** uses `{colors.ink}` with `{colors.surface}`, `{typography.button}`, `{rounded.none}`, and `{components.button-secondary.padding}`. It is reserved for high-confidence secondary actions.
- **`button-quiet`** uses `{colors.surface}` with `{colors.ink}`, `{typography.button}`, `{rounded.md}`, and `{components.button-quiet.padding}`. It stays visually quiet until hover/focus.
- **`input`** uses `{colors.surface}` with `{colors.ink}`, `{typography.body}`, `{rounded.md}`, and `{components.input.padding}`. Focus uses `{colors.hairline-strong}` plus a visible ring; never rely on color alone.
- **`text-muted`** uses `{colors.surface}` with `{colors.ink-muted}`, `{typography.caption}`, and `{rounded.none}` for metadata that must remain readable without competing with content.
- **`card-subtle`** uses `{colors.surface-subtle}` with `{colors.ink-soft}`, `{typography.body-small}`, `{rounded.md}`, and `{components.card-subtle.padding}` for quiet grouped metadata.
- **`divider`** uses `{colors.hairline}` with `{colors.ink}`, `{typography.caption}`, and `{rounded.none}` for one-pixel structural separation without shadow.
- **`focus-indicator`** uses `{colors.hairline-strong}` with `{colors.ink}`, `{typography.caption}`, and `{rounded.none}` as a structural focus cue alongside the browser focus ring.
- **`sidebar`** uses `{colors.surface-dark}` with `{colors.surface}`, `{typography.body}`, and `{components.sidebar.padding}`. Active navigation receives a narrow `{colors.primary}` marker, not a purple or blue pill.
- **`page-shell`** uses `{colors.canvas}` with `{colors.ink}`, `{typography.body}`, `{rounded.none}`, and `{components.page-shell.padding}`. It gives the document room instead of framing it as a dashboard card.
- **`page-title`** uses `{colors.canvas}` with `{colors.ink}`, `{typography.headline}`, `{rounded.none}`, and `{components.page-title.padding}`. It is left-aligned and uses condensed display rhythm without forcing uppercase on document titles.
- **`editor`** uses `{colors.surface}` with `{colors.ink}`, `{typography.body}`, `{rounded.none}`, and `{components.editor.padding}`. The editor is the dominant surface; toolbars remain secondary.
- **`card`** uses `{colors.surface}` with `{colors.ink}`, `{typography.body}`, `{rounded.md}`, and `{components.card.padding}`. Cards group metadata or database records, never the primary document itself.
- **`badge-primary`** uses `{colors.primary}` with `{colors.on-primary}`, `{typography.label}`, `{rounded.full}`, and `{components.badge-primary.padding}`. Pair every status color with text or an icon.
- **`status-danger`** uses `{colors.danger-surface}` with `{colors.danger}`, `{typography.label}`, `{rounded.full}`, and `{components.status-danger.padding}` for errors and destructive state.
- **`status-success`** uses `{colors.success-surface}` with `{colors.success}`, `{typography.label}`, `{rounded.full}`, and `{components.status-success.padding}` for completed state.
- **`status-warning`** uses `{colors.warning-surface}` with `{colors.warning}`, `{typography.label}`, `{rounded.full}`, and `{components.status-warning.padding}` for attention state.
- **`status-info`** uses `{colors.info-surface}` with `{colors.info}`, `{typography.label}`, `{rounded.full}`, and `{components.status-info.padding}` for neutral information.

## Do's and Don'ts

### Do

- Use black/white structure and reserve `{colors.primary}` for a deliberate action or signal.
- Use condensed display type for orientation and Inter for reading.
- Keep pages visually calm and let content occupy the main canvas.
- Use one clear primary action per view.
- Use real semantic headings, lists, tables, buttons, and links.
- Keep controls at least 44px on touch layouts.
- Show loading, empty, saving, success, and error states explicitly.

### Don't

- Do not use Nike proprietary fonts, logos, photography, or copied brand assets.
- Do not add purple, blue, gradients, or decorative color to the core UI.
- Do not turn every label into uppercase display type.
- Do not wrap every feature in a rounded floating card.
- Do not use shadows as the default separation mechanism.
- Do not make red the only indicator of an error or status.
- Do not put primary and destructive actions next to each other with equal weight.
- Do not invent alternate button shapes or route-specific visual systems.

## Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| 320–639px | Sidebar becomes a drawer; editor padding uses `{spacing.md}`; controls stack and primary actions become full width. |
| 640–1023px | Sidebar remains collapsible; database columns reduce to the essential fields; editor uses `{spacing.lg}`. |
| 1024px+ | Persistent sidebar, full page tree, editor max prose width, and expanded database views. |

### Touch Targets

All actionable controls are at least 44px high or wide. Icon-only controls require an accessible name and a
visible focus state. Do not shrink editor toolbar controls below this threshold on mobile.

### Collapsing Strategy

Navigation collapses before content does. The page tree becomes a drawer; the document remains the primary
focus. Database columns hide by priority rather than creating horizontal overflow. Toolbar actions collapse
into a labeled overflow menu after the primary formatting actions remain visible.

## Known Gaps

- Animation durations are governed by existing motion tokens and are not fully specified here.
- Dark/light theme parity is not yet defined; this file defines the light canvas plus dark navigation identity.
- Complex data visualization styles are not part of the document workspace system.
- Product photography rules are intentionally absent because Company Brain is knowledge-first, not commerce-first.
