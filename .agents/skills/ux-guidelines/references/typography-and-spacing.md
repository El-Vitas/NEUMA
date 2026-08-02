# Typography & Spacing Systems

Concrete numeric rules. Tailwind/shadcn mappings inline.

## Line length (measure)
- **Body text: 45–75 characters per line, ~66 ideal.** Too long → the eye loses the next line's start; too short → too many return sweeps. Never exceed **80** (WCAG 1.4.8).
- **Control with `max-width` in `ch` units** (`ch` = width of "0", tracks the font): `max-width: 60–75ch`. Tailwind: `max-w-prose` (~65ch) or `max-w-[70ch]`.

## Line height (leading) — use unitless values
- **Body ~1.5** (WCAG 1.4.12 requires ≥ 1.5× for body blocks; 1.5–1.75 comfortable).
- **Headings tighter, 1.1–1.3** — large type has built-in optical spacing.
- **Longer lines need more leading**; short lines can be tighter.
- Use `line-height: 1.5` (unitless), not `24px` or `150%`, so it scales with inherited size.

## Type scale (modular scale)
Start at **16px base**, multiply/divide by a ratio:

| Ratio | Name | Best for |
|---|---|---|
| 1.125 | Major Second | Dense/data-heavy app UI (subtle steps) |
| 1.20 | Minor Third | Content sites |
| 1.25 | Major Third | General UI (balanced) — good default |
| 1.333 | Perfect Fourth | Marketing/landing (distinct hierarchy) |
| 1.618 | Golden | Expressive/editorial |

Smaller ratios for information-dense UIs (many sizes coexist); medium for content/marketing. **Consider a smaller ratio on mobile, larger on desktop** so headings don't overwhelm small screens.

## Font-size minimums
- **Body ≥ 16px on web** (mobile especially). **Form inputs ≥ 16px** — below that (15px) iOS Safari auto-zooms on focus. Never disable zoom to work around it (violates WCAG 1.4.4) — fix the size.
- **Captions/secondary: 12–14px** (12 is the floor; use sparingly).

## Spacing — the 8-point grid (+ 4px sub-grid)
- Make every padding/margin/gap a **multiple of 8**: 8, 16, 24, 32, 40, 48… Use a **4px sub-grid** for tight internal spacing (icon-to-label).
- **Why 8:** common device widths divide by 8 → crisp alignment; clean factors scale predictably; a fixed value set removes guesswork.
- **Internal ≤ external:** padding inside a group ≤ the space separating it from other groups (Gestalt proximity — spacing is the primary grouping cue, often stronger than borders).
- **Be generous with padding** — cramped UIs read as lower quality.

## Font pairing, weight, tracking
- **Limit to 2–3 typefaces** (heading, body, optional accent).
- **Weight for hierarchy:** contrast meaningfully — 400 vs 700 reads clearly; 300 vs 400 is too subtle.
- **Tracking (letter-spacing):** increase (positive) for all-caps and small text; tighten (negative) for large display; body stays at 0. Never all-caps for long text (kills word-shape recognition) — reserve for short labels with added tracking.
- **Avoid full justification** on the web (rivers of whitespace) — left-align ragged-right.

## Responsive type — fluid with `clamp()`
- `font-size: clamp(MIN_rem, PREFERRED, MAX_rem)`.
- **The preferred value must mix `vw` with a `rem` term** (e.g. `2.5vw + 1rem`). A pure-`vw` value breaks browser zoom → fails WCAG 1.4.4. Keep min/max bounds in **`rem`, not px**, to respect the user's base font size.

## Tailwind mapping
- **Type scale:** `text-xs`(12) `text-sm`(14) `text-base`(**16, lh 1.5**) `text-lg`(18) `text-xl`(20) `text-2xl`(24) `text-3xl`(30) `text-4xl`(36)… Defaults already tighten leading as size grows (matches the leading rule). **Use `text-base` for primary reading and all inputs.**
- **Spacing:** 1 unit = 0.25rem = **4px**. `p-2`=8, `p-4`=16, `gap-6`=24, `m-8`=32. Stick to **even values (`2,4,6,8`)** for the 8pt grid; odd (`1,3,5`) is the 4px sub-grid.
- **Leading:** `leading-relaxed`/`leading-normal` body, `leading-tight` headings. **Tracking:** `tracking-wide`/`wider` with `uppercase` labels.
- **Modern niceties:** `text-balance` (headings — even ragging), `text-pretty` (body — no orphans), `tabular-nums` (align numbers in tables/dashboards), `line-clamp-*` (cap lines instead of pushing layout).

## Also worth doing
- **`next/font`** + `font-display: swap` and fallback metrics to avoid layout shift (CLS); fewer weights = faster.
- **Logical properties** (`margin-inline`, `padding-block`) for i18n/RTL-aware spacing.
- **Dark mode:** bright text on dark bloats optically (halation) — consider a slightly lighter body weight and avoid pure #FFF on #000.
- **WCAG 1.4.12 full set:** users must be able to override to letter-spacing ≥ 0.12em, word-spacing ≥ 0.16em, paragraph spacing ≥ 2× — don't lock these with `!important`.

## Sources
- Butterick's Practical Typography (line length) — https://practicaltypography.com/line-length.html
- WCAG 1.4.12 Text Spacing — https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- Material 3 typography — https://m3.material.io/styles/typography/applying-type
- 16px prevents iOS form zoom — https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- Fluid type accessibility — https://www.smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type/
- 8-point grid — https://spec.fm/specifics/8-pt-grid · Tailwind — https://tailwindcss.com/docs/font-size
