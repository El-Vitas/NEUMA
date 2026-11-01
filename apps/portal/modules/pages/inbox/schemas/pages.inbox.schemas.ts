import { NOTIFICATION_KIND_VALUES } from '@neuma/shared';
import { z } from 'zod';

export const notificationViewSchema = z.object({
  actorId: z.string(),
  actorName: z.string(),
  blockId: z.string(),
  commentId: z.string().nullable(),
  createdAt: z.string(),
  discussionId: z.string().nullable(),
  excerpt: z.string(),
  id: z.string(),
  kind: z.enum(NOTIFICATION_KIND_VALUES),
  pageId: z.string(),
  pageTitle: z.string(),
  readAt: z.string().nullable(),
  spaceId: z.string(),
});

export const notificationPageViewSchema = z.object({
  nextCursor: z.string().nullable(),
  notifications: z.array(notificationViewSchema),
  unreadCount: z.number().int().min(0),
});

export const unreadCountSchema = z.object({ count: z.number().int().min(0) });

export const inboxListSchema = z.object({ cursor: z.string().max(500).optional() });

export const inboxMarkReadSchema = z.object({ notificationId: z.uuid() });

export const inboxFeedMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ notificationId: z.string(), type: z.literal('notification') }),
]);
