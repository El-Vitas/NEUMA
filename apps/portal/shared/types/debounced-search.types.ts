export interface DebouncedSearchResult<T> {
  readonly candidates: readonly T[];
  readonly isLoading: boolean;
}
