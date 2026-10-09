/**
 * Null (never chosen) shows everything, so unconfigured and older views look the
 * same; an empty list shows none. Keys the collection no longer has are dropped.
 */
export const readVisiblePropertyKeys = (
  chosen: readonly string[] | null,
  available: readonly string[],
): readonly string[] => {
  if (chosen === null) return available;
  const offered = new Set(available);
  return [...new Set(chosen)].filter((key) => offered.has(key));
};
