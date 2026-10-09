import type { PagePropertyOption } from '@neuma/shared';

export const asPropertyOptions = (...values: readonly string[]): readonly PagePropertyOption[] =>
  values.map((value) => ({ color: null, value }));
