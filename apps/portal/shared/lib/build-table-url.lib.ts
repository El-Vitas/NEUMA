import type { BuildTableUrlOptions, BuildTableUrlParams } from '@/shared/types/table.types';

export const buildTableUrl = (
  { pageIndex, pageSize, sorting, columnFilters }: BuildTableUrlParams,
  { baseUrl, filterParamMap, sortFieldMap }: BuildTableUrlOptions,
): string => {
  const params = new URLSearchParams();
  params.set('page', String(pageIndex + 1));
  params.set('pageSize', String(pageSize));

  if (sorting.length > 0) {
    const sortField = sortFieldMap?.[sorting[0].id] ?? sorting[0].id;
    params.set('sort', sortField);
    params.set('sortDir', sorting[0].desc ? 'desc' : 'asc');
  }

  for (const filter of columnFilters) {
    const value = filter.value;
    const paramKey = filterParamMap?.[filter.id] ?? filter.id;
    if (Array.isArray(value) && value.length > 0) {
      params.set(paramKey, value.join(','));
    } else if (typeof value === 'string' && value.length > 0) {
      params.set(paramKey, value);
    }
  }

  return `${baseUrl}?${params.toString()}`;
};
