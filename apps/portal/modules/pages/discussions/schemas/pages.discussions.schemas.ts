import { blockRichTextSchema } from '@neuma/shared';
import { z } from 'zod';

const recordIdSchema = z.uuid();

export const commentViewSchema = z.object({
  authorId: z.string(),
  authorName: z.string(),
  body: blockRichTextSchema,
  canDelete: z.boolean(),
  canEdit: z.boolean(),
  createdAt: z.string(),
  discussionId: z.string(),
  editedAt: z.string().nullable(),
  id: z.string(),
  isDeleted: z.boolean(),
});

export const discussionViewSchema = z.object({
  anchorMarkId: z.string().nullable(),
  blockId: z.string(),
  canComment: z.boolean(),
  comments: z.array(commentViewSchema),
  createdAt: z.string(),
  createdById: z.string(),
  id: z.string(),
  pageId: z.string(),
  quote: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedById: z.string().nullable(),
});

export const discussionPageViewSchema = z.object({
  discussions: z.array(discussionViewSchema),
  nextCursor: z.string().nullable(),
});

export const removedCommentSchema = z.object({ discussionRemoved: z.boolean() });

export const discussionsReadSchema = z.object({ pageId: recordIdSchema });

export const discussionOpenSchema = z.object({
  blockId: recordIdSchema,
  body: blockRichTextSchema,
  quote: z.string().max(5000).optional(),
});

export const discussionReplySchema = z.object({ body: blockRichTextSchema, discussionId: recordIdSchema });

export const discussionChangeSchema = z.object({ discussionId: recordIdSchema });

export const commentEditSchema = z.object({ body: blockRichTextSchema, commentId: recordIdSchema });

export const commentRemovalSchema = z.object({ commentId: recordIdSchema });
