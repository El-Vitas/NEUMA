/** An own entry of a table, so a name such as "constructor" never finds something the table did not declare. */
export const lookupOwnEntry = <Entry>(table: Readonly<Record<string, Entry>>, key: string): Entry | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;
