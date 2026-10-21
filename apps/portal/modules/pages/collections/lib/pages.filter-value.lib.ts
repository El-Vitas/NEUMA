import type { PageFilterOperator } from '@neuma/shared';
import { getPagePropertyLogicalType, PAGE_PROPERTY_LOGICAL_TYPE } from '@neuma/shared';
import {
  PAGE_FILTER_GROUP_OPERATORS,
  PAGE_FILTER_PERSON_PROPERTY_TYPES,
} from '../constants/pages.view-filtering.constants';
import type { PageFilterValueKind } from '../types/pages.filter-value.types';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import { filterOperatorNeedsValue } from './pages.view-filtering.lib';

/** How a condition asks for its value, so the field offers what the comparison understands and nothing else. */
export const readFilterValueKind = (
  property: PageSchemaProperty,
  operator: PageFilterOperator,
): PageFilterValueKind => {
  if (!filterOperatorNeedsValue(operator)) return 'NONE';
  if (PAGE_FILTER_GROUP_OPERATORS.includes(operator)) return 'STATUS_GROUP';
  if (PAGE_FILTER_PERSON_PROPERTY_TYPES.includes(property.type)) return 'PERSON';
  switch (getPagePropertyLogicalType(property.type)) {
    case PAGE_PROPERTY_LOGICAL_TYPE.TAG:
    case PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG:
    case PAGE_PROPERTY_LOGICAL_TYPE.STATUS:
      return property.options === null ? 'TEXT' : 'OPTION';
    case PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN:
      return 'BOOLEAN';
    case PAGE_PROPERTY_LOGICAL_TYPE.DATE:
      return 'DATE';
    case PAGE_PROPERTY_LOGICAL_TYPE.NUMBER:
      return 'NUMBER';
    default:
      return 'TEXT';
  }
};
