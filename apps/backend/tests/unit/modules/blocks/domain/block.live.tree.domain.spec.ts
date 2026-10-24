import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE, type BlockPermissions, USER_ROLE } from '@neuma/shared';
import { indexById, resolveRoles } from '@/common/domain/block-access.domain';
import { BLOCK_LIVE_TREE_MESSAGE_MAX_PARENTS } from '@/modules/blocks/domain/block.live.constants';
import type {
  BlockChainRow,
  LiveAccessContext,
  TreeSubscription,
} from '@/modules/blocks/domain/block.live.domain.types';
import {
  listLostTreeSubscriptions,
  planTreeDeliveries,
  planTreeResync,
} from '@/modules/blocks/domain/block.live.tree.domain';

const SPACE_ID = 'space-1';
const MAX_DEPTH = 8;
const ALICE = 'user-alice';
const BOB = 'user-bob';

const buildRow = (overrides: Partial<BlockChainRow> & Pick<BlockChainRow, 'id'>): BlockChainRow => ({
  alive: true,
  parentId: null,
  permissions: null,
  spaceId: SPACE_ID,
  type: 'page',
  ...overrides,
});

const onlyFor = (userId: string): BlockPermissions => [
  { principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId }, role: BLOCK_ROLE.full },
];

const buildContext = (
  rows: readonly BlockChainRow[],
  userIds: readonly string[],
  usersWithoutTheSpace: readonly string[] = [],
): LiveAccessContext => {
  const rowsById = indexById(rows);
  const readableSpaceIds = new Set([SPACE_ID]);
  return {
    maxDepth: MAX_DEPTH,
    readableSpaceIdsByUserId: new Map(
      userIds.map((userId) => [userId, usersWithoutTheSpace.includes(userId) ? new Set<string>() : readableSpaceIds]),
    ),
    rolesByUserId: new Map(
      userIds.map((userId) => [
        userId,
        resolveRoles({ readableSpaceIds, viewer: { userId, workspaceRole: USER_ROLE.WORKER } }, rowsById),
      ]),
    ),
    rowsById,
  };
};

const follow = (connectionId: string, userId: string): TreeSubscription => ({
  connectionId,
  spaceId: SPACE_ID,
  userId,
});

describe('planTreeDeliveries', () => {
  it('names the parent of a page that changed, and the top of the space with null', () => {
    const rows = [buildRow({ id: 'top' }), buildRow({ id: 'inner', parentId: 'top' })];

    const deliveries = planTreeDeliveries({
      blocks: [
        { id: 'inner', version: 3 },
        { id: 'top', version: 2 },
      ],
      context: buildContext(rows, [ALICE]),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries).toEqual([
      { connectionId: 'c1', message: { parentIds: ['top', null], spaceId: SPACE_ID, type: 'tree-changed' } },
    ]);
  });

  it('names also the parent a page left, including the top of the space', () => {
    const rows = [buildRow({ id: 'destination' }), buildRow({ id: 'moved', parentId: 'destination' })];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'moved', previousParentId: null, version: 5 }],
      context: buildContext(rows, [ALICE]),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries[0]?.message).toEqual({
      parentIds: ['destination', null],
      spaceId: SPACE_ID,
      type: 'tree-changed',
    });
  });

  it('says nothing about blocks that are not pages, such as the text of a page', () => {
    const rows = [buildRow({ id: 'page' }), buildRow({ id: 'text', parentId: 'page', type: 'paragraph' })];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'text', version: 8 }],
      context: buildContext(rows, [ALICE]),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries).toEqual([]);
  });

  it('says nothing about a template of a collection, which is not part of any listing', () => {
    const rows = [buildRow({ id: 'tasks' }), buildRow({ id: 'template', isTemplate: true, parentId: 'tasks' })];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'template', version: 2 }],
      context: buildContext(rows, [ALICE]),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries).toEqual([]);
  });

  it('does not name a parent the follower cannot read', () => {
    const rows = [
      buildRow({ id: 'closed', permissions: onlyFor(ALICE) }),
      buildRow({ id: 'inside', parentId: 'closed', permissions: onlyFor(ALICE) }),
    ];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'inside', version: 4 }],
      context: buildContext(rows, [ALICE, BOB]),
      subscriptions: [follow('c-alice', ALICE), follow('c-bob', BOB)],
    });

    expect(deliveries.map((delivery) => delivery.connectionId)).toEqual(['c-alice']);
  });

  it('asks for a new read instead of naming a crowd of parents', () => {
    const count = BLOCK_LIVE_TREE_MESSAGE_MAX_PARENTS + 1;
    const parents = Array.from({ length: count }, (_, index) => buildRow({ id: `parent-${String(index)}` }));
    const children = parents.map((parent) => buildRow({ id: `${parent.id}-child`, parentId: parent.id }));

    const deliveries = planTreeDeliveries({
      blocks: children.map((child) => ({ id: child.id, version: 2 })),
      context: buildContext([...parents, ...children], [ALICE]),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries).toEqual([{ connectionId: 'c1', message: { spaceId: SPACE_ID, type: 'tree-resync' } }]);
  });

  it('tells the top of the space when a page there stopped being readable by the follower', () => {
    const rows = [buildRow({ id: 'closed-now', permissions: onlyFor(BOB) })];

    const deliveries = planTreeDeliveries({
      blocks: [{ hasAccessChange: true, id: 'closed-now', version: 6 }],
      context: buildContext(rows, [ALICE, BOB]),
      subscriptions: [follow('c-alice', ALICE), follow('c-bob', BOB)],
    });

    expect(deliveries).toEqual([
      { connectionId: 'c-alice', message: { parentIds: [null], spaceId: SPACE_ID, type: 'tree-changed' } },
      { connectionId: 'c-bob', message: { parentIds: [null], spaceId: SPACE_ID, type: 'tree-changed' } },
    ]);
  });

  it('stays silent about a closed page at the top when only its title changed', () => {
    const rows = [buildRow({ id: 'closed', permissions: onlyFor(BOB) })];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'closed', version: 6 }],
      context: buildContext(rows, [ALICE, BOB]),
      subscriptions: [follow('c-alice', ALICE)],
    });

    expect(deliveries).toEqual([]);
  });

  it('tells the parent when a page under a readable parent stopped being readable by the follower', () => {
    const rows = [buildRow({ id: 'parent' }), buildRow({ id: 'child', parentId: 'parent', permissions: onlyFor(BOB) })];

    const deliveries = planTreeDeliveries({
      blocks: [{ hasAccessChange: true, id: 'child', version: 6 }],
      context: buildContext(rows, [ALICE]),
      subscriptions: [follow('c-alice', ALICE)],
    });

    expect(deliveries[0]?.message).toEqual({ parentIds: ['parent'], spaceId: SPACE_ID, type: 'tree-changed' });
  });

  it('asks a follower to read again when it can no longer read the space at all', () => {
    const rows = [buildRow({ id: 'top' })];

    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'top', version: 3 }],
      context: buildContext(rows, [ALICE, BOB], [ALICE]),
      subscriptions: [follow('c-alice', ALICE), follow('c-bob', BOB)],
    });

    expect(deliveries).toEqual([
      { connectionId: 'c-alice', message: { spaceId: SPACE_ID, type: 'tree-resync' } },
      { connectionId: 'c-bob', message: { parentIds: [null], spaceId: SPACE_ID, type: 'tree-changed' } },
    ]);
  });

  it('asks for a new read from a follower whose access is unknown', () => {
    const deliveries = planTreeDeliveries({
      blocks: [{ id: 'top', version: 2 }],
      context: buildContext([buildRow({ id: 'top' })], []),
      subscriptions: [follow('c1', ALICE)],
    });

    expect(deliveries).toEqual([{ connectionId: 'c1', message: { spaceId: SPACE_ID, type: 'tree-resync' } }]);
  });
});

describe('listLostTreeSubscriptions', () => {
  it('names the followers that can no longer read the space, and only those', () => {
    const context = buildContext([buildRow({ id: 'top' })], [ALICE, BOB], [ALICE]);

    const lost = listLostTreeSubscriptions(context, [follow('c-alice', ALICE), follow('c-bob', BOB)]);

    expect(lost.map((subscription) => subscription.connectionId)).toEqual(['c-alice']);
  });

  it('does not count a follower whose access could not be resolved as lost: it is asked to read again instead', () => {
    const context = buildContext([buildRow({ id: 'top' })], []);

    expect(listLostTreeSubscriptions(context, [follow('c-alice', ALICE)])).toEqual([]);
  });
});

describe('planTreeResync', () => {
  it('asks every follower to read again', () => {
    expect(planTreeResync([follow('c1', ALICE), follow('c2', BOB)]).map((delivery) => delivery.connectionId)).toEqual([
      'c1',
      'c2',
    ]);
  });
});
