---
version: alpha
name: Starter
description: >
  Dark-first workspace interface. The interface speaks in low-carbon
  surfaces, high-contrast warm-cream text, and a single purple accent that carries every CTA, active
  state, and structural highlight. The visual language uses a layered surface hierarchy and
  shadcn/ui's New York component precision, then calibrates radius by context — sharp for interactive
  chrome, soft for content containers. The result is industrial, legible, and fast to scan — a
  dashboard that means business, not decoration.
colors:
  primary: "#6d28d9"
  primary-soft: "#a78bfa"
  on-primary: "#ffffff"
  secondary: "#5b21b6"
  on-secondary: "#ffffff"
  canvas: "#0e0e0e"
  canvas-low: "#141418"
  canvas-container: "#18181c"
  canvas-high: "#1e1e26"
  canvas-bright: "#4a4266"
  ink: "#f0ede8"
  ink-muted: "#a0a0a0"
  hairline: "#3d3654"
  hairline-strong: "#3d2466"
  accent: "#7c3aed"
  accent-hover: "#9061f0"
  ring: "rgba(124,58,237,0.35)"
  danger: "#dc2626"
  success: "#22c55e"
  warning: "#eab308"
  info: "#3b82f6"
  success-bg: "rgba(34,197,94,0.15)"
  warning-bg: "rgba(234,179,8,0.15)"
  danger-bg: "rgba(239,68,68,0.15)"
  info-bg: "rgba(59,130,246,0.15)"
  status-active: "#7c3aed"
  status-muted: "#6b6780"
  chart-1: "#6d28d9"
  chart-2: "#5b21b6"
  chart-3: "#8b5cf6"
  chart-4: "#a78bfa"
  chart-5: "#c4b5fd"
typography:
  display:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 72px
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: -0.02em
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.01em
  subtitle:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
  label-xs:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  button:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
  stat:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
  xl: 12px
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
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.primary-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.primary-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-primary-disabled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-primary-active:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-secondary-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  button-ghost-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
  card:
    backgroundColor: "{colors.canvas-container}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.none}"
    padding: 24px 24px
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    height: 36px
  input-auth:
    backgroundColor: "{colors.canvas-low}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 48px
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.full}"
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.full}"
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info}"
    typography: "{typography.label-xs}"
    rounded: "{rounded.full}"
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px 24px
  sidebar:
    backgroundColor: "{colors.canvas-low}"
    textColor: "{colors.ink}"
  page-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.title}"
  stat-card:
    backgroundColor: "{colors.canvas-container}"
    textColor: "{colors.ink}"
    typography: "{typography.stat}"
    rounded: "{rounded.none}"
    padding: 24px 24px
---

## 1. Overview

Neuma is built for people who need to move fast and read
without guessing. The design system is **dark-first** — the default theme is a near-black carbon
surface with warm cream text — with a layered surface hierarchy. The brand accent is
a single purple (`{colors.primary}`) that does double duty as CTA color, active navigation
indicator, sidebar accent, focus ring, and chart palette anchor. Purple appears nowhere else in the
interface; it is the only color with voltage.

The system is deliberately **anti-decorative**. The main separation device is a hairline border
system (`{colors.hairline}`, `{colors.hairline-strong}`). Elements that carry interactivity —
buttons, toolbars, checkboxes — are sharp (`{rounded.none}`). Small inputs and tabs use
`{rounded.md}`. Dialogs soften to `{rounded.lg}`. Cards are sharp as well
(`{rounded.none}`) — the system commits to sharp corners everywhere except the small
curvature on inputs, tabs, and dialogs. The result reads as industrial rather than playful,
capable rather than cute.

The type system uses IBM Plex Sans at every weight tier from 400 through 800. There is no
separate display face; the display hierarchy is achieved through size, weight, and tight
tracking alone. Monospaced text uses IBM Plex Mono.

**Key Characteristics:**
- Single-brand purple accent system (`{colors.primary}` → `{colors.accent}`); no secondary accent color
- Radius varies by context: sharp chrome and cards (`{rounded.none}`), modest curvature on
  inputs/tabs (`{rounded.md}`) and dialogs (`{rounded.lg}`)
- Hairline borders instead of shadows for surface separation
- Dark mode as default; light mode exists as an alternative via `.light` class
- IBM Plex Sans for body and headings, IBM Plex Mono for code/technical text
- 4px base spacing grid, Touch targets minimum 44px (WCAG)
- Centralized motion tokens: 200ms for dialogs, 300ms for sidebar/theme, 500ms for sheets

---

## 2. Colors

Every color in the system is named by its functional role. The dark-mode palette is the source of
truth; light-mode values are defined in the prose but secondary to the dark defaults.

### Brand & Accent

- `{colors.primary}` (`#6d28d9`) — the single brand voltage. Applied to primary buttons, active
  navigation items, sidebar accent bar, chart series 1, and as the solid CTA fill. Nothing else
  carries this color as a surface. It is intentionally a mid-purple that reads as authoritative
  without being aggressive.
- `{colors.primary-soft}` (`#a78bfa` in dark mode, `#6d28d9` in light mode) — the legible
  sibling. Used as the text color on secondary, ghost, outline, and link buttons where
  `{colors.primary}` would fail WCAG AA against the page background. Lighter in dark mode
  for contrast, darker in light mode for the same reason.
- `{colors.on-primary}` (`#ffffff`) — text and icons placed on `{colors.primary}` backgrounds.
- `{colors.secondary}` (`#5b21b6`) — darker shade used for the pressed/hover state of primary
  buttons and as chart series 2. Never used as a standalone surface color.
- `{colors.on-secondary}` (`#ffffff`) — text on `{colors.secondary}` backgrounds.
- `{colors.accent}` (`#7c3aed`) — interactive hover backgrounds, selected items in dropdowns/
  commands, skeleton loading placeholders. Lighter than primary so it reads as a "highlighted"
  version of the brand, not a second brand.
- `{colors.accent-hover}` (`#9061f0`) — stronger hover accent, used sparingly when a hover
  state needs more contrast against a dark surface.
- `{colors.ring}` (`rgba(124,58,237,0.35)`) — focus ring color, a semi-transparent purple that
  wraps interactive elements on `:focus-visible`. Always rendered as a ring, never as a solid fill.
- `{colors.chart-1}` through `{colors.chart-5}` — a single-hue progression from
  `#6d28d9` → `#5b21b6` → `#8b5cf6` → `#a78bfa` → `#c4b5fd`. Charts are monochromatic purple;
  the fifth value is light enough to serve as a soft highlight on dark backgrounds.

### Surface

The surface system forms a five-tier elevation stack. Each tier is used for a specific containment
role; an element never skips a tier. The hierarchy reads bottom (page background) to top (panel
emphasis).

1. `{colors.canvas}` (`#0e0e0e`) — root page background. Used on `<body>`, form backgrounds,
   and as the reset surface behind all content.
2. `{colors.canvas-low}` (`#141418`) — sidebar background, popovers.
   The "drawer" surface.
3. `{colors.canvas-container}` (`#18181c`) — cards, stat widgets, chart containers. This is the
   workhorse surface that holds most structured content.
4. `{colors.canvas-high}` (`#1e1e26`) — tabs list backgrounds, disabled input fills. Used when
   an element inside a container needs its own subtle elevation.
5. `{colors.canvas-bright}` (`#4a4266`) — panel emphasis. Rarely used; reserved for when a
   container must contrast strongly against the carbon hierarchy (e.g., a focused detail panel).

### Ink (Text)

- `{colors.ink}` (`#f0ede8`) — primary text: headings, body, active nav items, stat values,
  foreground content. A warm off-white that avoids the blue cast of pure `#ffffff`.
- `{colors.ink-muted}` (`#a0a0a0`) — secondary text: descriptions, placeholders, inactive
  navigation, chart labels, form hints. Low enough contrast to recede but always legible on
  carbon surfaces (ratio ~4.3:1 against `{colors.canvas}`).

### Hairlines (Borders)

- `{colors.hairline}` (`#3d3654`) — default border for cards, tables, inputs, selects, dropdowns,
  popovers, dividers, and section separators. A purple-tinted dark gray that harmonizes with the
  brand while staying visually subordinate.
- `{colors.hairline-strong}` (`#3d2466`) — sidebar border. A stronger purple tint that marks the
  structural edge between navigation and content without drawing attention.

### Semantic

- `{colors.danger}` (`#ef4444`) — destructive actions: delete buttons, error toasts, destructive
  dialog confirmations. Also used as text color on danger badges. Never used as a surface fill
  unless the element explicitly represents destruction.
- `{colors.success}` (`#22c55e`) — success badge text and confirmation feedback. Badge background
  is a fixed `rgba(34,197,94,0.15)` semi-transparent fill.
- `{colors.warning}` (`#eab308`) — warning badge text. Badge background is
  `rgba(234,179,8,0.15)`.
- `{colors.info}` (`#3b82f6`) — info badge text. Badge background is `rgba(59,130,246,0.15)`.

### Status

- `{colors.status-active}` (`#7c3aed`) — active state indicators in the order status timeline,
  current-step markers. Same hex as `{colors.accent}` but carries different semantic intent.
- `{colors.status-muted}` (`#6b6780`) — inactive/muted status text, form field labels in dark
  contexts. A desaturated purple-gray that signals "read but not actionable."

### Light Mode

The light mode inverts the surface stack: `{colors.canvas}` becomes `#fafafa`
(near-white), `{colors.ink}` becomes `#0a0a0a` (near-black), and `{colors.primary}` shifts
to `#7c3aed` (lighter purple for better contrast against white). `{colors.accent}` becomes
`#f3e8ff` (barely-there purple tint). All semantic colors adjust slightly for the lighter
background. The light mode is secondary — the system is designed dark-first.

---

## 3. Typography

### Font Family

IBM Plex Sans is the single typeface for the entire UI. It is loaded via `next/font/google` at
weights 400, 500, and 700 (with 800 achieved through the variable font's axis). It is a
grotesque with a large x-height and open apertures — legible at small sizes on dark backgrounds
and authoritative at display sizes without feeling decorative.

IBM Plex Mono is loaded alongside it at weight 400 and serves as the monospaced face for
code, chart tooltips, and inventory SKU codes. Both families are open-source (SIL OFL).

### Principles

The type scale is a single geometric progression with no secondary size set. Display sizes
(`{typography.display}`, `{typography.headline}`) use tight tracking (`-0.02em`) and heavy
weights (700–800) to create density on the dark surface; the negative tracking compensates
for the light text on black, which would otherwise read as optically loose. Body text stays
at 16px base with generous line height (1.5) for long-form readability on dark backgrounds.

Headings always use IBM Plex Sans via `{typography.display}` family — there is no separate
display face. The differentiation between "heading" and "body" is achieved through weight
and tracking, not a typeface change.

### Hierarchy & Weights

| Token | Size / Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|
| `{typography.display}` | 72px / 800 | 1.02 | -0.02em | Landing hero (desktop) |
| `{typography.headline}` | 36px / 700 | 1.2 | — | Auth page titles, about section headings |
| `{typography.title}` | 24px / 700 | 1.3 | -0.01em | Page headers, stat values |
| `{typography.subtitle}` | 20px / 600 | 1.4 | — | Section subtitles, step headings |
| `{typography.body}` | 16px / 400 | 1.5 | — | Body text, mobile nav, search inputs |
| `{typography.body-small}` | 14px / 400 | 1.5 | — | Table cells, form labels, secondary text |
| `{typography.label}` | 14px / 500 | 1.5 | — | Form field labels, table headers, nav items |
| `{typography.label-xs}` | 12px / 500 | 1.5 | — | Badges, filter labels, chart ticks |
| `{typography.button}` | 14px / 600 | 1 | — | All button and CTA text |
| `{typography.stat}` | 24px / 700 | 1.2 | -0.01em | Dashboard stat widgets |
| `{typography.mono}` | 14px / 400 | 1.5 | — | Inventory SKU codes, chart tooltip values, code |

### Note on Font Substitutes

IBM Plex Sans is open-source (SIL Open Font License). If unavailable, fall back to
`ui-sans-serif, system-ui, sans-serif` — most system sans-serifs (Inter on Apple, Segoe UI on
Windows) have comparable x-height and weight range. Match optical density by bumping system
sans-serif weight up one step (e.g., use 500 where Plex Sans uses 400).

---

## 4. Layout

### Spacing Scale

The system uses a strict **4px base grid**. Every spacing value is a multiple of 4:

| Token | Value | Use |
|---|---|---|
| `{spacing.unit}` | 4px | Base grid unit |
| `{spacing.xs}` | 4px | Tight gaps between inline items (icon + text, badge padding) |
| `{spacing.sm}` | 8px | Small gaps within a component (form field spacing, button gaps) |
| `{spacing.md}` | 16px | Default gap between sibling sections, grid gaps |
| `{spacing.lg}` | 24px | Card padding, form vertical spacing, section gaps |
| `{spacing.xl}` | 32px | Large section margins |
| `{spacing.2xl}` | 48px | Hero bottom padding |
| `{spacing.3xl}` | 64px | Maximum section padding |

### Grid & Structure

- **Max content width**: `max-w-6xl` (1152px) for landing and dashboard layouts.
  Cotización and status pages use `max-w-2xl` (672px) or `max-w-4xl` (896px).
- **Column system**: CSS Grid with responsive column counts — 1 column mobile, 2 at `md:`, 4 at `lg:`.
  The dashboard stat cards use `grid-cols-2 lg:grid-cols-4`.
- **Edge padding**: `px-6` (24px) on mobile, scaling to `px-12` on `md:` and `px-20` on `lg:`.
- **Section margins**: `py-20` to `py-32` for landing page sections. Dashboard sections use
  `space-y-6` (24px) between content blocks.

### Whitespace Philosophy

The system is **generous but never wasteful**. Content blocks are separated by 24px (one
`{spacing.lg}` unit) — tight enough that related sections read as a group, loose enough that
each block breathes. Landing sections use large vertical padding (`py-20` through `py-32`)
to create a scrolling rhythm where each section occupies most of the viewport. Within a
section, element spacing follows the 4px grid strictly; no element is ever offset by a
non-multiple of 4.

---

## 5. Elevation & Depth

This system **does not use traditional shadows for surface separation**. Instead, it uses a
hairline border system (`{colors.hairline}`) combined with a five-tier surface color hierarchy
(see Colors > Surface). The mental model is stacked paper sheets, not floating cards.

### Elevation Stack

| Tier | Surface | Border | Use |
|---|---|---|---|
| 0 (base) | `{colors.canvas}` | none | Page body, form backgrounds |
| 1 | `{colors.canvas-low}` | `{colors.hairline}` on right edge | Sidebar, popovers |
| 2 | `{colors.canvas-container}` | `{colors.hairline}` on all sides | Cards, stat widgets, chart containers |
| 3 | `{colors.canvas-high}` | none (color alone separates) | Tabs lists, disabled inputs |
| 4 | `{colors.canvas-bright}` | none | Panel emphasis (rare) |

### Overlay

Modals and sheets use a `bg-black/50` overlay (dialog, sheet) or `bg-black/60` with
`backdrop-blur-sm` (generic form dialog). The overlay darkens the page without fully
obscuring context.

---

## 6. Shapes

### Border Radius

The system philosophy is: **radius follows context, not a uniform scale**. Interactive chrome
that the user acts *on* (buttons, toolbars, checkboxes) is sharp (`{rounded.none}`). Content
that the user reads *in* (cards, stat widgets) is sharp too — the system commits to sharp
corners as its default and only softens the small set of elements listed below. Elements that
sit between the two (inputs, dialogs) carry modest curvature (`{rounded.md}`, `{rounded.lg}`).

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Buttons, sheets, popovers, dropdowns, selects, checkboxes, command, cards, stat widgets |
| `{rounded.sm}` | 2px | Chart bar tracks, chart indicators, subtle frame corners |
| `{rounded.md}` | 4px | Inputs, tab triggers, skeleton loaders, calendar day cells |
| `{rounded.lg}` | 8px | Dialogs, tabs list (default variant) |
| `{rounded.xl}` | 12px | Reserved — not currently applied to any component |
| `{rounded.full}` | 9999px (pill) | Badges, sidebar toggle, slider thumb, theme toggle |

### Image Treatment

- Brand logos (AMD, NVIDIA, Intel, ASUS, Ryzen): SVG components with `h-8 w-auto` default sizing.
- Hero background image: full-bleed inside a `border border-white/12` container with
  `bg-black/50` overlay.
- No image border-radius. Images are always rectangular.

### Motion

Transition durations are centralized as design tokens under `@theme inline`. Every animated
element references one of these tokens; no component defines its own raw duration.

| Token | Value | Use |
|---|---|---|
| `duration-dialog` | 200ms | Dialog open/close, popover/select/dropdown animations |
| `duration-sheet-open` | 500ms | Sheet slide-in |
| `duration-sheet-close` | 300ms | Sheet slide-out |
| `duration-sidebar` | 300ms | Sidebar expand/collapse |
| `duration-theme` | 300ms | Theme toggle slider |
| `duration-hover` | 200ms | Hover state transitions (colors, borders, opacity) |

---

## 7. Components

### Buttons

Six variants, all built on the `{typography.button}` token with `{rounded.none}` corners.
Every button has `h-9` (36px) default height and uses `transition-colors` for hover feedback.

`button-primary` — Solid `{colors.primary}` fill with white text. The default CTA.
  Hover dims to `bg-primary/90`. Pressed/focus state: `focus-visible:ring-2
  focus-visible:ring-primary/35`.

`button-secondary` — Transparent background with `{colors.primary-soft}` text and a
  `border border-primary/45` hairline. Hover strengthens border to `border-primary/65`
  and adds `bg-primary/10` background.

`button-ghost` — Transparent with `{colors.primary-soft}` text. Hover adds `bg-primary/10`.
  Used in toolbars, icon-only actions, and navigation.

`button-outline` — `{colors.canvas}` background with `{colors.primary-soft}` text and
  `border border-primary/35`. Hover adds `bg-primary/10`.

`button-destructive` — Solid `{colors.danger}` fill with white text. Hover dims to
  `bg-destructive/90`. Focus ring uses `ring-destructive/20`.

All buttons have `disabled:opacity-50 disabled:pointer-events-none`. Sizes: `xs` (24px),
`sm` (32px), `default` (36px), `lg` (40px), plus `icon` variants at corresponding square
dimensions.

### Cards

Cards are the primary content container. `{colors.canvas-container}` background,
`{colors.ink}` text, `{rounded.none}`, `border border-border`, `p-6` (24px) padding,
`shadow-sm`. Cards separate via their hairline border and background elevation, not via
shadow. Internal layout is `flex flex-col gap-6` with a header/content/footer slot
pattern (CardHeader, CardContent, CardFooter).

### Inputs

Two variants exist in practice. The shared UI kit Input uses `h-9` (36px), `{rounded.md}`,
`{colors.canvas}` background, `{colors.hairline}` border, `{typography.body-small}` text.
Focus: `focus-visible:ring-[3px] focus-visible:ring-ring/50`. Auth forms use a taller
variant (`h-12`, 48px) with `{colors.canvas-low}` background for the elevated form card.

Form labels sit **above** the input, not beside it. They use `{typography.label}` in
`{colors.ink}` text (standard forms) or `{typography.label-xs}` in `{colors.ink-muted}`
(generic form dialogs). Spacing between label and input is `space-y-1.5` (6px).

Error state: `aria-invalid:border-destructive`. Currently unused by form implementations
but built into the Input component.

### Badges

Pill-shaped (`{rounded.full}`) with `{typography.label-xs}` text. The default badge uses
`{colors.primary}` background with `{colors.on-primary}` text. Semantic variants:

- `badge-success`: `{colors.success-bg}` background, `{colors.success}` text
- `badge-warning`: `{colors.warning-bg}` background, `{colors.warning}` text
- `badge-danger`: `{colors.danger-bg}` background, `{colors.danger}` text
- `badge-info`: `{colors.info-bg}` background, `{colors.info}` text

### Sidebar

The sidebar is the primary navigation shell inside the dashboard. `{colors.canvas-low}`
background with a `{colors.hairline-strong}` right border and a repeating diagonal stripe
pattern (2px transparent, 2px stripe color at 1.5% white in dark mode, 4% black in
light mode) for visual texture.

Width toggles between `w-14` (56px, collapsed) and `w-60` (240px, expanded) with a 300ms
`transition-[width]`. Active nav item: `bg-primary/15 text-primary` with a `w-1.5 h-6
rounded-r bg-primary` accent bar on the left edge. Inactive items: `text-ink/70` with
`hover:bg-accent` on hover.

The sidebar is **desktop-only**. On mobile, navigation moves to a hamburger-triggered
drawer using the shared Sheet component.

### Data Table

The data table is the workhorse of the dashboard. Desktop uses a standard `<table>` with
`{colors.hairline}` border-bottom rows, `{typography.body-small}` text, and
`hover:bg-primary/10` row hover. Column headers use `{typography.label}` at `h-10`
(40px) with sort indicators (Lucide chevron icons). Selected rows get `data-[state=selected]:bg-muted`.

Mobile collapses the table into a card-based view (`md:hidden`) where each row becomes a
bordered card with an inline "more actions" button.

Toolbar: Desktop shows a filter/sort/export toolbar (`hidden md:flex`). Mobile shows a
simplified toolbar with filter toggle and search (`md:hidden`). Export supports CSV and
PDF; the export button shows text + icon on desktop, icon-only on mobile.

Pagination: Centered row with previous/next controls, page indicator, and first/last
jump buttons (hidden on mobile). Uses `{colors.hairline}` bordered buttons with
`{typography.body-small}`.

Empty state: Centered cell spanning all columns with `py-16 text-center
text-muted-foreground text-sm` and a configurable message (default: "No results found").

### Dialogs & Sheets

Dialogs use Radix primitives with `{colors.canvas}` background, `{rounded.lg}`, `p-6`
padding, and a `sm:max-w-lg` (512px) max width. Overlay is `bg-black/50` with
fade-in/out animation (`{rounded.lg}`→200ms, see Motion). Header has `{typography.subtitle}`
title and `{typography.body-small}` description in `{colors.ink-muted}`. Footer stacks
buttons vertically on mobile, row on desktop (`flex-col-reverse sm:flex-row sm:justify-end`).

Sheets slide from screen edges (right default, left/top/bottom configurable) with
500ms open / 300ms close transitions. Right sheet: `w-3/4 sm:max-w-sm` (384px desktop,
75vw mobile). Same overlay and close button as dialogs.

Close button for both: absolute top-right, `XIcon` at `size-4`, `opacity-70
hover:opacity-100`.

### Tabs

Two visual variants: `default` (pill-style, `bg-muted` track with `{rounded.lg}` list)
and `line` (underline indicator, transparent track). Active trigger gets
`data-[state=active]:bg-background data-[state=active]:text-foreground` in default
variant, or an animated underline `after:bg-foreground` bar in line variant. Triggers
use `{typography.body-small}` with `font-medium`.

### Page Header

Used at the top of every dashboard entity page. Horizontal flex layout:
`flex items-center justify-between`. Title uses `{typography.title}` with
`tracking-tight`. Optional subtitle in `{typography.body-small} text-muted-foreground`.
Optional action slot on the right (usually an "Add" button).

### Stat Cards

Dashboard stat widgets: `{colors.canvas-container}` background, `p-6` padding,
`{rounded.none}`, `border border-border`. Layout: `flex flex-col gap-3`. Label:
`{typography.label} text-muted-foreground`. Value: `{typography.stat} text-foreground`.
Hover: `hover:border-primary/40` — the border tint shifts toward the brand, providing
a subtle interactive cue without layout shift.

### Toggle (Theme)

A pill-shaped toggle (`rounded-full`, 56px × 32px) with a sliding circular thumb (24px).
Sun icon on left, Moon icon on right (both `size-4 text-primary`). Thumb background is
`bg-primary` in dark mode, `bg-white` in light mode. CSS `translate-x-0` / `translate-x-6`
for the thumb position. `transition-all duration-300` on both toggle and thumb.

### Chart Tooltip & Legend

Recharts wrapper (lazy-loaded via `React.lazy`). Tooltip: `{colors.canvas}` background,
`{colors.hairline}/50` border, `rounded-lg`, `shadow-xl`, `p-2.5`, `{typography.label-xs}`
text. Values use `{typography.mono}` with tabular numbers. Legend: horizontal centered
flex with `size-2 rounded-[2px]` color swatches. Gridlines: `stroke-border/50`. Axes:
`fill-muted-foreground`.

---

## 8. Do's and Don'ts

**Do:**
- Use `{colors.primary}` for exactly one purpose per screen section — the primary CTA or
  active indicator. Never have two competing purple elements at the same hierarchy level.
- Separate surfaces with hairline borders (`{colors.hairline}`), not shadows.
- Apply `{rounded.none}` to any element larger than an input field.
- Use the surface hierarchy in order: canvas → canvas-low → canvas-container → canvas-high.
  Never skip a tier.
- Keep the `4px` base grid for all spacing; values that don't divide by 4 are a design error.
- Use `{typography.label}` for form labels above the input, never beside or inside it.
- Maintain 44px minimum touch targets on interactive elements (`.touch-target` class).

**Don't:**
- Never introduce a second accent color. The system has exactly one: purple.
- Never use `{colors.primary}` as a text color on a dark surface — it fails contrast.
  Purple is for backgrounds, borders, and active indicators only.
- Never apply border-radius to buttons, sheets, popovers, or checkboxes — they are sharp
  (`{rounded.none}`).
- Never use a shadow where a hairline border would suffice. Shadows are for floating UI only.
- Never place a label beside an input (horizontal form layout). Labels go above.
- Never use `{colors.danger}` as a surface fill unless the element explicitly represents
  a destructive action.
- Never hardcode a route path in a link. Use the `ROUTES` constants object.
- Card border-radius must always be `{rounded.none}` (0px) — never soften cards with
  `{rounded.xl}` or any other radius token.

---

## 9. Responsive Behavior

### Breakpoints

Standard Tailwind defaults. Mobile-first with progressive enhancement:

| Prefix | Width | Primary Use |
|---|---|---|
| (default) | 0px+ | Mobile layout (single column, stacked) |
| `sm:` | 640px | Two-column grids, larger typography, row layouts |
| `md:` | 768px | Multi-column grids, show sidebar, hide mobile nav |
| `lg:` | 1024px | Four-column grids, full toolbar, expanded pagination |
| `xl:` | 1280px | Max content width constraint (1152px) |

### Touch Targets

All interactive elements must have a minimum touch area of 44×44px (`min-w-[44px]
min-h-[44px]`). This is enforced via the `.touch-target` utility class. Buttons
at `h-9` (36px) are below this threshold — they compensate with generous horizontal
padding (`px-4`) and clear separation from adjacent elements.

### Collapsing Strategy

- **Sidebar**: Becomes a slide-over Sheet on mobile (`<md:`), triggered by a hamburger
  menu in the topbar. Desktop maintains the persistent sidebar with collapse toggle.
- **Data table**: Collapses to a card-based mobile view using `DataTableMobileView`.
  Each row becomes a bordered card with inline actions. The desktop table is hidden on
  mobile (`hidden md:block`), the mobile view is hidden on desktop (`md:hidden`).
- **Forms**: Two-column grids collapse to single column on mobile (`grid-cols-1
  md:grid-cols-2`).
- **Stats grid**: Four-column on desktop, two-column on mobile (`grid-cols-2
  lg:grid-cols-4`).
- **Navigation**: Landing nav items hide behind a hamburger (`md:hidden`). Dashboard
  topbar shows quick actions with `hidden sm:flex`.
- **Typography**: Hero text scales from `text-4xl` (mobile) → `text-5xl` (sm) →
  `text-6xl`/`text-7xl` (md/lg). Section headings scale from `text-3xl` → `text-5xl`.

---

## 10. Known Gaps

- **`button-outline` uses `{colors.canvas}` background** which is the same as the
  page background. On pages with `{colors.canvas-low}` or `{colors.canvas-container}`
  sections, an outline button blends into the page instead of contrasting against its
  immediate container. Workaround today: `button-outline` is rarely used inside elevated
  surfaces.
- **`--color-secondary-foreground` is hardcoded as `#000000`** in the `@theme inline`
  block, making it unthemeable. It should reference a CSS variable like the other color
  tokens so it respects dark/light mode.
- **Form field-level validation errors do not use `aria-invalid`.** The Input component
  supports it, but current form implementations surface errors via `sonner` toasts or a
  single inline message, not per-field.
- **Light mode is not equally tested or documented.** The `.light` class exists with a
  full alternative palette, but some edge cases (semantic badge backgrounds at 15%
  opacity, overlay legibility) assume dark mode contexts.
- **`{colors.danger}` (`#dc2626`) achieves WCAG AA at 4.5:1 against white text** for
  large text only (14px/600 ≈ large per WCAG). Small destructive text (badges) should
  use the next darker red shade or a dedicated `danger-text` token.
- **Order status timeline uses hardcoded shadow** (`shadow-[0_0_20px_rgba(182,160,255,0.5)]`)
  for the current-step dot. No design token exists for this value.
