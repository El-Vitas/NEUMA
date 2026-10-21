/** Entries out and entries in of lists of values, by property: relative to what the row holds when it is written. */
export type PageValueListChanges = Readonly<
  Record<string, { readonly add: readonly string[]; readonly remove: readonly string[] }>
>;
