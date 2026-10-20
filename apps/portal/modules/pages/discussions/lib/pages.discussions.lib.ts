import type { CommentView, DiscussionView } from '@neuma/shared';
import type { DiscussionsSummary } from '../types/pages.discussions.types';

export const groupDiscussionsByBlock = (
  discussions: readonly DiscussionView[],
): ReadonlyMap<string, readonly DiscussionView[]> => {
  const grouped = new Map<string, DiscussionView[]>();
  for (const discussion of discussions) {
    grouped.set(discussion.blockId, [...(grouped.get(discussion.blockId) ?? []), discussion]);
  }
  return grouped;
};

const isOpen = (discussion: DiscussionView): boolean => discussion.resolvedAt === null;

export const summarizeDiscussions = (discussions: readonly DiscussionView[]): DiscussionsSummary => {
  const openCounts = new Map<string, number>();
  const openMarkIds = new Set<string>();
  for (const discussion of discussions.filter(isOpen)) {
    openCounts.set(discussion.blockId, (openCounts.get(discussion.blockId) ?? 0) + 1);
    if (discussion.anchorMarkId !== null) openMarkIds.add(discussion.anchorMarkId);
  }
  return { openCounts, openMarkIds };
};

export const upsertDiscussion = (
  discussions: readonly DiscussionView[],
  updated: DiscussionView,
): readonly DiscussionView[] =>
  discussions.some((discussion) => discussion.id === updated.id)
    ? discussions.map((discussion) => (discussion.id === updated.id ? updated : discussion))
    : [...discussions, updated];

export const replaceCommentIn = (
  discussions: readonly DiscussionView[],
  edited: CommentView,
): readonly DiscussionView[] =>
  discussions.map((discussion) =>
    discussion.id === edited.discussionId
      ? { ...discussion, comments: discussion.comments.map((comment) => (comment.id === edited.id ? edited : comment)) }
      : discussion,
  );

export const removeDiscussionFrom = (
  discussions: readonly DiscussionView[],
  discussionId: string,
): readonly DiscussionView[] => discussions.filter((discussion) => discussion.id !== discussionId);

/** Open ones first, in the order they were started, then the resolved ones. */
export const orderDiscussionsForReading = (discussions: readonly DiscussionView[]): readonly DiscussionView[] => [
  ...discussions.filter(isOpen),
  ...discussions.filter((discussion) => !isOpen(discussion)),
];
