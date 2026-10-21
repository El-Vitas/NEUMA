import type { PagePropertyOption } from '@neuma/shared';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from '@neuma/shared';

/** The identifier of each option is its own name, so a row can say `{ status: 'Todo' }` and mean that option. */
export const asPropertyOptions = (...values: readonly string[]): readonly PagePropertyOption[] =>
  values.map((value) => ({ color: null, group: null, id: value, value }));

/** What a property that needs nothing beyond its type carries. */
export const defaultConfig = DEFAULT_PAGE_PROPERTY_CONFIG;
