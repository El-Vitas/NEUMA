import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE, type BlockPermissions, USER_ROLE } from '@neuma/shared';
import { indexById, resolveRoles } from '@/common/domain/block-access.domain';
import type {
  BlockChainRow,
  LiveAccessContext,
  LiveSubscription,
} from '@/modules/blocks/domain/block.live.domain.types';
import {
  listSubscriptionsInOtherSpace,
  planPresenceDeliveries,
  planResync,
  planVersionDeliveries,
} from '@/modules/blocks/domain/block.live.routing.domain';

const SPACE_ID = 'space-1';
const MAX_DEPTH = 8;
const ALICE = 'user-alice';
const BOB = 'user-bob';
const EXPIRES_AT = 1000;

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
    readableSpaceIdsByUserId: new Map(userIds.map((userId) => [userId, readableSpaceIds])),
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

const PAGE_ROWS: readonly BlockChainRow[] = [
  buildRow({ id: 'page-a', type: 'page' }),
  buildRow({ id: 'a-1', parentId: 'page-a' }),
  buildRow({ id: 'a-2', parentId: 'page-a' }),
  buildRow({ id: 'page-b', type: 'page' }),
  buildRow({ id: 'b-1', parentId: 'page-b' }),
];

describe('planVersionDeliveries', () => {
  it('sends the versions of the blocks inside a subscribed page and nothing from other pages', () => {
    const context = buildContext(PAGE_ROWS, [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [
        { id: 'a-1', version: 3 },
        { id: 'b-1', version: 9 },
      ],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([
      {
        connectionId: 'connection-1',
        message: { blocks: [{ id: 'a-1', version: 3 }], pageId: 'page-a', type: 'versions' },
      },
    ]);
  });

  it('sends the page itself as part of its own page', () => {
    const context = buildContext(PAGE_ROWS, [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'page-a', version: 2 }],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a')],
    });

    expect(deliveries[0]?.message).toEqual({
      blocks: [{ id: 'page-a', version: 2 }],
      pageId: 'page-a',
      type: 'versions',
    });
  });

  it('keeps the blocks of a child page for the subscribers of that child page', () => {
    const rows = [...PAGE_ROWS, buildRow({ id: 'child-page', parentId: 'page-a', type: 'page' })];
    const nested = buildRow({ id: 'child-1', parentId: 'child-page' });
    const context = buildContext([...rows, nested], [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'child-1', version: 5 }],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a'), subscribe('connection-2', ALICE, 'child-page')],
    });

    expect(deliveries.map((delivery) => delivery.connectionId)).toEqual(['connection-2']);
  });

  it('never sends an id the subscriber cannot read, sends the rest and asks for a resync', () => {
    const rows = [
      buildRow({ id: 'page-a', type: 'page' }),
      buildRow({ id: 'a-1', parentId: 'page-a' }),
      buildRow({ id: 'secret', parentId: 'page-a', permissions: onlyFor(BOB) }),
    ];
    const context = buildContext(rows, [ALICE, BOB]);

    const deliveries = planVersionDeliveries({
      blocks: [
        { id: 'a-1', version: 2 },
        { id: 'secret', version: 4 },
      ],
      context,
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a'), subscribe('connection-bob', BOB, 'page-a')],
    });

    expect(deliveries).toEqual([
      {
        connectionId: 'connection-alice',
        message: { blocks: [{ id: 'a-1', version: 2 }], pageId: 'page-a', type: 'versions' },
      },
      { connectionId: 'connection-alice', message: { pageId: 'page-a', type: 'resync' } },
      {
        connectionId: 'connection-bob',
        message: {
          blocks: [
            { id: 'a-1', version: 2 },
            { id: 'secret', version: 4 },
          ],
          pageId: 'page-a',
          type: 'versions',
        },
      },
    ]);
  });

  it('sends only a resync, without the id, to a subscriber who can read none of the touched blocks', () => {
    const rows = [
      buildRow({ id: 'page-a', type: 'page' }),
      buildRow({ id: 'secret', parentId: 'page-a', permissions: onlyFor(BOB) }),
    ];
    const context = buildContext(rows, [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'secret', version: 4 }],
      context,
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([{ connectionId: 'connection-alice', message: { pageId: 'page-a', type: 'resync' } }]);
  });

  it('asks for a resync, without the id, when a block is cut off under an unreadable ancestor', () => {
    const rows = [
      buildRow({ id: 'page-a', type: 'page' }),
      buildRow({ id: 'secret', parentId: 'page-a', permissions: onlyFor(BOB) }),
      buildRow({ id: 'inside-secret', parentId: 'secret', permissions: onlyFor(ALICE) }),
    ];
    const context = buildContext(rows, [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'inside-secret', version: 2 }],
      context,
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([{ connectionId: 'connection-alice', message: { pageId: 'page-a', type: 'resync' } }]);
  });

  it('tells a subscriber that what they may do changed when access changed on the page or above it', () => {
    const rows = [
      buildRow({ id: 'space-root', type: 'page' }),
      buildRow({ id: 'page-a', parentId: 'space-root', type: 'page' }),
      buildRow({ id: 'page-b', type: 'page' }),
    ];
    const context = buildContext(rows, [ALICE]);
    const plan = (changedId: string, pageId: string) =>
      planVersionDeliveries({
        blocks: [{ hasAccessChange: true, id: changedId, version: 3 }],
        context,
        subscriptions: [subscribe('connection-alice', ALICE, pageId)],
      }).map((delivery) => delivery.message.type);

    expect(plan('page-a', 'page-a')).toContain('access-changed');
    expect(plan('space-root', 'page-a')).toContain('access-changed');
    expect(plan('page-b', 'page-a')).not.toContain('access-changed');
  });

  it('tells a subscriber who lost the page that it was revoked, and sends no versions with it', () => {
    const rows = [
      buildRow({ id: 'page-a', permissions: onlyFor(BOB), type: 'page' }),
      buildRow({ id: 'a-1', parentId: 'page-a' }),
    ];
    const context = buildContext(rows, [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'a-1', version: 2 }],
      context,
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([{ connectionId: 'connection-alice', message: { pageId: 'page-a', type: 'revoked' } }]);
  });

  it('revokes a subscriber whose page was removed or never existed', () => {
    const context = buildContext([buildRow({ alive: false, id: 'page-a', type: 'page' })], [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a'), subscribe('connection-2', ALICE, 'page-missing')],
    });

    expect(deliveries.map((delivery) => delivery.message.type)).toEqual(['revoked', 'revoked']);
  });

  it('asks for a resync when the access of the subscriber could not be resolved', () => {
    const context = buildContext(PAGE_ROWS, []);

    const deliveries = planVersionDeliveries({
      blocks: [{ id: 'a-1', version: 3 }],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([{ connectionId: 'connection-1', message: { pageId: 'page-a', type: 'resync' } }]);
  });

  it('ignores touched blocks that live in no page', () => {
    const context = buildContext([...PAGE_ROWS, buildRow({ id: 'orphan' })], [ALICE]);

    const deliveries = planVersionDeliveries({
      blocks: [
        { id: 'orphan', version: 1 },
        { id: 'unknown', version: 1 },
      ],
      context,
      subscriptions: [subscribe('connection-1', ALICE, 'page-a')],
    });

    expect(deliveries).toEqual([]);
  });
});

describe('planResync', () => {
  it('asks every subscription to resync, one message per page of each connection', () => {
    const deliveries = planResync([
      subscribe('connection-1', ALICE, 'page-a'),
      subscribe('connection-1', ALICE, 'page-b'),
      subscribe('connection-2', BOB, 'page-a'),
    ]);

    expect(deliveries).toEqual([
      { connectionId: 'connection-1', message: { pageId: 'page-a', type: 'resync' } },
      { connectionId: 'connection-1', message: { pageId: 'page-b', type: 'resync' } },
      { connectionId: 'connection-2', message: { pageId: 'page-a', type: 'resync' } },
    ]);
  });

  it('plans nothing when nobody is subscribed', () => {
    expect(planResync([])).toEqual([]);
  });
});

describe('planPresenceDeliveries', () => {
  const entries = [
    { blockId: 'a-1', connectionId: 'connection-alice', expiresAt: EXPIRES_AT, userId: ALICE },
    { blockId: 'secret', connectionId: 'connection-bob', expiresAt: EXPIRES_AT, userId: BOB },
    { blockId: null, connectionId: 'connection-carol', expiresAt: EXPIRES_AT, userId: 'user-carol' },
  ];
  const rows = [
    buildRow({ id: 'page-a', type: 'page' }),
    buildRow({ id: 'a-1', parentId: 'page-a' }),
    buildRow({ id: 'secret', parentId: 'page-a', permissions: onlyFor(BOB) }),
  ];

  it('lists every user to every subscriber and hides the block ids the subscriber cannot read', () => {
    const context = buildContext(rows, [ALICE, BOB]);

    const deliveries = planPresenceDeliveries({
      context,
      entries,
      pageId: 'page-a',
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a'), subscribe('connection-bob', BOB, 'page-a')],
    });

    expect(deliveries).toEqual([
      {
        connectionId: 'connection-alice',
        message: {
          pageId: 'page-a',
          type: 'presence',
          users: [
            { blockId: 'a-1', expiresAt: EXPIRES_AT, userId: ALICE },
            { blockId: null, expiresAt: EXPIRES_AT, userId: BOB },
            { blockId: null, expiresAt: EXPIRES_AT, userId: 'user-carol' },
          ],
        },
      },
      {
        connectionId: 'connection-bob',
        message: {
          pageId: 'page-a',
          type: 'presence',
          users: [
            { blockId: 'a-1', expiresAt: EXPIRES_AT, userId: ALICE },
            { blockId: 'secret', expiresAt: EXPIRES_AT, userId: BOB },
            { blockId: null, expiresAt: EXPIRES_AT, userId: 'user-carol' },
          ],
        },
      },
    ]);
  });

  it('hides every block id from a subscriber whose access could not be resolved', () => {
    const context = buildContext(rows, []);

    const deliveries = planPresenceDeliveries({
      context,
      entries,
      pageId: 'page-a',
      subscriptions: [subscribe('connection-alice', ALICE, 'page-a')],
    });

    const message = deliveries[0]?.message;
    expect(message?.type === 'presence' ? message.users.map((user) => user.blockId) : []).toEqual([null, null, null]);
  });
});

describe('listSubscriptionsInOtherSpace', () => {
  const context = buildContext(
    [buildRow({ id: 'page-a', spaceId: 'space-2', type: 'page' }), buildRow({ id: 'page-b', type: 'page' })],
    [ALICE],
  );

  it('lists the subscriptions to a page that now lives in another space than the one they are filed under', () => {
    const moved = subscribe('connection-alice', ALICE, 'page-a');
    const staying = subscribe('connection-alice', ALICE, 'page-b');

    expect(listSubscriptionsInOtherSpace([moved, staying], context)).toEqual([
      { connectionId: 'connection-alice', pageId: 'page-a', spaceId: 'space-2' },
    ]);
  });

  it('leaves out a page the context does not know', () => {
    expect(listSubscriptionsInOtherSpace([subscribe('connection-alice', ALICE, 'page-gone')], context)).toEqual([]);
  });
});
