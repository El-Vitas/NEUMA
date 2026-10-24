import type { PageViewType } from '@neuma/shared';
import type { PageSchemaView } from '@/modules/pages/collections/types/pages.schema.types';

/** A stored view: the id and version a server gives it, which the queries and operations name it by. */
export const buildView = (
  name: string,
  type: PageViewType,
  overrides: { readonly configuration?: Readonly<Record<string, unknown>>; readonly isDefault?: boolean } = {},
): PageSchemaView => ({
  configuration: overrides.configuration ?? {},
  id: `view-${name.toLowerCase()}`,
  isDefault: overrides.isDefault ?? false,
  name,
  type,
  version: 0,
});
