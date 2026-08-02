import type { Column, ColumnDef, SortDirection } from '@tanstack/react-table';
import { createElement } from 'react';
import type { DateRange } from 'react-day-picker';

import type { DateSelection } from '@/shared/components/data-table/types/data-table-date-filter.types';

export const getSortIcon = (isSorted: false | SortDirection) => {
  if (isSorted === 'desc')
    return createElement(
      'svg',
      { className: 'ml-1 size-3.5', viewBox: '0 0 24 24' },
      createElement('path', { d: 'M6 9l6 6 6-6' }),
    );
  if (isSorted === 'asc')
    return createElement(
      'svg',
      { className: 'ml-1 size-3.5', viewBox: '0 0 24 24' },
      createElement('path', { d: 'M6 15l6-6 6 6' }),
    );
  return createElement('div', { className: 'ml-1 size-3.5 text-muted-foreground/70' });
};

export const getAriaSort = (isSorted: false | SortDirection): 'ascending' | 'descending' | 'none' => {
  if (isSorted === 'asc') return 'ascending';
  if (isSorted === 'desc') return 'descending';
  return 'none';
};

export const getHeaderLabel = <TData>(columnDef: ColumnDef<TData>, columnId: string): string => {
  const header = columnDef.header;
  if (typeof header === 'string') return header;
  const label = (columnDef.meta as { label?: string } | undefined)?.label;
  return typeof label === 'string' ? label : columnId;
};

export const getIsDateRange = (value: DateSelection): value is DateRange =>
  value !== undefined && typeof value === 'object' && !Array.isArray(value);

export const buildSelectionLabel = (count: number, defaultTitle: string): string => {
  if (count === 0) return defaultTitle;
  return `${count} seleccionad${count === 1 ? 'o' : 'os'}`;
};

export const parseAsDate = (timestamp: number | string | undefined): Date | undefined => {
  if (timestamp === undefined || timestamp === 0 || timestamp === '') return;
  const numericTimestamp = typeof timestamp === 'string' ? Number(timestamp) : timestamp;
  const date = new Date(numericTimestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const parseColumnFilterValue = (value: unknown): (string | number)[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value))
    return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number');
  if (typeof value === 'string' || typeof value === 'number') return [value];
  return [];
};

export const getIsValidRange = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number';

export const computeStep = (rangeSize: number): number => {
  if (rangeSize <= 20) return 1;
  if (rangeSize <= 100) return Math.ceil(rangeSize / 20);
  return Math.ceil(rangeSize / 50);
};

export const parseValuesAsNumbers = (value: unknown): [number, number] | undefined => {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => (typeof v === 'string' || typeof v === 'number') && !Number.isNaN(v))
  ) {
    return [Number(value[0]), Number(value[1])];
  }
};

export const buildTableEmptyMessage = (
  isEmpty: boolean,
  hasActiveFilter: boolean,
  filteredText: string,
  emptyText: string,
): string | undefined => {
  if (!isEmpty) return;
  return hasActiveFilter ? filteredText : emptyText;
};

export const getStringFilterValue = <TData>(column: Column<TData>): string => {
  const value = column.getFilterValue();
  return typeof value === 'string' ? value : '';
};

export const getEmptyMessage = <_T>(
  table: { getState: () => { columnFilters: unknown[] } },
  emptyMessage?: string,
  emptyMessageFiltered?: string,
): string => {
  const hasActiveFilters = table.getState().columnFilters.length > 0;
  if (hasActiveFilters && emptyMessageFiltered) return emptyMessageFiltered;
  if (hasActiveFilters) return 'No hay resultados para este filtro. Intenta limpiar los filtros.';
  return emptyMessage ?? 'Sin resultados.';
};
