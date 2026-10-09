/**
 * Si un valor es uno de los de una lista fija, y desde ahí se lo trata como tal.
 * Una lista `as const` no acepta en `includes` un texto cualquiera; vista como
 * lista de textos, sí, sin forzar el tipo de nadie.
 */
export const isOneOf = <T extends string>(values: readonly T[], value: string): value is T => {
  const texts: readonly string[] = values;
  return texts.includes(value);
};
