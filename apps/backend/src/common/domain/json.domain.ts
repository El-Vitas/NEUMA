const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSameList = (first: readonly unknown[], second: readonly unknown[]): boolean =>
  first.length === second.length && first.every((entry, index) => isSameJson(entry, second[index]));

const isSameRecord = (first: Record<string, unknown>, second: Record<string, unknown>): boolean => {
  const keys = Object.keys(first);
  return (
    keys.length === Object.keys(second).length &&
    keys.every((key) => key in second && isSameJson(first[key], second[key]))
  );
};

/** Structural equality of two JSON values; the order of the keys of an object does not matter. */
export const isSameJson = (first: unknown, second: unknown): boolean => {
  if (Array.isArray(first)) return Array.isArray(second) && isSameList(first, second);
  if (isPlainRecord(first)) return isPlainRecord(second) && isSameRecord(first, second);
  return first === second;
};
