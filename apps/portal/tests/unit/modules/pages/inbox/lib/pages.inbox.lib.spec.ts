import { describe, expect, it } from 'bun:test';
import type { NotificationView } from '@neuma/shared';
import {
  buildNotificationHref,
  formatUnreadBadge,
  markNotificationRead,
} from '@/modules/pages/inbox/lib/pages.inbox.lib';

const notification = (overrides: Partial<NotificationView> = {}): NotificationView => ({
  actorId: 'u-1',
  actorName: 'Ana',
  blockId: 'b-1',
  commentId: 'c-1',
  createdAt: '2026-10-20T10:00:00.000Z',
  discussionId: 'd-1',
  excerpt: 'Mira esto',
  id: 'n-1',
  kind: 'MENTION',
  pageId: 'p-1',
  pageTitle: 'Plan',
  readAt: null,
  spaceId: 's-1',
  ...overrides,
});

describe('formatUnreadBadge', () => {
  it('shows nothing when there is nothing unread', () => {
    expect(formatUnreadBadge(0)).toBeNull();
  });

  it('shows the count as it is up to 99 and a plus beyond it', () => {
    expect(formatUnreadBadge(3)).toBe('3');
    expect(formatUnreadBadge(99)).toBe('99');
    expect(formatUnreadBadge(100)).toBe('99+');
  });
});

describe('buildNotificationHref', () => {
  it('goes to the block of the page, and names the discussion so it opens', () => {
    expect(buildNotificationHref(notification())).toBe('/spaces/s-1/pages/p-1?discussion=d-1#b-1');
  });

  it('goes to the block alone when the notification is about words written in the page', () => {
    expect(buildNotificationHref(notification({ commentId: null, discussionId: null }))).toBe(
      '/spaces/s-1/pages/p-1#b-1',
    );
  });
});

describe('markNotificationRead', () => {
  it('marks only the one named, keeping its place', () => {
    const list = [notification({ id: 'n-1' }), notification({ id: 'n-2' })];

    const after = markNotificationRead(list, 'n-2', '2026-10-20T12:00:00.000Z');

    expect(after.map((entry) => entry.readAt)).toEqual([null, '2026-10-20T12:00:00.000Z']);
  });
});
