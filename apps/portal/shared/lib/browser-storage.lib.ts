/**
 * What this browser remembered, or nothing.
 *
 * Every read and write is wrapped because storage is not always there to be
 * had: a private window, a browser told to keep no site data, or a render that
 * happened on the server all answer by refusing, and none of those are worth
 * taking a page down for.
 */
export const readStoredNumber = (key: string): number | null => {
  if (globalThis.window === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeStoredValue = (key: string, value: unknown): void => {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};
