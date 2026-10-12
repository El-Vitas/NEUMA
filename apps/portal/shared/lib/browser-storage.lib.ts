/** Every access is guarded: storage can be refused in a private window, with blocked site data, or on the server. */
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
