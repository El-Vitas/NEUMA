'use server';

import 'server-only';

import type { CommentView, DiscussionView } from '@neuma/shared';
import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import {
  DISCUSSION_API_ROUTES,
  DISCUSSIONS_READ_LIMIT,
  DISCUSSIONS_READ_TRACTS_MAX,
} from '../../constants/pages.discussions.constants';
import {
  commentEditSchema,
  commentRemovalSchema,
  commentViewSchema,
  discussionChangeSchema,
  discussionOpenSchema,
  discussionPageViewSchema,
  discussionReplySchema,
  discussionsReadSchema,
  discussionViewSchema,
  removedCommentSchema,
} from '../../schemas/pages.discussions.schemas';

/** Every discussion the person may read, resolved ones included, read in tracts until the server has no more. */
export const readPageDiscussionsAction = actionClient
  .inputSchema(discussionsReadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'readPageDiscussions' }, async (): Promise<readonly DiscussionView[]> => {
      const accessToken = await requireAccessTokenCookie();
      const discussions: DiscussionView[] = [];
      let cursor: string | null = null;
      for (let tract = 0; tract < DISCUSSIONS_READ_TRACTS_MAX; tract += 1) {
        const query = new URLSearchParams({ includeResolved: 'true', limit: String(DISCUSSIONS_READ_LIMIT) });
        if (cursor !== null) query.set('cursor', cursor);
        const response = discussionPageViewSchema.parse(
          await apiRequest<unknown>(DISCUSSION_API_ROUTES.page(parsedInput.pageId, query.toString()), accessToken),
        );
        discussions.push(...response.discussions);
        cursor = response.nextCursor;
        if (cursor === null) break;
      }
      return discussions;
    }),
  );

export const openDiscussionAction = actionClient.inputSchema(discussionOpenSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'openDiscussion' }, async (): Promise<DiscussionView> => {
    const created = await authenticatedRequest<unknown>(DISCUSSION_API_ROUTES.block(parsedInput.blockId), 'POST', {
      body: parsedInput.body,
      ...(parsedInput.quote === undefined ? {} : { quote: parsedInput.quote }),
    });
    return discussionViewSchema.parse(created);
  }),
);

export const replyToDiscussionAction = actionClient.inputSchema(discussionReplySchema).action(async ({ parsedInput }) =>
  withAction({ action: 'replyToDiscussion' }, async (): Promise<DiscussionView> => {
    const replied = await authenticatedRequest<unknown>(
      DISCUSSION_API_ROUTES.replies(parsedInput.discussionId),
      'POST',
      { body: parsedInput.body },
    );
    return discussionViewSchema.parse(replied);
  }),
);

export const resolveDiscussionAction = actionClient
  .inputSchema(discussionChangeSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'resolveDiscussion' }, async (): Promise<DiscussionView> => {
      const resolved = await authenticatedRequest<unknown>(
        DISCUSSION_API_ROUTES.resolve(parsedInput.discussionId),
        'POST',
        {},
      );
      return discussionViewSchema.parse(resolved);
    }),
  );

export const reopenDiscussionAction = actionClient.inputSchema(discussionChangeSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'reopenDiscussion' }, async (): Promise<DiscussionView> => {
    const reopened = await authenticatedRequest<unknown>(
      DISCUSSION_API_ROUTES.reopen(parsedInput.discussionId),
      'POST',
      {},
    );
    return discussionViewSchema.parse(reopened);
  }),
);

export const editCommentAction = actionClient.inputSchema(commentEditSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'editComment' }, async (): Promise<CommentView> => {
    const edited = await authenticatedRequest<unknown>(DISCUSSION_API_ROUTES.comment(parsedInput.commentId), 'PATCH', {
      body: parsedInput.body,
    });
    return commentViewSchema.parse(edited);
  }),
);

export const removeCommentAction = actionClient.inputSchema(commentRemovalSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'removeComment' }, async (): Promise<{ readonly discussionRemoved: boolean }> => {
    const removed = await authenticatedRequest<unknown>(
      DISCUSSION_API_ROUTES.comment(parsedInput.commentId),
      'DELETE',
      {},
    );
    return removedCommentSchema.parse(removed);
  }),
);
