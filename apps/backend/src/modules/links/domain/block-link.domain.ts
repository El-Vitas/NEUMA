import type { BacklinkCandidate, BacklinkCandidateSplit, StoredLinkEnds } from './block-link.domain.types';

const collectUnique = (ids: readonly string[]): readonly string[] => [...new Set(ids)];

/** Every block id a read must check: the candidate blocks and the pages they live in. */
export const listCandidateIds = (candidates: readonly BacklinkCandidate[]): readonly string[] =>
  collectUnique(candidates.flatMap((candidate) => [candidate.sourceBlockId, candidate.sourcePageId]));

/**
 * A readable page whose candidate block is readable is confirmed. A readable page whose candidate block is hidden
 * is pending: another of its linking blocks may still be readable.
 */
export const splitBacklinkCandidates = (
  candidates: readonly BacklinkCandidate[],
  readableIds: ReadonlySet<string>,
): BacklinkCandidateSplit => {
  const readablePages = candidates.filter((candidate) => readableIds.has(candidate.sourcePageId));
  return {
    confirmedPageIds: new Set(
      readablePages.filter((candidate) => readableIds.has(candidate.sourceBlockId)).map((c) => c.sourcePageId),
    ),
    pendingPageIds: readablePages
      .filter((candidate) => !readableIds.has(candidate.sourceBlockId))
      .map((candidate) => candidate.sourcePageId),
  };
};

/** The pages holding at least one readable link among the extra links of pending pages. */
export const listRescuedPageIds = (
  links: readonly StoredLinkEnds[],
  readableIds: ReadonlySet<string>,
): readonly string[] =>
  collectUnique(links.filter((link) => readableIds.has(link.sourceBlockId)).map((link) => link.sourcePageId));

/** The candidates' pages, in their order, that are allowed. */
export const keepAllowedPageIds = (
  candidates: readonly BacklinkCandidate[],
  allowedPageIds: ReadonlySet<string>,
): readonly string[] =>
  candidates.map((candidate) => candidate.sourcePageId).filter((pageId) => allowedPageIds.has(pageId));

/** The targets of the links held by readable blocks, in the order they were written. */
export const listLinkedTargetIds = (
  links: readonly StoredLinkEnds[],
  sourcePageId: string,
  readableIds: ReadonlySet<string>,
): readonly string[] =>
  collectUnique(
    links
      .filter((link) => link.targetBlockId !== sourcePageId && readableIds.has(link.sourceBlockId))
      .map((link) => link.targetBlockId),
  );
