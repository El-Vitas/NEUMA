# Keyboard, Screen Readers & Semantics (non-visual a11y)

Complements `accessibility.md` (contrast, targets, color, dark mode). Target: **WCAG 2.2 AA**. Notes for React/Next.js + Radix/shadcn throughout.

## POUR — the four principles
- **Perceivable** — text alternatives for non-text content, captions, don't rely on color alone, correct programmatic structure.
- **Operable** — everything works from the keyboard, no traps, logical focus order, no time-dependent-only interactions.
- **Understandable** — clear labels, consistent navigation, errors in text with a fix.
- **Robust** — valid HTML, correct name/role/value (SC 4.1.2) for every component so AT can read it.

## Semantic HTML before ARIA
**First rule of ARIA: if a native element with the semantics/behavior exists, use it.** Native elements ship keyboard behavior, focus, roles, and states for free. Bad ARIA is worse than none (ARIA-heavy pages average *more* errors — WebAIM Million).

| Use | Not | Why |
|---|---|---|
| `<button>` | `<div role="button" onclick>` | free Enter/Space, focus, disabled |
| `<a href>` | `<span onclick>` | free focus + Enter, link role |
| `<nav> <main> <header> <footer> <aside>` | `<div class="nav">` | landmarks for SR navigation |
| `<label>`, `<fieldset>/<legend>` | floating text | programmatic association |

- **Headings:** one `<h1>` per view; never skip levels (h2→h4). Headings are the primary screen-reader navigation (SC 1.3.1, 2.4.6).
- **Lists/tables:** real `<ul>/<ol>`, real `<table>` + `<th scope>`.

## Keyboard operability
- **2.1.1 Keyboard (A):** every action works via keyboard. Non-native interactive element ⇒ you own Tab/Enter/Space/Arrow handling.
- **2.4.3 Focus Order (A):** tab order follows visual/reading order. Avoid positive `tabindex`; rely on DOM order.
- **2.1.2 No Keyboard Trap (A):** focus can always leave (modals trap intentionally but release on Escape/close).
- **2.4.7 Focus Visible (AA):** never `outline:none` without a replacement — use `:focus-visible` (shadcn's `focus-visible:ring-*`).
- **2.4.11 Focus Not Obscured (AA, 2.2):** focused element not fully hidden behind sticky headers/footers.
- **2.4.1 Skip link:** a "Skip to main content" link as the first focusable element → `<main id="main" tabindex="-1">`.

## Focus management in SPAs / React
SPAs break the browser's focus-on-navigation contract — restore it:
- **Route change:** move focus to a top-of-content target (heading or `<main tabindex="-1">`), and announce via an `aria-live="polite"` route announcer (Next.js App Router ships one — verify focus still moves).
- **Modals/dialogs:** `role="dialog"` + `aria-modal="true"` + `aria-labelledby`(title)/`aria-describedby`(body); **trap focus** while open; **Escape closes**; **return focus to the trigger** on close; hide background with `inert` (preferred) or `aria-hidden`. Native `<dialog>.showModal()` gives trap + Escape + restore for free.
- **Dynamic updates/toasts:** `aria-live="polite"` for status, `role="alert"`/`assertive` for errors (SC 4.1.3 Status Messages). The live region must exist in the DOM *before* text is injected.
- **React gotchas:** don't `autoFocus` arbitrarily; manage focus with refs in `useEffect`; conditionally-rendered content receiving focus needs `tabindex="-1"`.

## ARIA essentials (name / role / value — SC 4.1.2)
- **Roles** — what it *is* (`dialog`, `tab`, `alert`). Prefer native elements that imply the role.
- **States (sync at runtime via JS):** `aria-expanded`, `aria-selected`, `aria-checked`, `aria-current` (current page/step), `aria-disabled`, `aria-busy`.
- **Naming:** `aria-label` (direct name), `aria-labelledby` (name from visible element), `aria-describedby` (help/error), `aria-hidden="true"` (hide decorative — never on a focusable element).
- **Icon-only buttons MUST have an accessible name:**
  ```html
  <button aria-label="Cerrar"><svg aria-hidden="true">…</svg></button>
  <button><span class="sr-only">Eliminar</span><svg aria-hidden="true">…</svg></button>
  ```
- **Label in Name (2.5.3):** the accessible name must include the visible text — don't let `aria-label` diverge from a visible label.

## Forms accessibility
- **Programmatic label (1.3.1):** every control has `<label for>` (or wraps it). Placeholder ≠ label.
- **Grouping:** radio/checkbox groups in `<fieldset>` with `<legend>` as the question.
- **Errors (3.3.1):** identify in text (not color alone); `aria-invalid="true"` + `aria-describedby="err-id"`; announce dynamic errors via `role="alert"`. Keep the error node's `id` stable across renders.
- **Labels/Instructions (3.3.2):** use the `required` attribute (not just an asterisk); format hints via `aria-describedby`.
- **Input purpose (1.3.5 AA):** set `autocomplete` (`name`, `email`, `tel`, `street-address`…) on personal-data fields.
- **New in 2.2:** **3.3.7 Redundant Entry** — don't force re-entering data given earlier in the same flow; **3.3.8 Accessible Authentication** — allow paste into OTP fields and password managers.

## Images & media (SC 1.1.1)
- **Informative:** `alt` conveys the equivalent info concisely (don't start with "image of").
- **Decorative:** `alt=""` (present but empty) so AT skips it; omitting `alt` may make readers announce the filename.
- **Functional** (icon link/button): describe the *action*, not the picture.
- **Complex** (chart): short `alt` + long description nearby / via `aria-describedby`.
- **Media:** captions (1.2.2), no autoplay audio.

## What Radix/shadcn give you — and what you still owe
**Radix gives for free** (shadcn styles on top of Radix's behavior layer): correct roles + ARIA, focus trap in Dialog/AlertDialog/Popover, focus-in on open + **return-to-trigger on close**, Escape to close, background isolation, roving-tabindex arrow nav for Tabs/Menu/Select/RadioGroup, APG-compliant keyboard patterns.

**You still must:**
- Render `Dialog.Title`/`Description` (or pass `aria-label`) — a titleless dialog is unnamed.
- Add `aria-label` to **icon-only** buttons/triggers (shadcn won't).
- Manage **route-change focus** and page `<title>` (Radix scope is per-component).
- Correct **heading hierarchy** and landmarks in the layout.
- Use shadcn `FormLabel`/`FormMessage` (wires `htmlFor`/`aria-invalid`/`aria-describedby` via react-hook-form) — verify, add `role="alert"` for live errors.
- Contrast, focus-visible styling, target size — visual layer, on you.
- Don't break inherited a11y (`asChild` misuse, stripping the trigger).

## Also do (high-value, easy Next.js misses)
- **`lang` on `<html>`** (3.1.1) and on foreign passages (3.1.2) — drives SR pronunciation.
- **Unique page `<title>` per route** (2.4.2) — via Next.js Metadata API; first thing announced on navigation.
- **Reflow/zoom** (1.4.10, 1.4.4) — usable at 200% zoom and 320px width, no horizontal scroll.
- **Session time limits** (2.2.1) — warn + allow extension (relevant to the auth/admin apps).
- **Custom composite widgets** (combobox, tree, grid, date picker) — follow the WAI-ARIA APG pattern exactly, or use a headless a11y lib (Radix, React Aria). Hardest to hand-roll.
- **Testing:** automated tools (axe-core, `eslint-plugin-jsx-a11y`, Lighthouse) catch only ~30–40% — also do keyboard-only walkthroughs and a real screen reader (NVDA+Firefox / VoiceOver+Safari).
- **Legal:** WCAG 2.2 AA is the practical target for the EU EAA (June 2025) and ADA/Section 508.

## Sources
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- Using ARIA — https://www.w3.org/TR/using-aria/ · MDN ARIA — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- WAI-ARIA Authoring Practices (APG) — https://www.w3.org/WAI/ARIA/apg/
- Radix accessibility — https://www.radix-ui.com/primitives/docs/overview/accessibility
- WAI images tutorial — https://www.w3.org/WAI/tutorials/images/
