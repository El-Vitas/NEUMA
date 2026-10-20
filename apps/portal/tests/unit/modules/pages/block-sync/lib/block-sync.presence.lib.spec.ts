import { describe, expect, it } from 'bun:test';
import { TextSelection } from 'prosemirror-state';
import { BLOCK_SYNC_PRESENCE_COLORS } from '@/modules/pages/block-sync/constants/block-sync.constants';
import {
  mapPresenceToParticipants,
  readBlockIdAtSelection,
} from '@/modules/pages/block-sync/lib/block-sync.presence.lib';
import { contentToEditorDocument } from '@/modules/pages/block-sync/lib/block-sync.remote.lib';
import { bulletList, documentOf, listItem, paragraph, text } from '../block-sync.fixtures';

const resolveIdentity = (userId: string) => ({ color: null, name: `Name of ${userId}` });

describe('mapPresenceToParticipants', () => {
  it('shows the other people with their name and the block they are in', () => {
    const participants = mapPresenceToParticipants(
      [{ blockId: 'b1', expiresAt: 10, userId: 'user-2' }],
      'user-1',
      resolveIdentity,
    );

    expect(participants).toHaveLength(1);
    expect(participants[0]).toMatchObject({ cursor: { blockId: 'b1' }, name: 'Name of user-2' });
  });

  it('leaves out the person who is looking', () => {
    const participants = mapPresenceToParticipants(
      [
        { blockId: 'b1', expiresAt: 10, userId: 'user-1' },
        { blockId: null, expiresAt: 10, userId: 'user-2' },
      ],
      'user-1',
      resolveIdentity,
    );

    expect(participants.map((participant) => participant.name)).toEqual(['Name of user-2']);
    expect(participants[0]?.cursor).toEqual({ blockId: null });
  });

  it('gives the same person the same client id and color every time, from a palette', () => {
    const users = [{ blockId: null, expiresAt: 10, userId: 'user-2' }];

    const first = mapPresenceToParticipants(users, 'user-1', resolveIdentity)[0];
    const second = mapPresenceToParticipants(users, 'user-1', resolveIdentity)[0];

    expect(first?.clientId).toBe(second?.clientId ?? -1);
    expect(first?.color).toBe(second?.color ?? '');
    expect(BLOCK_SYNC_PRESENCE_COLORS).toContain(first?.color ?? '');
  });

  it('keeps the color a person chose', () => {
    const participants = mapPresenceToParticipants(
      [{ blockId: null, expiresAt: 10, userId: 'user-2' }],
      'user-1',
      () => ({ color: '#112233', name: 'Ana' }),
    );

    expect(participants[0]?.color).toBe('#112233');
  });

  it('lists one participant per person even when they have two tabs open', () => {
    const participants = mapPresenceToParticipants(
      [
        { blockId: 'b1', expiresAt: 10, userId: 'user-2' },
        { blockId: 'b2', expiresAt: 20, userId: 'user-2' },
      ],
      'user-1',
      resolveIdentity,
    );

    expect(participants).toHaveLength(1);
  });
});

describe('readBlockIdAtSelection', () => {
  const document = contentToEditorDocument(
    documentOf(paragraph('p1', text('Hello')), bulletList(listItem('l1', paragraph('lp1', text('Item'))))),
  );
  const knownIds = new Set(['p1', 'l1']);

  it('names the block the cursor is in', () => {
    const selection = TextSelection.create(document, 2);

    expect(readBlockIdAtSelection(selection, knownIds)).toBe('p1');
  });

  it('names the nearest ancestor that is a block when the paragraph itself is not one', () => {
    let itemPosition = 0;
    document.descendants((node, position) => {
      if (node.type.name === 'list_item') itemPosition = position;
      return true;
    });
    const selection = TextSelection.create(document, itemPosition + 3);

    expect(readBlockIdAtSelection(selection, knownIds)).toBe('l1');
  });

  it('names no block when the cursor is in none that is known', () => {
    const selection = TextSelection.create(document, 2);

    expect(readBlockIdAtSelection(selection, new Set())).toBeNull();
  });
});
