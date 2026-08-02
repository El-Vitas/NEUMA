export type SortDirection = 'asc' | 'desc';

export interface UseSortableOptions<T> {
  data: T[];
  initialField: keyof T;
  initialDir?: SortDirection;
}

export interface UseSortableResult<T> {
  sortField: keyof T;
  sortDir: SortDirection;
  sorted: T[];
  handleSort: (field: keyof T) => void;
}
