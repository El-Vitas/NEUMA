# Data Tables & Data Grids

For admin dashboards. TanStack Table + shadcn mappings inline.

## Density & row height
- Standard densities: **Compact 40px · Regular 48px · Comfortable 56px**. Default to **Regular (48px)**; Compact for expert/monitoring screens with many rows; Comfortable for multi-line/image rows.
- Offer a **density toggle and persist it** per user/session.
- Cell horizontal padding ≥ 16px each side (≥ 32px between columns).
- Center-align vertically when rows ≤ 3 lines; **top-align once rows exceed 3–4 lines**.
- Tailwind: `h-10`/`h-12`/`h-14` + `py-2`/`py-3`/`py-4`.

## Column alignment
- **Left-align text** and non-magnitude "numbers" (IDs, ZIP, phone, dates).
- **Right-align quantitative numbers** (currency, amounts, %, counts) so magnitudes and decimals line up.
- Use **`tabular-nums`** for numeric columns so digits occupy equal width; keep **consistent decimal precision** down a column.
- **Header alignment matches cell alignment** (right-align numeric headers). Center only checkboxes/icons/ratings.

## Sorting
- Sort chevron/arrow in the header; **reserve its space** so layout doesn't shift on toggle. Indicate active column + direction distinctly; neutral/hover indicator on unsorted.
- Provide a sensible **default sort** (most recent, or "most needing action").
- **Multi-sort** for power users (Shift-click adds keys, show priority). TanStack: `getSortedRowModel()`, `enableMultiSort`.

## Filtering & search
- Always show a **clear indicator when a filter is active** (the view is a subset). Represent active filters as **removable chips** + a **"Clear all"**.
- Patterns: global search (top), inline per-column filters, faceted multi-select (shadcn `DataTableFacetedFilter`). TanStack: `columnFilters` + `globalFilter` + `getFacetedRowModel()`.

## Pagination vs infinite scroll vs load-more
- **Pagination — default for admin tables.** Show total count ("1–25 of 1,340") + page-size selector. **Default 25** (offer 10/25/50/100).
- **Load-more** — hybrid, for recency/relevance-ordered lists.
- **Infinite scroll — avoid for admin tables** (breaks return-to-position, hides totals, footer unreachable). Prefer virtualization + pagination.

## Row selection & bulk actions
- Left-most **checkbox column**; header **select-all** with indeterminate state. Clarify whether select-all = page or entire dataset (offer "select all N across pages").
- On selection, reveal a **sticky bulk-action bar** (count + delete/export/assign…). Prefer a toolbar over many inline icons per row.
- TanStack: `rowSelection` + `getRowId`.

## Sticky headers & frozen columns (wide tables)
- **Sticky header row** on vertical scroll; **pin the first identifier column** (and selection/action column) on horizontal scroll, with a scroll shadow on the frozen edge.
- CSS: `position:sticky; top:0` on `thead th`; `sticky; left:0` on pinned cells. TanStack: `columnPinning`.

## Empty, loading & error states
- **Loading: skeleton rows** matching the column layout (not a spinner), header visible.
- **Empty:** distinguish *no data yet* ("Add first record" CTA) from *no results for filter* ("Clear filters"). Short explanation + icon.
- **Error:** inline error inside the table region with **Retry** — don't blank the screen.

## Row actions
- **1–3 frequent actions:** inline icon buttons (accessible labels/tooltips), emphasized on hover/focus.
- **More/rare/secondary:** collapse into a **kebab "⋯" overflow menu**.
- **Destructive** (delete): in the overflow menu, red, with **confirmation or undo toast**; never adjacent to a common target as the default.
- Editing one record: **prefer a side panel over a modal** so nearby rows stay visible (NN/g).

## Responsive tables (mobile) — in order of preference
1. **Priority columns / progressive disclosure (recommended):** show the few key columns, hide the rest behind an expandable row / detail view. Best usability + data integrity.
2. **Card/stacked:** each row → a key–value card. Good for small/simple tables; costs vertical space, breaks cross-column comparison.
3. **Horizontal scroll:** simplest, preserves the model; OK with a frozen first column + scroll affordance.
- **Never shrink all columns to fit** — it destroys readability. Choose by how much cross-column comparison users need.

## Accessibility
- Semantic **`<table>`** with `<thead>/<tbody>`, `<th scope="col|row">`, and a **`<caption>`** (or `aria-label`). shadcn's Table renders semantic elements.
- **Sortable headers:** a real **`<button>` inside the `<th>`** + **`aria-sort="ascending|descending|none"`** on the active header cell. Announce sort/filter changes via an `aria-live` region.
- Div/grid-based or editable grids must implement **`role="grid"` + arrow-key cell nav** (WAI-ARIA APG) — prefer native `<table>`.
- Non-color sort indicators; ≥ 24px targets.

## Row separation
- **Horizontal 1px low-contrast lines — recommended default** for all sizes.
- **Zebra striping:** helps only **large, dense, many-column** tables; conflicts with hover/selected states and adds noise on small tables — use selectively.
- Full grid for very dense numeric data; no dividers for small/simple tables.

## Also worth doing
- **Column resize/reorder/show-hide** with "reset to default", persisted per user.
- **Row virtualization** (TanStack Virtual) for large datasets, with sticky header + pagination.
- **Truncate long single-line values** with ellipsis + tooltip/expand; wrap only genuinely multi-line content (and top-align those).
- **First column = human-readable identifier**, not an opaque auto-ID; order columns by importance, related ones adjacent.
- **Hover row highlight** (distinct from selected). Localize currency/date/number; put units in the header, not every cell.
- **Deep-link state:** encode sort/filter/page in the URL (Next.js `searchParams`) so views are shareable and back-button friendly.

## Sources
- NN/g Data Tables — https://www.nngroup.com/articles/data-tables/
- Carbon Design System — https://carbondesignsystem.com/components/data-table/usage/
- WAI-ARIA APG sortable table — https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
- Pencil & Paper enterprise tables — https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
