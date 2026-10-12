export interface PagesRowSearch {
  readonly matchCount: number;
  readonly matches: (searchText: string) => boolean;
  readonly query: string;
  readonly searching: boolean;
  readonly setQuery: (query: string) => void;
  readonly total: number;
}
