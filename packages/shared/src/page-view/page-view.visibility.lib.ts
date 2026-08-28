/**
 * Which properties a view shows, and in what order.
 *
 * A view that chose nothing shows everything the collection has: that is what a
 * collection looks like before anybody configures it, and it is also what a view
 * written before this existed should keep looking like. Choosing an empty list
 * is a different thing, and it means showing none.
 *
 * What the view names but the collection no longer has is left out rather than
 * shown empty, because a column for a property that was removed is a column
 * about nothing.
 */
export const readVisiblePropertyKeys = (
  chosen: readonly string[] | null,
  available: readonly string[],
): readonly string[] => {
  if (chosen === null) return available;
  const offered = new Set(available);
  return [...new Set(chosen)].filter((key) => offered.has(key));
};
