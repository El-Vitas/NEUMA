import type { Column, RowData } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/shared/types/table.types';
import { useFilterSelection } from './use-filter-selection';

const useColumnFilterSelection = <TData extends RowData, TValue>(column?: Column<DataTableFeatures, TData, TValue>) => {
  const columnFilterValue = column?.getFilterValue();
  return useFilterSelection<string>(columnFilterValue, (values) => column?.setFilterValue(values));
};

export { useColumnFilterSelection };
