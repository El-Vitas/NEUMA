# UX Writing, Search & Iconography

Mapped to Next.js / shadcn / Tailwind / lucide-react. Verb-object examples in Spanish (target audience).

## UX writing / microcopy
**Voice & tone** — write like a human speaks: clear, concise, plain (concise scannable copy improves usability ~58%, NN/g). Tone flexes by context (error copy calmer/more direct than onboarding). Avoid jargon; short words, active voice, positive framing.

**Sentence case (modern convention)** — use **sentence case** for all UI text (buttons, labels, headings, menu items, tabs): only first word + proper nouns capitalized (Polaris, Mailchimp, Material all mandate it). Faster to read, less shouty, easier for i18n. Title Case only if a brand demands it. **No trailing periods** on labels/buttons/headings/short microcopy — periods only in full-sentence body/help/error text.

**Buttons / CTAs** — lead with **verb + object** matching the exact action: `Guardar cambios`, `Eliminar proyecto`, `Crear factura` — never `OK`, `Enviar`, `Sí`, `Submit`. The button label must match the dialog title (dialog "¿Eliminar proyecto?" → button `Eliminar proyecto`, not `Aceptar`). Destructive/red styling only for hard-to-undo actions.

**Error messages** (≤ 2 sentences, actionable, specific) — state what happened + how to fix. No blame, no raw codes ("Error 404"). Offer a one-click fix when possible.
- Bad: `Error. Invalid input.` Good: `El correo debe incluir un @. Ejemplo: nombre@dominio.cl`

**Other copy** — empty states: explain + primary CTA, never a dead-end. Placeholder = example/format hint only (never a label substitute); helper text is persistent guidance below the field. Tooltips: short, never the only place critical info lives. Confirmation copy names the specific object + consequence.

**Copy accessibility** — descriptive link text (never "click here" / "leer más" as the whole link); expand abbreviations on first use; straightforward reading level; headings nested consecutively (h1→h2→h3), real lists not line breaks.

## Search UX
**Search box** — prominent, expected location (top/header); magnifier icon + submit affordance; clear **✕** once there's a query. shadcn: `Input` + lucide `Search`/`X`, or the `Command` component.

**Autocomplete / typeahead** — **debounce** ~150–300ms before firing; **cancel stale requests** (AbortController) so a slow earlier response can't overwrite a newer one; highlight the matching substring; don't auto-select the first suggestion. Consider recent searches / enriched suggestions, but plain text suggestions matter most.

**ARIA combobox pattern** (for shadcn `Command`/Combobox):
- Input: `role="combobox"` (or native `type="search"`), `aria-expanded`, `aria-controls`→listbox id, `aria-autocomplete="list"`, `aria-activedescendant`→highlighted option id (DOM focus stays on the input).
- Popup: `role="listbox"`; options `role="option"` + `aria-selected`.
- Keyboard: ↓ opens/next, ↑ previous, `Enter` accepts, `Esc` closes; scroll active option into view. cmdk implements most — verify `aria-*` when customizing.

**Scope & submit** — make scope visible (hidden scoped search is risky, NN/g); search-as-you-type for suggestions, commit to a results page on submit for large sets.

**No-results** — never a dead-end: "did you mean"/fuzzy suggestions, broaden filters, popular/related items, keep the query editable.

**Results** — show count, sorting, faceted filters, highlight matched terms, and **preserve query + filters in the URL** (Next.js `searchParams` / `nuqs`) so results are shareable/back-button safe. Announce result counts via `aria-live="polite"`.

## Iconography
**Icons need labels** — pair icon + text for primary nav and important/destructive actions. Icon-only only for universal icons (search, close, menu, back), and always with an accessible name (`aria-label` + usually a shadcn `Tooltip`). Decorative icons → `aria-hidden="true"` with the label on the button.

**Consistency** — one icon set, one style (lucide is stroke/outline — don't mix filled + outline randomly); uniform stroke weight (lucide default `strokeWidth={2}`). Size on a grid: **16 / 20 / 24px** (24 standard, 20 dense) — Tailwind `size-4`/`size-5`. Optically align with adjacent text. Same icon = same meaning everywhere; avoid ambiguous icons.

**Sizing, targets, contrast** — visual icon can be 16–24px but the **tappable target ≥ 44×44px** (WCAG 2.5.8 AA min 24px). Add padding: shadcn icon button `size-9`/`size-10` around a `size-4` icon, ≥8px gap between targets. Meaningful icons need **≥ 3:1 contrast** (WCAG 1.4.11); never meaning by color alone. Icon-only button pattern:
```tsx
<Tooltip><TooltipTrigger asChild>
  <Button size="icon" aria-label="Buscar"><Search className="size-4" aria-hidden /></Button>
</TooltipTrigger><TooltipContent>Buscar</TooltipContent></Tooltip>
```

## Also worth doing
- Copy must survive translation — sentence case + verb-object, no string concatenation; use ICU/next-intl for plurals ("1 resultado" vs "5 resultados"). See `i18n-and-rtl.md`.
- Skeleton/loading states for async search results.
- Use Tailwind logical spacing so icon+label ordering flips correctly in RTL.

## Sources
- NN/g search topic — https://www.nngroup.com/topic/search/ · Scoped search — https://www.nngroup.com/articles/scoped-search/
- Shopify Polaris — voice & tone — https://polaris-react.shopify.com/content/voice-and-tone · error messages — https://polaris-react.shopify.com/content/error-messages
- Mailchimp content style guide — https://styleguide.mailchimp.com/
- WAI-ARIA APG combobox — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- Material 3 icons — https://m3.material.io/styles/icons/designing-icons · Apple HIG layout (44pt) — https://developer.apple.com/design/human-interface-guidelines/layout
