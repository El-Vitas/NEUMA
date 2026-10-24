import type { PageFilter } from '@neuma/shared';
import { PAGE_FILTER_ME } from '@neuma/shared';

/** The properties a filter reads, at any depth. */
export const listFilterPropertyKeys = (filter: null | PageFilter): readonly string[] => {
  if (filter === null) return [];
  return filter.kind === 'CONDITION' ? [filter.propertyKey] : filter.conditions.flatMap(listFilterPropertyKeys);
};

/** Whether the filter says "me": its answer depends on who looks. */
export const namesViewer = (filter: null | PageFilter): boolean => {
  if (filter === null) return false;
  if (filter.kind === 'GROUP') return filter.conditions.some(namesViewer);
  const { value } = filter;
  return value === PAGE_FILTER_ME || (Array.isArray(value) && value.includes(PAGE_FILTER_ME));
};
