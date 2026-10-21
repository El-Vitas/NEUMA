import type { PagePropertyOption } from '@neuma/shared';
import { PAGE_PROPERTY_TYPE, sortPageOptionsByGroup } from '@neuma/shared';
import type { PageSchemaProperty } from '../types/pages.schema.types';

/** A status lists its options from the ones not begun to the ones done, whatever order they were added in. */
export const listPropertyOptions = (property: PageSchemaProperty): readonly PagePropertyOption[] => {
  const options = property.options ?? [];
  return property.type === PAGE_PROPERTY_TYPE.STATUS ? sortPageOptionsByGroup(options) : options;
};
