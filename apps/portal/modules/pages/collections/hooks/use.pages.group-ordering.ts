'use client';

import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { moveSchemaOptionSideways } from '../lib/pages.schema-editing.lib';
import type { PagesGroupOrdering } from '../types/pages.group-ordering.types';
import type { PageSchema } from '../types/pages.schema.types';
import { usePagesShapeSaving } from './use.pages.shape-saving';

/**
 * The order lives on the property, shared with board columns, not per view. Only declared option values
 * can move: the unassigned group and groups derived from dates or numbers follow the row data.
 */
export const usePagesGroupOrdering = (schema: PageSchema, groupByKey: string, spaceId: string): PagesGroupOrdering => {
  const shape = usePagesShapeSaving(schema, spaceId);
  const declaredValues = schema.properties.find((property) => property.key === groupByKey)?.options ?? null;

  return {
    canMove: (groupKey: string) =>
      declaredValues !== null &&
      groupKey !== UNASSIGNED_GROUP_KEY &&
      declaredValues.some((option) => option.id === groupKey),
    isBusy: shape.isSaving,
    move: (groupKey: string, direction: 'EARLIER' | 'LATER') =>
      shape.save(moveSchemaOptionSideways(schema.properties, groupByKey, groupKey, direction), schema.views),
  };
};
