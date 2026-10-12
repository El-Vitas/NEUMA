export const toVerificationExpiryInputValue = (date: Date | null): string =>
  date === null ? '' : date.toISOString().slice(0, 10);

/** Expires at the end of the chosen day, so the page stays valid through it. */
export const fromVerificationExpiryInputValue = (value: string): string | undefined =>
  value === '' ? undefined : new Date(`${value}T23:59:59.999Z`).toISOString();
