/**
 * Orders strings by UTF-16 code unit, which does not depend on the locale of the process. Locks taken in this order
 * are taken in the same order by every transaction, which is what keeps them from deadlocking.
 */
export const compareCodeUnits = (first: string, second: string): number => {
  if (first < second) return -1;
  return first > second ? 1 : 0;
};
