# Responsive Design, Navigation & Feedback

## A) Responsive & breakpoints
**Mobile-first:** style the smallest viewport first, enhance upward with `min-width`. Forces content prioritization, yields leaner base CSS + smaller mobile payload. In Tailwind, unprefixed = mobile base, prefixed (`sm:`,`md:`) apply **at that width and up** — don't hide base styles behind a breakpoint.

| Tailwind | min-width | Device |
|---|---|---|
| `sm` | 640px | large phone / landscape |
| `md` | 768px | tablet |
| `lg` | 1024px | laptop |
| `xl` | 1280px | desktop |
| `2xl` | 1536px | large desktop |

- **Content-driven > device-driven:** add a breakpoint where *your layout actually breaks*, not at a named device width. These numbers are a starting point. Define in `rem`.
- **Fluid:** `clamp(min, preferred, max)` is the 2025 default for fluid type/spacing and often removes breakpoints. Prefer `rem`/`%`/`vw`/`min()`/`max()`/`clamp()`; avoid fixed `px` widths; `max-width:100%` on media.
- **Container queries** (`@container`) are fully supported in 2025 — use for component-level responsiveness (a card adapts to its parent, not the viewport). Split: media queries for page structure, container queries for reusable components. Tailwind: `@container` + `@md:flex-row`.
- **Touch vs pointer:** targets ≥ 44px (iOS) / 48dp (Android); WCAG 2.5.8 min 24px. **Hover doesn't exist on touch** — never hide essential info/actions behind `:hover`; gate it with `@media (hover:hover) and (pointer:fine)`.
- **Images:** `srcset`/`sizes` or `<picture>`; in Next.js use `next/image` (`priority` for the LCP image, `sizes` for correct candidates).
- **Safe areas:** respect the iOS notch/home indicator with `env(safe-area-inset-*)`; keep primary mobile actions in the bottom thumb zone.

## B) Navigation & information architecture
**Patterns & when:**
- **Top nav** — desktop primary, 5–7 items.
- **Sidebar** — apps/dashboards with many sections and hierarchy.
- **Bottom tab bar (mobile)** — primary nav for **3–5 destinations** users switch between often (Apple HIG + Material 3). Beyond 5, targets get too narrow. Always visible → high discoverability.
- **Hamburger** — saves space **but hidden nav lowers discoverability** ("out of sight = doesn't exist"). Switching hamburger→visible tabs has shown 30%+ jumps in feature discovery. Use only for *secondary* items (settings, help, account).
- **Mega menu** — large catalogs; group under clear headers.
- **Breadcrumbs** — only for genuine depth (≥ 3 levels) or search/deep-link arrivals. Show location; don't replace primary nav.

**IA basics:** derive categories from users' **mental models** (card sorting), not the org chart. **Labels in user language** (strong information scent), avoid internal jargon. Distinguish **findability** (locate a known item) from **discoverability** (realize a feature exists) — hidden nav hurts discoverability.

**The "3-click rule" is a MYTH** (NN/g): click *count* doesn't predict success or satisfaction. What matters is **information scent** (each step confidently predicts the next) and **effort per click**. More easy, well-labeled clicks beat fewer confusing ones. Optimize for "never leave the user lost," not a click budget.

**"You are here":** active-state styling on the current nav item + `aria-current="page"` (Next.js: compute with `usePathname()`), matching breadcrumb and page title. Offer both **search** (known-item) and **browse** (exploration) on large sites.

## C) Feedback & notifications
**Choose the channel:**

| Type | Use when | Notes |
|---|---|---|
| **Inline message/validation** | Error tied to a specific field | Next to the element; say how to fix ("Enter your street address", not "Field blank"). |
| **Indicator** (icon/badge) | Contextual state, no action needed | Adjacent to what it describes. |
| **Toast/snackbar** | Transient, non-critical confirmation ("Guardado") | Auto-dismiss ~4–6s (10s if it has an action). **Never** put critical info or the *only* copy of an action in a toast. |
| **Banner** | Persistent page-level status (outage, trial expiring) | Stays until resolved/dismissed. |
| **Modal dialog** | Requires an immediate decision / blocks flow | Interrupts + traps focus — use sparingly. |

**Prefer Undo over confirmation** (NN/g):
- **Reversible action → do it immediately + show an "Undo" snackbar** for a few seconds (delete row, archive, remove item). No friction, less anxiety.
- **Confirmation dialog only for destructive/irreversible/high-consequence** actions (permanent delete, publish, bulk irreversible, spending money). Add friction proportional to danger (type-to-confirm for the most severe). Separate consequential from benign options spatially to prevent misclicks.
- Rule: **reversible → Undo; irreversible → confirm.** Don't stack both.

**Message design + a11y:** error = what went wrong + how to fix, near the field. Screen-reader announcements: `role="status"` (polite, `aria-atomic`) for "Saved"; `role="alert"` (assertive) for urgent errors — use assertive sparingly. Live regions must exist (empty) in the DOM **before** being populated. WCAG 4.1.3 (announce without focus change), 1.4.1 (not color alone — pair with icon/text), 2.2.1 (don't auto-dismiss critical content).

**shadcn/Next.js mapping:**
- Toasts → **sonner**: `toast.success()`, `toast.error()`, and the undo pattern `toast('Eliminado', { action: { label: 'Deshacer', onClick } })`. Sonner renders an `aria-live` region for you.
- Confirmations → **`AlertDialog`** (role=alertdialog, focus-trapped) for destructive/irreversible; `Dialog` for general modals.
- Inline errors → shadcn `Form` + `FormMessage` (react-hook-form / next-safe-action `useHookFormAction`).
- Persistent status → shadcn `Alert` (`variant="destructive"`).
- **Cap simultaneous toasts / dedupe**; toasts are ephemeral — keep a persistent inbox for anything the user may need later.
- Every async view needs **four states: loading / empty / error / success** (Next.js `loading.tsx` + Suspense, `error.tsx`).

## Sources
- Tailwind responsive — https://tailwindcss.com/docs/responsive-design · Breakpoints 2025 — https://www.browserstack.com/guide/responsive-design-breakpoints
- Material 3 navigation bar — https://m3.material.io/components/navigation-bar
- NN/g 3-Click Rule is false — https://www.nngroup.com/articles/3-click-rule/
- NN/g User Control & Freedom — https://www.nngroup.com/articles/user-control-and-freedom/ · Confirmation dialogs — https://www.nngroup.com/articles/confirmation-dialog/
- NN/g Indicators, Validations, Notifications — https://www.nngroup.com/articles/indicators-validations-notifications/
- Sara Soueidan — accessible notifications with live regions — https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/
