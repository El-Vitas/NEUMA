import type { BlockRichText } from '@neuma/shared';
import type { BlockAccessViewer } from '../../../common/types/block-access.types';
import type { KeysetPosition } from '../../../common/types/keyset-cursor.types';
import type { PlannedCommentNotification } from '../domain/comment.domain.types';

export interface OpenDiscussionInput {
  readonly body: unknown;
  readonly quote?: string | undefined;
}

export interface RemovedComment {
  readonly discussionId: string;
  readonly discussionRemoved: boolean;
  /** Whether the discussion quoted words, so the caller can take the mark off them. */
  readonly wasAnchored: boolean;
}

export interface PageDiscussionsRequest {
  readonly cursor?: string | undefined;
  readonly includeResolved: boolean;
  readonly limit?: number | undefined;
}

/** A discussion row as the database returns it, before it is read into a record. */
export interface DiscussionRow {
  readonly anchorMarkId: string | null;
  readonly blockId: string;
  readonly createdAt: Date;
  readonly createdById: string;
  readonly id: string;
  readonly quote: string | null;
  readonly resolvedAt: Date | null;
  readonly resolvedById: string | null;
  readonly spaceId: string;
}

export interface CommentRow {
  readonly authorId: string;
  readonly body: unknown;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly discussionId: string;
  readonly editedAt: Date | null;
  readonly id: string;
}

export interface DiscussionRecord {
  readonly anchorMarkId: string | null;
  readonly blockId: string;
  readonly createdAt: Date;
  readonly createdById: string;
  readonly id: string;
  readonly quote: string | null;
  readonly resolvedAt: Date | null;
  readonly resolvedById: string | null;
  readonly spaceId: string;
}

export interface CommentRecord {
  readonly authorId: string;
  readonly body: BlockRichText;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly discussionId: string;
  readonly editedAt: Date | null;
  readonly id: string;
}

export interface DiscussionWithComments {
  readonly comments: readonly CommentRecord[];
  readonly discussion: DiscussionRecord;
}

export interface NewDiscussion {
  readonly authorId: string;
  readonly blockId: string;
  readonly body: BlockRichText;
  readonly notifications: readonly PlannedCommentNotification[];
  readonly quote: string | null;
  readonly spaceId: string;
}

export interface NewReply {
  readonly authorId: string;
  readonly body: BlockRichText;
  readonly discussion: DiscussionRecord;
  readonly notifications: readonly PlannedCommentNotification[];
}

export interface CommentEdit {
  readonly body: BlockRichText;
  readonly comment: CommentRecord;
  readonly discussion: DiscussionRecord;
  readonly notifications: readonly PlannedCommentNotification[];
}

export interface PageDiscussionsQuery {
  readonly after: KeysetPosition | null;
  readonly includeResolved: boolean;
  readonly limit: number;
  readonly pageId: string;
  readonly viewer: BlockAccessViewer;
}

export interface DiscussionsBatch {
  readonly discussions: readonly DiscussionWithComments[];
  readonly hasMore: boolean;
}

export interface StoredComment {
  readonly comment: CommentRecord;
  readonly discussion: DiscussionRecord;
}

export type DeletionOutcome = 'comment-removed' | 'discussion-removed';

export interface CommentRepositoryContract {
  readonly addReply: (reply: NewReply) => Promise<CommentRecord>;
  readonly deleteComment: (stored: StoredComment) => Promise<DeletionOutcome>;
  readonly editComment: (edit: CommentEdit) => Promise<CommentRecord>;
  readonly findComment: (commentId: string) => Promise<StoredComment | null>;
  readonly findDiscussion: (discussionId: string) => Promise<DiscussionWithComments | null>;
  readonly listPageDiscussions: (query: PageDiscussionsQuery) => Promise<DiscussionsBatch>;
  readonly listParticipantIds: (discussionId: string) => Promise<readonly string[]>;
  readonly openDiscussion: (draft: NewDiscussion) => Promise<DiscussionWithComments>;
  readonly readUserNames: (userIds: readonly string[]) => Promise<ReadonlyMap<string, string>>;
  readonly setResolved: (discussion: DiscussionRecord, resolvedById: string | null) => Promise<DiscussionWithComments>;
}
