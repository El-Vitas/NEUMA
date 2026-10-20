import type { BlockRichText, DiscussionPageView, DiscussionView, Result, UserRole } from '@neuma/shared';
import type { McpRefusal } from './mcp.collections.types';

/** Who is asking: discussions answer as the person who owns the token, with what that person may read. */
export interface McpDiscussionViewer {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface McpRemovedComment {
  readonly discussionId: string;
  readonly discussionRemoved: boolean;
  readonly wasAnchored: boolean;
}

export interface McpDiscussionListRequest {
  readonly cursor?: string | undefined;
  readonly includeResolved: boolean;
  readonly limit?: number | undefined;
}

/** The discussions of the pages, which the tools reach through the same rules a person's comments follow. */
export interface McpDiscussions {
  readonly getDiscussion: (
    viewer: McpDiscussionViewer,
    discussionId: string,
  ) => Promise<Result<DiscussionView, McpRefusal>>;
  readonly listPageDiscussions: (
    viewer: McpDiscussionViewer,
    pageId: string,
    request: McpDiscussionListRequest,
  ) => Promise<Result<DiscussionPageView, McpRefusal>>;
  readonly openDiscussion: (
    viewer: McpDiscussionViewer,
    blockId: string,
    input: { readonly body: BlockRichText; readonly quote?: string | undefined },
  ) => Promise<Result<DiscussionView, McpRefusal>>;
  readonly removeComment: (
    viewer: McpDiscussionViewer,
    commentId: string,
  ) => Promise<Result<McpRemovedComment, McpRefusal>>;
  readonly reply: (
    viewer: McpDiscussionViewer,
    discussionId: string,
    body: BlockRichText,
  ) => Promise<Result<DiscussionView, McpRefusal>>;
}
