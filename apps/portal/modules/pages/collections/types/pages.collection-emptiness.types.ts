import type { PageFilter } from '@neuma/shared';

export interface CollectionEmptinessInput {
  readonly hasViewFilter: boolean;
  /** Whether the rows the view drew are none. Always false for a view that was not read. */
  readonly isOutcomeEmpty: boolean;
  readonly isCalendar: boolean;
  readonly quickFilter: null | PageFilter;
  readonly search: string;
}

export interface CollectionEmptiness {
  /** The filter saved in the view lets nothing through. */
  readonly hidesEverything: boolean;
  /** The words searched match nothing. */
  readonly matchesNothing: boolean;
  /** The quick filter on top of the view matches nothing. */
  readonly quickFilterMatchesNothing: boolean;
}
