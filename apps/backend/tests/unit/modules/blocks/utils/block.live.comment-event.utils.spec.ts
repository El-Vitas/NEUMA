import { describe, expect, it } from 'bun:test';
import { parseCommentEvent } from '@/modules/blocks/utils/block.live.message.utils';

describe('parseCommentEvent', () => {
  it('reads a notification for one person', () => {
    const result = parseCommentEvent(
      JSON.stringify({ kind: 'notification', notificationId: 'n-1', recipientId: 'u-1' }),
    );

    expect(result.getValue()).toEqual({ kind: 'notification', notificationId: 'n-1', recipientId: 'u-1' });
  });

  it('reads a change in a discussion', () => {
    const result = parseCommentEvent(
      JSON.stringify({ blockId: 'b-1', discussionId: 'd-1', kind: 'discussion', spaceId: 's-1' }),
    );

    expect(result.getValue()).toEqual({ blockId: 'b-1', discussionId: 'd-1', kind: 'discussion', spaceId: 's-1' });
  });

  it('refuses anything else', () => {
    expect(parseCommentEvent('no es json').isFail()).toBe(true);
    expect(parseCommentEvent(JSON.stringify({ kind: 'otra-cosa' })).isFail()).toBe(true);
    expect(parseCommentEvent(JSON.stringify({ kind: 'notification' })).isFail()).toBe(true);
  });
});
