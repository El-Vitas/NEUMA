# Data Visualization & Dashboards

Concrete rules mapped to React/Next.js + Recharts (shadcn/ui Charts).

## Chart type — pick by intent
Decide the data *relationship* first, then the chart (FT Visual Vocabulary: deviation, correlation, ranking, distribution, change-over-time, magnitude, part-to-whole, spatial, flow).

| Intent | Chart | Key rule |
|---|---|---|
| Compare categories | **Bar/Column** | Y starts at 0. Sort by value unless natural order. Horizontal bars for long labels or >7 categories. |
| Trend over time | **Line** | Time on X. Zero baseline optional. Max ~4–5 lines before spaghetti. |
| Trend + cumulative magnitude | **Area/Stacked area** | Only when filled volume is meaningful; don't stack >4 series. |
| Correlation (2 numeric vars) | **Scatter/Bubble** | Bubble encodes 3rd var by **area**, not radius. |
| Part-to-whole (few slices) | **Pie/Donut** | **≤5 slices** (ideally 3–5); prefer donut. |
| Part-to-whole + comparison | **100% stacked bar** | Better than pie across categories. |
| Distribution | **Histogram** | Bars touch (continuous bins). |

**When NOT to use a pie:** >5 slices, comparing precise values, trends over time, or comparing across groups → use a bar. Pie only when one slice dominates or the split IS the message. Don't use line/area for categorical X (implies false continuity).

## Axes & scales
- **Bar charts: y-axis MUST start at 0** — bars encode by length, truncating misleads. Recharts default starts at 0; don't override with `domain`. 
- **Line charts may use a non-zero baseline** (encode by slope) — if cropped, label clearly.
- **Always label axes with units;** format ticks (`tickFormatter`) with compact numbers.
- **Avoid dual y-axes** (imply false correlation) — use paired charts sharing an X, or indexed values.
- **Consistent scales** across small multiples and the whole dashboard.

## Color
- **Palette families:** categorical (unordered), sequential (ordered magnitude), diverging (meaningful midpoint).
- **Colorblind-safe defaults:** categorical → **Okabe-Ito** (`#0072B2` `#E69F00` `#D55E00` `#009E73` `#CC79A7` `#56B4E9` `#F0E442`); sequential → **Viridis/Cividis**; diverging → **RdBu**/**PiYG**, never RdYlGn.
- **Never red-green alone** (~8% of men have CVD); vary lightness so it survives grayscale.
- **Limit categorical colors to ~6–8;** beyond that group into "Other" or change chart.
- **Direct-label series** (at line end / on slice) over a separate legend when possible.
- **Consistent color mapping across the dashboard** — "Revenue" is the same hue everywhere. In shadcn, centralize in `ChartConfig` with `var(--chart-1..5)`.

## Accessibility (WCAG 2.2)
- **Never color alone (1.4.1)** — add patterns, direct labels, or dash styles.
- **Text alternative (1.1.1):** `role="img"` + `aria-label` with a one-sentence takeaway; `aria-describedby` → longer summary for complex charts.
- **Data-table fallback** — a real `<table>` (headers + caption) with the same data. The single most reliable a11y measure.
- **Recharts:** set the **`accessibilityLayer`** prop for keyboard nav + basic SR support, but it only exposes tick/tooltip text — the table fallback + `aria-label` remain mandatory.
- **Contrast:** text ≥ 4.5:1, lines/marks ≥ 3:1 (1.4.11), lines ≥ 2px. Interactive points/legend toggles focusable.

## KPI cards / stat tiles
Consistent order across all cards: **Label → Value → Delta → Timeframe (+ sparkline)**.
- **Value** large & bold (2–3× secondary text). Labels lighter.
- **Delta** shows sign + value (`+12.4%` / `−3.1%`) with **color + arrow icon** (▲/▼), never color alone; always state the comparison ("vs. mes anterior").
- **Sparkline** — word-sized trend; direction the point value lacks (above-target-but-falling ≠ rising).
- Semantic thresholds (green target / amber warning / red action) paired with icon/text.

## Dashboard layout
- **Most important metric top-left** (F/Z scan, "golden triangle").
- **Group related metrics;** one view = **4–6 high-impact tiles/charts**, more → tabs/drill-through.
- **Tufte data-ink ratio:** strip chartjunk — no 3D, heavy borders, gradients, redundant legends. Recharts: `tickLine={false}`, `axisLine={false}`, minimal `CartesianGrid`.
- **Consistent time ranges** across charts; **global filters** in one panel above the content; **progressive disclosure** (summary → drill-down).

## Data formatting
- **Abbreviate large numbers:** `Intl.NumberFormat(locale, { notation:'compact' })` → "1.2K", "123M" (above ~10K); keep full precision in tooltips/tables.
- **Thousands separators** (locale-aware), **consistent decimals per metric**.
- **Localize** number/currency/date via `Intl` (`{ style:'currency', currency:'CLP' }`).
- **Right-align numbers** with **`tabular-nums`** so digits align and don't jitter on live updates.

## Chart states
- **Tooltip:** shadcn `ChartTooltip`; show series + formatted value + unit; dismissible (ESC).
- **Loading:** `Skeleton` matching the chart footprint (not a spinner).
- **Empty/"no data":** icon + message + optional action ("Ajustar filtros"), not a blank axis frame.
- **Error:** distinct message + retry; never render a misleading empty chart on failure.

## Also worth doing
- **Small multiples** (shared scales) beat one crowded multi-series chart.
- Keep entry animation ≤ 300ms; disable on `prefers-reduced-motion`; don't re-animate on every poll.
- Wrap in `ResponsiveContainer`; on narrow screens switch grouped→stacked/horizontal bars, hide dense ticks.
- **Reference lines** (`ReferenceLine`) for targets/averages add cheap context.
- Order pie slices largest→smallest from 12 o'clock; don't round deltas to exaggerate change.

## Sources
- Storytelling with Data — zero baseline — https://www.storytellingwithdata.com/blog/2012/09/bar-charts-must-have-zero-baseline
- IBM Carbon dataviz color — https://carbondesignsystem.com/data-visualization/color-palettes/
- Datawrapper — choosing colors — https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization
- FT Visual Vocabulary — https://ft-interactive.github.io/visual-vocabulary/
- Chart a11y — https://www.smashingmagazine.com/2024/02/accessibility-standards-empower-better-chart-visual-design/
- shadcn/ui Charts — https://ui.shadcn.com/docs/components/chart · Okabe-Ito — https://colorblind.io/guides/colorblind-safe-palettes
