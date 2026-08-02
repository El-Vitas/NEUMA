# Layout, Forms & Mobile Ergonomics

## Reading / scanning patterns
Users scan, they don't read. Match layout to the pattern:
- **F-pattern** — text-heavy pages (articles, search results, tables). Eyes read the top line, a shorter second line, then run down the left edge. **Do:** front-load keywords in headings and the start of paragraphs/list items; never bury value props mid-paragraph; use bullets.
- **Z-pattern** — sparse, visual pages (landing pages). Eye sweeps top-left→top-right, diagonal down, then left→right. **Do:** logo top-left, secondary nav top-right, primary CTA at the bottom-right terminus.
- **Layer-cake** — users jump between headings/subheads, skipping body. **Do:** clear, descriptive H2/H3s; scannable structure.
- **Spotted** — eyes lock onto differentiated elements: numbers, bold terms, links. **Do:** bold key terms, use numerals.

## Button placement & hierarchy
Placement is convention-driven and depends on the container — don't apply one rule everywhere:
- **Dialogs / alerts / wizards (horizontal):** primary/confirming action on the **right/last**, cancel immediately to its left (Material 3 & Apple HIG). Deviating from the platform's OK/Cancel order measurably slows users (NN/g). Legacy Windows put OK on the left — match the dominant platform, but web/mobile default is right.
- **Forms:** primary button **left-aligned, directly under the last field** — not far-right. This minimizes the distance the eye/cursor travels from the last input to the submit (Fitts). A form is a top-to-bottom flow, not a dialog.
- **Stacked (vertical) buttons:** the confirming action goes **on top** (reverses the horizontal order); on mobile, full-width in the thumb zone.
- **Destructive actions:** separate spatially from benign ones (deliberate Fitts friction), style red, never make them the Enter-key default, and confirm irreversible ones — consider making Cancel the default.
- **Hierarchy — one primary only:**
  - **Primary** (filled/accent) — the single main action.
  - **Secondary** (outline/tonal) — alternative actions.
  - **Tertiary/ghost** (text) — low-priority (Cancel, Learn more).
  - **Destructive** — red/destructive variant, separated from primary; confirm irreversible actions.
- **Separation:** ≥ 16px dead-space between primary and destructive; don't give them equal visual weight.
- **Labels:** verb + object ("Save changes", "Delete 3 files"), never "OK/Yes/Submit" alone.

## Form design
- **Single column.** Multi-column forms create ambiguous scan paths and break on mobile. One field per row, top to bottom. (NN/g: guideline-compliant forms hit **~78% first-try submission vs ~42%** for non-compliant.) Only exception: short linked fields on one row (City / State / ZIP).
- **Label alignment (Penzo eye-tracking saccade times):**
  - **Top-aligned — default (~50ms).** Fastest; label + field captured in one fixation; scales to any width and any language length; mobile-safe. Don't bold labels (+80ms).
  - **Right-aligned (beside input, ~170–240ms)** — space-efficient on desktop, but ragged left edge is hard to scan. Only for long desktop forms tight on vertical space.
  - **Left-aligned (beside input, ~500ms — 10× slower)** — high cognitive load (long eye jumps); use only when *deliberately* slowing the user for accuracy (legal/financial).
- **Labels ≠ placeholders.** Placeholders vanish on input, tax memory, and fail contrast. Use a real `<label>` always; placeholders only for optional format hints ("e.g. +56 9 1234 5678").
- **Control by option count** (Baymard):
  - **< 5 options → radio buttons / segmented control** — all visible, one tap.
  - **5–15 → select/dropdown.**
  - **> 15, or a known value the user can type (country, state) → autocomplete/combobox.**
- **Validation:** inline, specific, beside the field, on blur/submit — not on every keystroke. Say what's wrong and how to fix it. Preserve entered data on error.
- **Long forms:** chunk into steps with a progress indicator (progressive disclosure) to lift completion.
- **Required vs optional:** mark clearly with text, not color alone; consider marking optional fields instead if most are required.

## Mobile thumb zone (Steven Hoober)
~49% hold phones one-handed; the thumb drives ~75% of interactions.
- **Green / safe zone** — bottom & center. Put primary actions, bottom nav/tabs, sticky CTAs, search here. Reachable and accurate.
- **Yellow / stretch zone** — mid and upper-center. Reachable with a grip shift.
- **Red / hard zone** — top corners and far top edge. Painful; requires a second hand. Put here only rare or *intentionally guarded* actions ("Close account", destructive settings) — distance as friction-protection.
- **Practical:** bottom tab bars (Spotify pattern), sticky "Add to cart"/"Continue" pinned to the bottom, avoid top-corner primary actions. Reduces rage-clicks and improves INP.

## Sources
- Baymard Institute (forms, dropdowns) — https://baymard.com/blog
- NN/g reading patterns — https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- Steven Hoober, thumb zone — https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Material 3 buttons — https://m3.material.io/components/buttons/guidelines
