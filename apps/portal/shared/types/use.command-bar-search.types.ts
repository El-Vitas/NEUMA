import type { SearchInstantPageCandidate } from '@/modules/search/types/search.types';

export interface UseCommandBarSearchResult {
  readonly isLoading: boolean;
  readonly pages: readonly SearchInstantPageCandidate[];
}
