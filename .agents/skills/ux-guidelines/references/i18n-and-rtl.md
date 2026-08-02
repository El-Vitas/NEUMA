# Internationalization (i18n), Localization & RTL

For Next.js (app router), code in English, UI in Spanish (es-CL), i18n-ready. Concrete rules.

## Text expansion — never size to English
Translations are systematically longer; **the shorter the string, the bigger the blowup** (buttons/labels/badges are highest risk). Spanish runs ~15–30% longer than English.

| English length | Expected translated |
|---|---|
| ≤ 10 chars | 200–300% |
| 11–20 | 180–200% |
| 21–30 | 160–180% |
| 31–50 | 140–160% |
| > 70 | ~130% |

- Never fix `width`/`height` on text containers — use `min-`/`max-` and let it reflow (prefer logical `inline-size`/`block-size`).
- Allow wrapping; don't rely on truncation for meaning. Long compounds → `overflow-wrap: anywhere` / `hyphens: auto`.
- Don't crowd buttons side-by-side at English width (flex/grid with wrap). Leave line-height room (≥1.5) for accented caps and non-Latin scripts.
- **Pseudo-localization** to test early: ship a dev locale like `[!!! Ïñtérñåtîöñålîzé !!!]` (accents + ~40% padding + brackets) to catch clipping, hardcoded strings, and concatenation. Supported by next-intl / FormatJS.

## Never concatenate — full-sentence templates + ICU MessageFormat
Word order, plurals, and gender differ per language, so string joins and manual pluralization break translation. Use **ICU MessageFormat** with **named placeholders** (next-intl / FormatJS).
- Named placeholders, never joins: `t('greeting', { name })` from `"greeting": "Hola {name}"` — not `t('hola') + ' ' + name`.
- Plurals (locale picks the forms it needs): `"{count, plural, =0 {Carrito vacío} one {# producto} other {# productos}}"`.
- Gender/enum with `select` (`other` mandatory): `"{gender, select, female {La invitó} male {Lo invitó} other {Le invitó}}"`.
- Rich text via `t.rich` (map tags → components) instead of splitting a sentence around an `<a>`.
- **Route Zod/validation error messages and email templates through the catalog too** — a common miss.

## Format via `Intl`, never manually
Use `Intl.DateTimeFormat`/`Intl.NumberFormat` (or next-intl's `useFormatter`, SSR-consistent). Never hand-build dates or hardcode `.`/`,`.
- **Chile:** `.` = thousands, `,` = decimals (opposite of US).
- **CLP has no decimals:** `new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(123456)` → `"$123.456"`.
- Number: `Intl.NumberFormat('es-CL').format(1234.5)` → `"1.234,5"`. Percent: `{ style:'percent' }` (don't append a literal `%`).
- Dates: `Intl.DateTimeFormat('es-CL', { dateStyle:'medium' })`; let locale drive first day of week (Chile: Monday), 12/24h, month names. Never `toISOString().slice()` for display.
- **Reuse formatter instances** (module-level) — constructing `Intl.*` per render is slow.
- Store money as integer minor units; format only at the edge. Store UTC; render in the user's zone (`America/Santiago`, observes DST) via `{ timeZone }`.

## RTL (Arabic/Hebrew) — logical properties, not left/right
Writing logical CSS makes RTL free later and is the modern default even if RTL isn't shipping.
- Set direction: `<html lang={lang} dir={isRtl ? 'rtl' : 'ltr'}>`.
- Replace physical CSS with **logical properties:** `margin-inline`, `padding-block`, `inset-inline-start|end` (not `left`/`right`), `text-align: start|end`, `inline-size`, logical radii.
- **Tailwind logical utilities:** `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. Avoid `ml-`/`mr-`/`left-`/`text-left`. Use `rtl:`/`ltr:` variants for true exceptions.
- **Mirror:** overall layout, directional icons (back/forward arrows, indented lists), progress mapping to time, icon padding.
- **Do NOT mirror:** logos, numbers/digits, media controls (play/FF), circular things (clocks, spinners, refresh), physical-object icons, embedded LTR content (URLs/code). Numeric/phone/code inputs often stay `dir="ltr"` inside an RTL page.

## Language, routing, discovery
- Always `<html lang={locale}>` (per-request in root layout). Mixed-direction inline runs → `dir="auto"` or `<bdi>`.
- **Locale in the URL path** (`/es/...`): app-router `app/[lang]/...`, forward `params` to pages/layouts, validate with a guard + `notFound()`, `generateStaticParams` per locale.
- **Don't geolocate by IP alone** — use `Accept-Language` as an initial *suggestion* only, always let the user pick, and **persist it** (cookie). IP → wrong-language lock-in is a dark pattern.
- Add **`hreflang`** alternates (+ `x-default`) via `alternates.languages` in `generateMetadata`. The locale switcher must preserve the current path.

## Fonts, icons & culture
- Verify glyph coverage: Spanish needs `ñ Ñ á é í ó ú ü ¿ ¡`. With `next/font` include the right `subsets` (`latin`, add `latin-ext` for broader European). Fallback stack must also cover accents (avoid tofu). Don't clip diacritics with tight line-height.
- **Never use flags for languages** (a language ≠ a country; Spanish spans ~20 countries). Use endonyms: "Español", "English".
- Don't encode meaning in color alone (culture-dependent + a11y). Avoid culture-specific metaphors/gestures.

## Pitfalls checklist
- **No text baked into images/SVG** (untranslatable) — keep real text.
- **No hardcoded strings** in JSX/toasts/validation/emails — everything through the catalog with **stable semantic keys** (not the English text as key), one string = one full sentence, with translator context.
- **Name/address:** no first/last split guarantee, no fixed address shape. Chile uses **RUT** (not SSN) and **comuna/región** (not state/ZIP) — keep fields flexible.
- **Sorting:** never default `.sort()` on translated strings — use `Intl.Collator('es', { sensitivity:'base' })` (orders ñ/accents correctly). Also use `Intl.ListFormat` ("a, b y c"), `Intl.RelativeTimeFormat` ("hace 3 días"), `Intl.PluralRules`.
- **SSR hydration:** pin `timeZone`/locale from the request so `Intl` output matches server/client (next-intl handles this).
- **Bundle:** load only the active locale's messages server-side; don't ship all locales to the client.

## Sources
- W3C i18n — text expansion — https://www.w3.org/International/articles/article-text-size
- MDN — CSS logical properties — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
- MDN — Intl.NumberFormat — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- Next.js i18n (app router) — https://nextjs.org/docs/app/guides/internationalization
- next-intl (ICU messages) — https://next-intl.dev/docs/usage/messages
- Material 3 bidirectionality/RTL — https://m3.material.io/foundations/layout/bidirectionality-rtl
