import type { Column } from '@tanstack/react-table';

export interface Range {
  min: number;
  max: number;
}

export type RangeValue = [number, number];

export interface DataTableSliderFilterProps<TData> {
  readonly column: Column<TData, unknown>;
  readonly title?: string;
}
