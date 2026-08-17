import type { SearchResult } from '@/shared/types/search.types';
import type { SearchInstantPageCandidate } from '../types/search.types';

export const toSearchInstantPageCandidate = (result: SearchResult): SearchInstantPageCandidate => ({
  id: result.sourceId,
  spaceId: result.spaceId,
  title: result.title,
});
