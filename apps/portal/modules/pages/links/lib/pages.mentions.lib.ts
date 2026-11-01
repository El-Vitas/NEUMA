import { PAGE_LIFECYCLE } from '@neuma/shared';
import type { SearchResult } from '@/shared/types/search.types';
import type { PageReference } from '../../types/pages.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';
import { foldPageLookingText } from './pages.looking.lib';

export const toPageMentionCandidate = (result: SearchResult): PageMentionCandidate => ({
  id: result.sourceId,
  label: result.title,
  spaceId: result.spaceId,
});

const asItIsLookedFor = (written: string): string => foldPageLookingText(written.trim());

/** Matches by title only: search also returns fuzzy matches, which would be offered as the page being named. */
export const answersToTheName = (title: string, written: string): boolean => {
  const looked = asItIsLookedFor(written);
  return looked.length === 0 || asItIsLookedFor(title).includes(looked);
};

export const keepThePagesNamed = (
  candidates: readonly PageMentionCandidate[],
  written: string,
  howMany: number,
): readonly PageMentionCandidate[] =>
  candidates.filter((candidate) => answersToTheName(candidate.label, written)).slice(0, howMany);

const toPageAtHandCandidate = (page: PageReference): PageMentionCandidate => ({
  id: page.id,
  label: page.title,
  spaceId: page.spaceId,
});

const isStillAPage = (page: PageReference): boolean => page.lifecycle === PAGE_LIFECYCLE.ACTIVE;

const withoutRepeats = (candidates: readonly PageMentionCandidate[]): readonly PageMentionCandidate[] =>
  candidates.filter((candidate, at) => candidates.findIndex((other) => other.id === candidate.id) === at);

/** Loaded pages first, then search results; both filtered by the same title rule. */
export const gatherThePagesNamed = (
  pagesAtHand: readonly PageReference[],
  found: readonly PageMentionCandidate[],
  written: string,
  howMany: number,
): readonly PageMentionCandidate[] => {
  const offered = [...pagesAtHand.filter(isStillAPage).map(toPageAtHandCandidate), ...found];
  return withoutRepeats(offered.filter((candidate) => answersToTheName(candidate.label, written))).slice(0, howMany);
};
