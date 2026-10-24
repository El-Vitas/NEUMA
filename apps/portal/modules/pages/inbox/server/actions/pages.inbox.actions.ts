'use server';

import 'server-only';

import type { NotificationPageView } from '@neuma/shared';
import { z } from 'zod';
import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { INBOX_API_ROUTES, INBOX_PAGE_SIZE } from '../../constants/pages.inbox.constants';
import {
  inboxListSchema,
  inboxMarkReadSchema,
  notificationPageViewSchema,
  unreadCountSchema,
} from '../../schemas/pages.inbox.schemas';

export const listNotificationsAction = actionClient.inputSchema(inboxListSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'listNotifications' }, async (): Promise<NotificationPageView> => {
    const query = new URLSearchParams({ limit: String(INBOX_PAGE_SIZE) });
    if (parsedInput.cursor !== undefined) query.set('cursor', parsedInput.cursor);
    const response = await apiRequest<unknown>(
      INBOX_API_ROUTES.list(query.toString()),
      await requireAccessTokenCookie(),
    );
    return notificationPageViewSchema.parse(response);
  }),
);

export const countUnreadNotificationsAction = actionClient.inputSchema(z.object({})).action(async () =>
  withAction({ action: 'countUnreadNotifications' }, async (): Promise<number> => {
    const response = await apiRequest<unknown>(INBOX_API_ROUTES.unreadCount, await requireAccessTokenCookie());
    return unreadCountSchema.parse(response).count;
  }),
);

export const markNotificationReadAction = actionClient
  .inputSchema(inboxMarkReadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'markNotificationRead' }, async (): Promise<void> => {
      await authenticatedRequest(INBOX_API_ROUTES.markRead(parsedInput.notificationId), 'POST', {});
    }),
  );

export const markEveryNotificationReadAction = actionClient.inputSchema(z.object({})).action(async () =>
  withAction({ action: 'readAllNotifications' }, async (): Promise<void> => {
    await authenticatedRequest(INBOX_API_ROUTES.markAllRead, 'POST', {});
  }),
);
