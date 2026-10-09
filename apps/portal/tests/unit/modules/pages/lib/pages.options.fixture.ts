import type { PagePropertyOption } from '@company-brain/shared';

export const asPropertyOptions = (...values: readonly string[]): readonly PagePropertyOption[] =>
  values.map((value) => ({ color: null, value }));
