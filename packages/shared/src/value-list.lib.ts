/** An `as const` list rejects arbitrary strings in `includes`; widening it to `string[]` avoids casting. */
export const isOneOf = <T extends string>(values: readonly T[], value: string): value is T => {
  const texts: readonly string[] = values;
  return texts.includes(value);
};
