import { type CommentView, type DiscussionView, extractPlainText } from '@neuma/shared';
import type { McpDiscussionOutput } from '../types/mcp.pages.types';

const describeComment = (comment: CommentView): McpDiscussionOutput['comments'][number] => ({
  author: comment.authorName,
  createdAt: comment.createdAt,
  id: comment.id,
  isDeleted: comment.isDeleted,
  text: extractPlainText(comment.body),
});

export const describeMcpDiscussion = (discussion: DiscussionView): McpDiscussionOutput => ({
  blockId: discussion.blockId,
  comments: discussion.comments.map(describeComment),
  id: discussion.id,
  isResolved: discussion.resolvedAt !== null,
  quote: discussion.quote,
});

/** A deleted comment keeps its place in the thread but says nothing, so it is left out of the reading. */
export const formatMcpDiscussionText = (discussion: McpDiscussionOutput): string => {
  const about = discussion.quote === null ? '' : ` about "${discussion.quote}"`;
  const state = discussion.isResolved ? ', resolved' : '';
  const lines = discussion.comments
    .filter((comment) => !comment.isDeleted)
    .map((comment) => `  - ${comment.author} (${comment.createdAt}, comment ${comment.id}): ${comment.text}`);
  return [`Discussion ${discussion.id} on block ${discussion.blockId}${about}${state}`, ...lines].join('\n');
};

export const formatMcpDiscussionsText = (
  discussions: readonly McpDiscussionOutput[],
  nextCursor: string | undefined,
): string => {
  if (discussions.length === 0) return 'No discussions that this token can read on this page.';
  const more = nextCursor === undefined ? '' : `\nThere are more: call again with cursor ${nextCursor}.`;
  return `${discussions.map(formatMcpDiscussionText).join('\n')}${more}`;
};
