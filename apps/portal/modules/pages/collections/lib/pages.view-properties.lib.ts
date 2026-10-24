import type { PageViewProperty } from '@neuma/shared';
import type { PageSchemaProperty } from '../types/pages.schema.types';

/** What the shared engine needs of a column to filter, sort and group by it. */
export const toViewProperties = (properties: readonly PageSchemaProperty[]): readonly PageViewProperty[] =>
  properties.map((property) => ({ key: property.key, options: property.options, type: property.type }));
