import type { Column } from '@tanstack/react-table';
import { useFilterSelection } from './use-filter-selection';

const useColumnFilterSelection = <TData, TValue>(column?: Column<TData, TValue>) => {
  const columnFilterValue = column?.getFilterValue();
  return useFilterSelection<string>(columnFilterValue, (values) => column?.setFilterValue(values));
};

export { useColumnFilterSelection };
