import type { PageFilter } from '@neuma/shared';

export interface PagesRowQuery {
  /** The filter on top of the view the server read the rows with; null when there is none. */
  readonly quickFilter: null | PageFilter;
  /** The words the server filtered the rows by; empty when the view is not being searched. */
  readonly search: string;
}
