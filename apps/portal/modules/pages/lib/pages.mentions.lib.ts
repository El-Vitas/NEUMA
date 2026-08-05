import type { SearchResult } from '@/shared/types/search.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';

export const toPageMentionCandidate = (result: SearchResult): PageMentionCandidate => ({
  id: result.sourceId,
  label: result.title,
  spaceId: result.spaceId,
});
