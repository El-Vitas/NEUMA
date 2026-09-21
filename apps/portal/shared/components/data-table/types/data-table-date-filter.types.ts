import type { DateRange } from '@daypicker/react';
import type { Column, RowData } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/shared/types/table.types';

export type DateSelection = Date[] | DateRange;

export interface DataTableDateFilterProps<TData extends RowData> {
  readonly column: Column<DataTableFeatures, TData, unknown>;
  readonly title?: string;
  readonly multiple?: boolean;
}
