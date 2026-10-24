import type { CollectionEmptiness, CollectionEmptinessInput } from '../types/pages.collection-emptiness.types';

/** Says which of the three things that narrow a view left it empty, so the message names the one to undo. */
export const readCollectionEmptiness = (input: CollectionEmptinessInput): CollectionEmptiness => {
  const isSearching = input.search !== '';
  const isQuickFiltering = input.quickFilter !== null;
  const isEmptyByRows = input.isOutcomeEmpty && !input.isCalendar;
  return {
    hidesEverything: input.isOutcomeEmpty && input.hasViewFilter && !isSearching && !isQuickFiltering,
    matchesNothing: isEmptyByRows && isSearching,
    quickFilterMatchesNothing: isEmptyByRows && !isSearching && isQuickFiltering,
  };
};
