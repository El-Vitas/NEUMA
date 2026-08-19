import type { SearchResult } from '@/shared/types/search.types';
import type { SearchResultParentDisplay, SearchResultSpaceDisplay } from '../types/search.types';

export const resolveSearchResultSpaceDisplay = (result: SearchResult): SearchResultSpaceDisplay => {
  const spaceName = result.spaceName ?? null;
  return spaceName === null ? { kind: 'unknown' } : { kind: 'known', spaceName };
};

export const resolveSearchResultParentDisplay = (result: SearchResult): SearchResultParentDisplay => {
  const spaceName = result.spaceName ?? null;
  if (spaceName === null) return { kind: 'unknown' };
  const parentPageId = result.parentPageId ?? null;
  if (parentPageId === null) return { kind: 'atSpaceRoot' };
  const parentPageTitle = result.parentPageTitle ?? null;
  if (parentPageTitle === null) return { kind: 'unknown' };
  return { kind: 'underParentPage', parentPageTitle };
};
