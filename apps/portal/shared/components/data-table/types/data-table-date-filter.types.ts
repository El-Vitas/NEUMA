import type { Column } from '@tanstack/react-table';
import type { DateRange } from 'react-day-picker';

export type DateSelection = Date[] | DateRange;

export interface DataTableDateFilterProps<TData> {
  readonly column: Column<TData, unknown>;
  readonly title?: string;
  readonly multiple?: boolean;
}
