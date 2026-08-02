import { useMemo } from 'react';

const useFilterSelection = <T>(columnFilterValue: unknown, onFilterChange: (values: T[] | undefined) => void) => {
  const selectedValues = useMemo(
    () => new Set<T>(Array.isArray(columnFilterValue) ? columnFilterValue : []),
    [columnFilterValue],
  );

  const onItemSelect = (optionValue: T, isSelected: boolean) => {
    const newSelectedValues = new Set(selectedValues);
    if (isSelected) {
      newSelectedValues.delete(optionValue);
    } else {
      newSelectedValues.add(optionValue);
    }
    const filterValues = Array.from(newSelectedValues);
    onFilterChange(filterValues.length ? filterValues : undefined);
  };

  const onReset = () => {
    onFilterChange(undefined);
  };

  return {
    onItemSelect,
    onReset,
    selectedValues,
  };
};

export { useFilterSelection };
