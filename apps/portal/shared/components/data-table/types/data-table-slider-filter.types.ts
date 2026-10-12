import type { Column, RowData } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/shared/types/table.types';

export interface Range {
  min: number;
  max: number;
}

export type RangeValue = [number, number];

export interface DataTableSliderFilterProps<TData extends RowData> {
  readonly column: Column<DataTableFeatures, TData, unknown>;
  readonly title?: string;
}
