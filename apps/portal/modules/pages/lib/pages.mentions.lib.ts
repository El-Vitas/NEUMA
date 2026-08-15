import { PAGE_LIFECYCLE } from '@company-brain/shared';
import type { SearchResult } from '@/shared/types/search.types';
import type { PageMentionCandidate } from '../types/pages.mentions.types';
import type { PageSummary } from '../types/pages.types';

export const toPageMentionCandidate = (result: SearchResult): PageMentionCandidate => ({
  id: result.sourceId,
  label: result.title,
  spaceId: result.spaceId,
});

/** Read as somebody types a name: capitals and accents are not part of the asking. */
const asItIsLookedFor = (written: string): string =>
  written
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * Whether a page is called what was written.
 *
 * Looking for a page to name is not the same as searching: search may answer
 * with what merely resembles the question — writing `@Inexistente` brought back
 * a page called «QA plegado persistente» — and here that answer is offered as
 * the page one meant to name. What is being asked is the name, so the name has
 * to carry it.
 */
export const answersToTheName = (title: string, written: string): boolean => {
  const looked = asItIsLookedFor(written);
  return looked.length === 0 || asItIsLookedFor(title).includes(looked);
};

/** The pages that answer to the name, at most as many as were asked for. */
export const keepThePagesNamed = (
  candidates: readonly PageMentionCandidate[],
  written: string,
  howMany: number,
): readonly PageMentionCandidate[] =>
  candidates.filter((candidate) => answersToTheName(candidate.label, written)).slice(0, howMany);

/** A page the reader already has in hand, offered by the name it is called now. */
const toPageAtHandCandidate = (page: PageSummary): PageMentionCandidate => ({
  id: page.id,
  label: page.title,
  spaceId: page.spaceId,
});

/** A page thrown away is not a page anybody means to name. */
const isStillAPage = (page: PageSummary): boolean => page.lifecycle === PAGE_LIFECYCLE.ACTIVE;

const withoutRepeats = (candidates: readonly PageMentionCandidate[]): readonly PageMentionCandidate[] =>
  candidates.filter((candidate, at) => candidates.findIndex((other) => other.id === candidate.id) === at);

/**
 * The pages offered while somebody names one: those already in hand first, then
 * whatever the search brought back.
 *
 * The pages of this space are already here, so they answer the first letter
 * without asking anybody; the search reaches further — other spaces, pages
 * written a moment ago — but it answers what resembles the question too, and it
 * cannot be asked for titles alone. Both are read by the same rule: a page is
 * offered when it is called what was written.
 */
export const gatherThePagesNamed = (
  pagesAtHand: readonly PageSummary[],
  found: readonly PageMentionCandidate[],
  written: string,
  howMany: number,
): readonly PageMentionCandidate[] => {
  const offered = [...pagesAtHand.filter(isStillAPage).map(toPageAtHandCandidate), ...found];
  return withoutRepeats(offered.filter((candidate) => answersToTheName(candidate.label, written))).slice(0, howMany);
};
