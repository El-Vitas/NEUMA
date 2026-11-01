import type { DiscussionView } from '@neuma/shared';
import type { DiscussionDraft } from '../types/pages.discussions.types';

export const DISCUSSION_API_ROUTES = {
  block: (blockId: string) => `/api/v1/blocks/${blockId}/discussions`,
  comment: (commentId: string) => `/api/v1/comments/${commentId}`,
  discussion: (discussionId: string) => `/api/v1/discussions/${discussionId}`,
  page: (pageId: string, query: string) => `/api/v1/pages/${pageId}/discussions?${query}`,
  reopen: (discussionId: string) => `/api/v1/discussions/${discussionId}/reopen`,
  replies: (discussionId: string) => `/api/v1/discussions/${discussionId}/comments`,
  resolve: (discussionId: string) => `/api/v1/discussions/${discussionId}/resolve`,
} as const;

/** A page of discussions is read in tracts of this size, up to the most tracts below. */
export const DISCUSSIONS_READ_LIMIT = 100;

export const DISCUSSIONS_READ_TRACTS_MAX = 10;

export const DISCUSSION_MENTION_TRIGGER = '@';

export const DISCUSSION_WHITESPACE = /\s/;

export const EMPTY_DISCUSSION_DRAFT: DiscussionDraft = { mentions: [], text: '' };

export const EMPTY_DISCUSSIONS: readonly DiscussionView[] = [];

export const DISCUSSION_MENTION_RESULTS_MAX = 6;

/** The address of a page carries this when it should open on one discussion (a notification links to it). */
export const DISCUSSION_QUERY_PARAMETER = 'discussion';

export const DISCUSSION_COMPOSER_ROWS = 3;

export const DISCUSSION_REFRESH_DEBOUNCE_MS = 250;
