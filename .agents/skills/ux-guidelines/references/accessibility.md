# Accessibility, Color & Dark Mode

## WCAG contrast (2.1 / 2.2)
Contrast ratio = relative luminance difference, from 1:1 (none) to 21:1 (black on white).

| Element | AA (min) | AAA (enhanced) |
|---|---|---|
| Normal text | **4.5:1** | 7:1 |
| Large text (≥ 18pt/24px, or ≥ 14pt/18.66px bold) | **3:1** | 4.5:1 |
| UI components & graphics (borders, icons, focus rings, chart segments) — SC 1.4.11 | **3:1** | — |

- There is **no rounding grace**: 2.99:1 fails a 3:1 requirement.
- **Placeholder text** in light gray almost always fails 4.5:1 — never encode meaning there.
- **Text over images/gradients:** the *lowest-contrast point* of the overlap must still pass. Add a scrim/overlay.
- Tools: check ratios with a contrast checker (WebAIM) or browser devtools before shipping.

## Touch / pointer targets
- **WCAG 2.5.5 (AAA):** ≥ 44×44 CSS px. **Apple HIG:** 44×44pt. **Material:** 48×48dp.
- **WCAG 2.5.8 Minimum (AA, 2.2):** ≥ 24×24 CSS px with adequate spacing.
- Practical rule: **44px** for anything a finger taps. shadcn `size="sm"`/`size="icon"` may be smaller — verify on mobile.

## Focus visibility
- Every interactive element needs a **visible focus indicator** for keyboard users (SC 2.4.7; 2.4.11/2.4.13 in 2.2 govern focus appearance/obscuring).
- Never `outline: none` without a replacement (e.g. a `ring`). shadcn ships `focus-visible:ring-*` — keep it.

## Color blindness & "color is not enough" (SC 1.4.1)
- Prevalence: ~8% of men, ~0.5% of women. Types: **protanopia/anomaly** (red), **deuteranopia/anomaly** (green — most common), **tritanopia** (blue-yellow), **achromatopsia** (no color).
- **Color must never be the ONLY way** to convey information, indicate state, or distinguish elements.
- **Redundant cues:** error = red border **+ icon + text**; success = green **+ checkmark**; links in body text = **underline** (not just blue); chart series = color **+ pattern/label/direct labels**; required field = asterisk **+ "required"**.

## The 60-30-10 color rule
Balances a palette and creates hierarchy:
- **60% dominant** — neutral background/surfaces (off-white `#f8fafc`, or dark gray in dark mode). Sets the calm base.
- **30% secondary** — supporting structure: nav, headers, sidebars, section backgrounds, borders. Must contrast the dominant.
- **10% accent** — the loudest, most saturated color, reserved for the primary CTA, active states, badges, links. **Its power is its scarcity** — if the accent leaks into decoration, it stops signaling action.

## Dark mode
Not an inverted light theme — the eye behaves differently (pupil dilates, halation increases).
- **No pure black base, no pure white text.** Anchor surfaces at dark gray **`#121212`–`#1E1E1E`**; body text ~`#E0E0E0`, not `#FFFFFF`. Pure #000/#FFF creates harsh, fatiguing contrast and text "halo" for astigmatic/myopic users.
- **Desaturate accents & brand colors.** Highly saturated hues vibrate against dark grays. Use muted/lighter tints, and re-verify contrast (light text on saturated color often fails).
- **Elevation via lighter surfaces, not shadows.** Shadows are invisible on dark backgrounds. Higher elevation = lighter gray overlay (Material's elevation-overlay model), optionally a subtle translucent border.
- **Dim bright images/assets** slightly so they don't glare against a dark canvas; prefer SVG icons with `currentColor` for bidirectional legibility.
- **OLED battery:** dark mode only saves power on OLED/AMOLED panels (each pixel is its own light). Purdue study: ~39–47% *display* power saved at 100% brightness (up to ~67% in some measurements), collapsing to ~3–15% at real-world 30–50% brightness. `#121212` costs only ~0.3% more than pure black. Treat battery as a minor bonus, not a reason to force dark mode — offer both.
- **Implementation:** respect the OS via `prefers-color-scheme`; expose a manual toggle; define both themes with CSS variables (this repo uses Tailwind + shadcn tokens — theme via CSS custom properties, not hardcoded colors).

## Motion
- **Respect `prefers-reduced-motion: reduce`** — disable/greatly reduce non-essential animation (parallax, large transitions, autoplay) for users with vestibular disorders. Keep essential feedback but make it instant/fade rather than moving.

## Sources
- WCAG 2.2 — https://www.w3.org/WAI/WCAG22/quickref/
- Understanding Contrast (1.4.3 / 1.4.11) — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Apple HIG Color & Accessibility — https://developer.apple.com/design/human-interface-guidelines/
- Material 3 Color & Dark theme — https://m3.material.io/styles/color/
