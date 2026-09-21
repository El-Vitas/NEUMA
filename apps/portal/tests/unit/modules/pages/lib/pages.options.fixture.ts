import type { PagePropertyOption } from '@company-brain/shared';

/** Options named the short way a test wants to read them, with no color of their own. */
export const asPropertyOptions = (...values: readonly string[]): readonly PagePropertyOption[] =>
  values.map((value) => ({ color: null, value }));
