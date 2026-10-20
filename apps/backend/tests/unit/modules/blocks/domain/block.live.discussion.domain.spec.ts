import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE, type BlockPermissions, USER_ROLE } from '@neuma/shared';
import { indexById, resolveRoles } from '@/common/domain/block-access.domain';
import {
  planCommentNotificationDeliveries,
  planDiscussionDeliveries,
} from '@/modules/blocks/domain/block.live.discussion.domain';
import type {
  BlockChainRow,
  LiveAccessContext,
  LiveSubscription,
} from '@/modules/blocks/domain/block.live.domain.types';

const SPACE_ID = 'space-1';
const MAX_DEPTH = 8;
const ALICE = 'user-alice';
const BOB = 'user-bob';

const buildRow = (overrides: Partial<BlockChainRow> & Pick<BlockChainRow, 'id'>): BlockChainRow => ({
  alive: true,
  parentId: null,
  permissions: null,
  spaceId: SPACE_ID,
  type: 'paragraph',
  ...overrides,
});

const onlyFor = (userId: string): BlockPermissions => [
  { principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId }, role: BLOCK_ROLE.full },
];

const buildContext = (rows: readonly BlockChainRow[], userIds: readonly string[]): LiveAccessContext => {
  const rowsById = indexById(rows);
  const readableSpaceIds = new Set([SPACE_ID]);
  return {
    maxDepth: MAX_DEPTH,
    rolesByUserId: new Map(
      userIds.map((userId) => [
        userId,
        resolveRoles({ readableSpaceIds, viewer: { userId, workspaceRole: USER_ROLE.WORKER } }, rowsById),
      ]),
    ),
    rowsById,
  };
};

const subscribe = (connectionId: string, userId: string, pageId: string): LiveSubscription => ({
  connectionId,
  pageId,
  spaceId: SPACE_ID,
  userId,
});

describe('planDiscussionDeliveries', () => {
  const rows = [
    buildRow({ id: 'page-a', type: 'page' }),
    buildRow({ id: 'open-block', parentId: 'page-a' }),
    buildRow({ id: 'secret-block', parentId: 'page-a', permissions: onlyFor(ALICE) }),
    buildRow({ id: 'page-b', type: 'page' }),
  ];

  it('tells each subscriber of the page that holds the block, and nobody subscribed to another page', () => {
    const deliveries = planDiscussionDeliveries({
      blockId: 'open-block',
      context: buildContext(rows, [ALICE, BOB]),
      discussionId: 'discussion-1',
      subscriptions: [subscribe('c1', ALICE, 'page-a'), subscribe('c2', BOB, 'page-a'), subscribe('c3', BOB, 'page-b')],
    });

    expect(deliveries).toEqual([
      {
        connectionId: 'c1',
        message: { blockId: 'open-block', discussionId: 'discussion-1', pageId: 'page-a', type: 'discussion' },
      },
      {
        connectionId: 'c2',
        message: { blockId: 'open-block', discussionId: 'discussion-1', pageId: 'page-a', type: 'discussion' },
      },
    ]);
  });

  it('says nothing to a subscriber who cannot read the block, not even that something happened', () => {
    const deliveries = planDiscussionDeliveries({
      blockId: 'secret-block',
      context: buildContext(rows, [ALICE, BOB]),
      discussionId: 'discussion-2',
      subscriptions: [subscribe('c1', ALICE, 'page-a'), subscribe('c2', BOB, 'page-a')],
    });

    expect(deliveries.map((delivery) => delivery.connectionId)).toEqual(['c1']);
  });

  it('says nothing to a subscriber whose access could not be resolved', () => {
    const deliveries = planDiscussionDeliveries({
      blockId: 'open-block',
      context: buildContext(rows, [ALICE]),
      discussionId: 'discussion-3',
      subscriptions: [subscribe('c2', BOB, 'page-a')],
    });

    expect(deliveries).toEqual([]);
  });
});

describe('planCommentNotificationDeliveries', () => {
  it('reaches every open connection of the recipient and no other', () => {
    const deliveries = planCommentNotificationDeliveries({
      connections: [
        { connectionId: 'c1', userId: ALICE },
        { connectionId: 'c2', userId: BOB },
        { connectionId: 'c3', userId: ALICE },
      ],
      notificationId: 'notification-1',
      recipientId: ALICE,
    });

    expect(deliveries).toEqual([
      { connectionId: 'c1', message: { notificationId: 'notification-1', type: 'notification' } },
      { connectionId: 'c3', message: { notificationId: 'notification-1', type: 'notification' } },
    ]);
  });
});
