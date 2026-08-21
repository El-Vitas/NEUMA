/**
 * The same list, with one of its own set down in front of another.
 *
 * `null` for the one it goes before means the end of the line, which is where
 * something dropped past everything belongs. Naming a thing the list does not
 * hold answers nothing at all rather than guessing at what was meant.
 */
export const placeBefore = <T extends { readonly id: string }>(
  listed: readonly T[],
  movedId: string,
  beforeId: null | string,
): null | readonly T[] => {
  const moved = listed.find((item) => item.id === movedId);
  if (moved === undefined) return null;
  if (beforeId !== null && !listed.some((item) => item.id === beforeId)) return null;
  if (beforeId === movedId) return listed;

  const remaining = listed.filter((item) => item.id !== movedId);
  const landing = beforeId === null ? remaining.length : remaining.findIndex((item) => item.id === beforeId);
  return [...remaining.slice(0, landing), moved, ...remaining.slice(landing)];
};
