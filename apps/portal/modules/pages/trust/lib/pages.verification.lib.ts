export const toVerificationExpiryInputValue = (date: Date | null): string =>
  date === null ? '' : date.toISOString().slice(0, 10);

/** The chosen day counts in full: the page stays valid through its last instant, not just its first. */
export const fromVerificationExpiryInputValue = (value: string): string | undefined =>
  value === '' ? undefined : new Date(`${value}T23:59:59.999Z`).toISOString();
