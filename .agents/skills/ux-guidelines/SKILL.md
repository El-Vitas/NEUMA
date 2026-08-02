---
name: ux-guidelines
description: Apply evidence-based UI/UX best practices when building, modifying, or reviewing any user interface — button placement and hierarchy, touch-target sizing, WCAG 2.2 contrast and keyboard/ARIA accessibility, form layout and validation, typography and spacing, tables, charts and dashboards (colorblind-safe palettes), responsive/mobile ergonomics, navigation, loading/empty/error states, toasts, UI copy, i18n/RTL, auth/security UX, and dark-pattern avoidance. Use it whenever you create or change a form, modal, table, chart, page, button, or interactive component, and whenever you audit existing UI — even if the user never says "UX", "usability", or "accessibility" (e.g. "is this contrast ok", "where should this button go", "make it mobile-friendly", "review this component", "add a delete confirmation", "build a login form"). Supplies objective, research-backed rules (Laws of UX, Nielsen, WCAG 2.2, Material 3, Apple HIG, NIST) for the mechanics of usability and accessibility, not visual style.
---

# UI/UX Guidelines

Interfaces feel "right" when they follow how human perception, cognition, and ergonomics work — not designer taste. This skill supplies the objective, research-backed rules (Laws of UX, Nielsen heuristics, WCAG, Material Design, Apple HIG, NIST) for the *mechanics* of usability: where a control goes, how big it must be, what contrast it needs, how to word it. Apply them in a Next.js + shadcn/ui codebase.

## How to use this skill

1. **Classify the task** — are you *building/modifying* UI, or *auditing/reviewing* existing UI?
2. **Apply the Core Rules below** — the high-frequency rules that cover most tasks. Internalize them; don't make the user ask.
3. **Consult the relevant reference file** when a task goes deeper than the core rules. Each reference is self-contained — read only the one you need.
4. **When auditing**, walk the interface against the checklist at the end and report violations grouped by severity, each with the rule it breaks and a concrete fix.

Don't recite theory at the user. Apply the rules silently in the code you write; only surface the *why* when it changes a decision the user might question (e.g. "I put the destructive action on the left and spaced it out so nobody deletes by reflex").

## Core Rules (apply by default)

### Actions & buttons
- **Primary action placement depends on the container:**
  - **Dialogs / alerts / wizards** → primary on the **right** (Material & Apple convention; the Z-pattern terminal), cancel to its left and quieter.
  - **Forms** → primary **left-aligned directly under the last field** (minimizes eye/cursor travel — Fitts). Don't push a form's submit to the far right.
  - **Narrow / mobile** → stack vertically, primary **on top** or full-width pinned to the bottom (thumb zone).
- **One primary action per view.** Everything else is secondary, tertiary, or ghost. If two buttons look equally important, the user has to stop and think — that's a failure.
- **Separate destructive actions.** Never place "Delete" flush against "Save" with equal weight. Add spacing (≥16px dead-space), a different color (destructive/red variant), and ideally a confirmation. Costly mis-clicks are a Fitts's Law failure.
- **Touch targets ≥ 44×44px** (Apple HIG / WCAG 2.5.5). shadcn's default `size="icon"` and small buttons can fall short — check on mobile. Bigger + closer = faster and fewer errors (Fitts's Law).
- **Buttons must say what they do.** "Save changes", not "OK". "Delete 3 items", not "Confirm".

### Forms
- **Single column, top-aligned labels.** Fastest to scan and complete; works on every screen width. Never multi-column for a linear form.
- **Labels are not placeholders.** A placeholder disappears when the user types, taxing memory and failing contrast. Always use a real `<label>`; placeholders are only for optional examples/hints.
- **< 5 options → radio buttons/segmented control** (all visible). **5–15 → select/dropdown.** **> 15 or known values (country, state) → autocomplete/combobox.** Hiding 2–4 options behind a dropdown wastes clicks.
- **Inline, specific validation.** "Email is invalid" beside the field, not a generic banner. Validate on blur/submit, not on every keystroke.
- **Group long forms into steps** (progressive disclosure) — fewer fields per screen lifts completion.

### Feedback & state
- **Always show system state.** Loading, saving, success, error, and empty are real states you must design — not afterthoughts. A button that does nothing on click reads as broken.
- **Skeleton screens for content loads, spinners only for short blocking actions.** Skeletons feel faster because they preview structure; an endless spinner feels stuck.
- **Empty states must guide, not dead-end.** Explain what goes here + a CTA to add the first item. Never a blank "No records".
- **Respond within ~400ms** (Doherty Threshold) to keep the user in flow; give optimistic UI or a skeleton if the server is slower.
- **Prefer undo over confirmation for reversible actions** — do it immediately + show an "Undo" toast (sonner). Reserve confirmation dialogs (`AlertDialog`) for destructive/irreversible actions. Don't stack both.
- **Toasts are ephemeral** — never put critical info or the only copy of an action in a toast; auto-dismiss ~4–6s.

### Data tables (admin dashboards)
- **Right-align numbers** (with `tabular-nums`), **left-align text**; header alignment matches the cells.
- **Paginate** (show total count + page size); avoid infinite scroll in admin tables.
- **Row actions:** 1–3 inline, the rest in a kebab menu; destructive actions go in the menu, red, with confirm/undo.
- **Skeleton rows** while loading; distinguish *no data yet* from *no results for filter*. Full depth in `references/data-tables.md`.

### Accessibility (baseline, non-negotiable)
- **Text contrast ≥ 4.5:1** (normal) / **≥ 3:1** (large text ≥ 24px or ≥ 18.66px bold). **UI components & icons ≥ 3:1.** Placeholder gray usually fails — don't rely on it for meaning.
- **Never use color as the only signal.** Pair red borders with an error icon + text; pair status colors with labels/shapes. ~8% of men are color-blind.
- **Semantic HTML before ARIA.** Use `<button>`, `<a href>`, `<nav>`, `<label>`, real headings — they're keyboard- and screen-reader-ready for free. Reach for ARIA only when no native element fits; bad ARIA is worse than none.
- **Keyboard operable + visible focus** on every interactive element. Don't remove `outline` without replacing it (`:focus-visible`).
- **Icon-only buttons need an accessible name** (`aria-label` or an `sr-only` span), with the icon `aria-hidden`.
- **Respect `prefers-reduced-motion`** — disable non-essential animation for users who set it.
- Radix/shadcn handle focus-trap, roles, and keyboard nav for you — but you still owe accessible names, heading structure, route-change focus, and label/error wiring (see `references/keyboard-and-aria.md`).

### Typography & spacing
- **Body text ≥ 16px; form inputs ≥ 16px** (smaller triggers iOS zoom). Line height ~1.5 for body, tighter for headings.
- **Keep body line length to ~45–75 characters** (`max-w-prose` / `max-w-[70ch]`); overly wide paragraphs are hard to read.
- **Space on an 8px grid** (Tailwind even steps `2,4,6,8` = 8/16/24/32px). Consistent spacing does the grouping work (Gestalt proximity) — often better than borders.
- **Use `tabular-nums` for columns of numbers** so digits align.

### Consistency & cognition
- **Follow platform conventions** (Jakob's Law): users spend their time on *other* sites, so meet their existing mental models — cart top-right, logo top-left links home, primary action bottom-right. Novelty has a cognitive cost; spend it only where it pays.
- **Reduce choices** (Hick's Law) and **chunk** (Miller's Law, ~5–9 items): break big menus/number strings into groups; hide advanced options until asked.
- **Match component to convention** (Gestalt similarity): if every primary button is a filled rounded rectangle, keep it that way everywhere.

### Content, copy & icons
- **Sentence case everywhere** (buttons, labels, headings) — no trailing periods on labels/buttons.
- **Labels are verb + object** matching the action ("Guardar cambios", "Eliminar proyecto"), and match the dialog title — never "OK"/"Sí"/"Submit".
- **Error copy = what happened + how to fix**, specific, no blame, no raw codes.
- **Descriptive link text** (never "click here"). **Icon-only buttons need `aria-label`** + tooltip; keep one consistent icon set (lucide, `size-4`/`size-5`).

### Text, formatting & security (when relevant)
- **Format via `Intl`, never manually** — dates/numbers/currency by locale. For es-CL: `.` = miles, `,` = decimales, CLP sin decimales. Don't hardcode strings — route through the catalog; don't concatenate translated strings.
- **Auth flows:** allow paste + password managers (`autocomplete`), generic "correo o contraseña incorrectos" (anti-enumeration), `autocomplete="one-time-code"` on OTP, and step-up re-auth for sensitive actions. See `references/security-ux.md`.

### Charts & dashboards
- **Bar charts start the y-axis at 0**; pick the chart by intent (bar=compare, line=trend, pie only ≤5 slices).
- **Colorblind-safe palettes**, never color alone — add labels/patterns; provide a data-table fallback for a11y.
- **KPI cards:** value + label + delta (sign + arrow icon, not color alone) + timeframe. Full depth in `references/data-visualization.md`.

## Reference files

Read the one that matches the depth of the task. Each stands alone.

- **`references/laws.md`** — Cognitive & perceptual laws (Fitts, Hick, Jakob, Miller, Doherty, Zeigarnik, serial position, Von Restorff, aesthetic-usability, Prägnanz, peak-end), Nielsen's 10 heuristics, and Gestalt principles — each with its concrete UI implication. Read to justify a layout decision or run a heuristic audit.
- **`references/accessibility.md`** — WCAG 2.2 contrast ratios & touch targets, color-blindness-safe design, the 60-30-10 color rule, and full dark-mode rules (surfaces, elevation, desaturation, OLED, `prefers-color-scheme`). Read for color systems, theming, or a *visual* a11y audit.
- **`references/keyboard-and-aria.md`** — Non-visual accessibility: POUR, semantic HTML before ARIA, keyboard operability & focus order, focus management in React SPAs (modals, route changes, live regions), ARIA name/role/value, form & image a11y, and exactly what Radix/shadcn give you vs. what you still owe. Read whenever you build interactive components, modals, or forms, or run an a11y audit.
- **`references/layout-and-forms.md`** — Reading patterns (F/Z/layer-cake), button placement & hierarchy in depth, form field alignment & validation, dropdown-vs-radio-vs-autocomplete thresholds, and mobile thumb-zone ergonomics. Read for any non-trivial form or mobile layout.
- **`references/typography-and-spacing.md`** — Line length (45–75ch), line height, modular type scale, 16px minimums, the 8-point spacing grid, fluid `clamp()` type, and Tailwind mappings. Read when setting up type/spacing systems or when a layout feels visually off.
- **`references/data-tables.md`** — Density, column alignment, sorting/filtering, pagination vs infinite scroll, bulk actions, sticky headers, responsive strategies, and table a11y (TanStack + shadcn). Read for any table or data grid (i.e. most admin dashboard work).
- **`references/responsive-nav-feedback.md`** — Mobile-first breakpoints & container queries, navigation patterns & IA (the 3-click myth), and feedback channels (toast vs inline vs modal) including undo-vs-confirmation. Read for responsive layout, navigation, or notification/feedback work.
- **`references/interactions-and-ethics.md`** — Core Web Vitals (perceived performance), microinteraction timing & easing, skeleton vs spinner, empty-state anatomy, and the dark-patterns catalog to avoid (roach motel, confirmshaming, forced continuity, drip pricing) with the symmetry test. Read for loading/transition work or any conversion/subscription/consent flow.
- **`references/data-visualization.md`** — Chart type by intent, axis rules (bars start at zero), colorblind-safe palettes, chart a11y (table fallback), KPI/stat cards, dashboard layout, number formatting (Recharts + shadcn Charts). Read for any chart, KPI tile, or dashboard.
- **`references/i18n-and-rtl.md`** — Text expansion, ICU MessageFormat (no string concatenation), `Intl` formatting (es-CL: CLP no decimals, RUT, comuna/región), RTL via logical properties, locale routing. Read when adding user-facing text, formatting dates/numbers/currency, or making the UI translation-ready.
- **`references/security-ux.md`** — Password field UX (allow paste, autocomplete, strength), NIST password policy, anti-enumeration login errors, 2FA/OTP/passkey UX, SSO/Entra, permissions, session timeout, step-up re-auth (Better Auth + next-safe-action). Read for any auth, login, password, or sensitive-action flow.
- **`references/content-search-icons.md`** — UX writing (sentence case, verb+object labels, error copy), search/autocomplete UX (ARIA combobox), and iconography (labels, sizing, contrast). Read when writing UI copy, building search, or using icons.

## Auditing checklist

When asked to review UX/accessibility, walk the interface against this and report findings grouped **Critical / Important / Minor**, each with: the element, the rule broken, and a concrete fix.

- Is there exactly one clear primary action, placed conventionally?
- Are destructive actions separated and de-emphasized?
- Are all touch targets ≥ 44px on mobile?
- Are labels real (not placeholder-only)? Single column? Right control for option count?
- Does every async action show loading/success/error? Are empty states guiding?
- Text contrast ≥ 4.5:1, UI ≥ 3:1? Is color ever the *only* signal? Focus states visible?
- Does layout respect reading patterns (key info top-left/first, CTA at the visual terminus)?
- On mobile, are primary actions in the thumb-safe zone (bottom/center)?
- Any dark patterns? Is cancelling as easy as subscribing (symmetry test)?
