import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE, type BlockPermissions, USER_ROLE } from '@neuma/shared';
import { indexById, resolveRoles } from '@/common/domain/block-access.domain';
import { planCollectionDeliveries, planCollectionResync } from '@/modules/blocks/domain/block.live.collection.domain';
import type {
  BlockChainRow,
  CollectionSubscription,
  LiveAccessContext,
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
  type: 'page',
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

const subscribe = (connectionId: string, userId: string, collectionId: string): CollectionSubscription => ({
  collectionId,
  connectionId,
  spaceId: SPACE_ID,
  userId,
});

const ROWS: readonly BlockChainRow[] = [
  buildRow({ id: 'tasks' }),
  buildRow({ id: 'task-1', parentId: 'tasks' }),
  buildRow({ id: 'task-2', parentId: 'tasks' }),
  buildRow({ id: 'other' }),
  buildRow({ id: 'other-1', parentId: 'other' }),
  buildRow({ id: 'task-1-body', parentId: 'task-1', type: 'paragraph' }),
];

describe('planCollectionDeliveries', () => {
  it('tells the subscribers of a collection the rows that changed with their versions', () => {
    const deliveries = planCollectionDeliveries({
      blocks: [
        { id: 'task-1', version: 4 },
        { id: 'other-1', version: 9 },
      ],
      context: buildContext(ROWS, [ALICE]),
      subscriptions: [subscribe('c1', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([
      {
        connectionId: 'c1',
        message: {
          collectionId: 'tasks',
          rows: [{ id: 'task-1', version: 4 }],
          type: 'collection-changes',
          views: [],
        },
      },
    ]);
  });

  it('does not report the body of a row', () => {
    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'task-1-body', version: 2 }],
      context: buildContext(ROWS, [ALICE]),
      subscriptions: [subscribe('c1', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([]);
  });

  it('reports the version of a view of the collection and of its schema', () => {
    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'tasks', version: 7 }],
      context: buildContext(ROWS, [ALICE]),
      subscriptions: [subscribe('c1', ALICE, 'tasks')],
      views: [
        { id: 'view-1', pageId: 'tasks', version: 3 },
        { id: 'view-9', pageId: 'other', version: 1 },
      ],
    });

    expect(deliveries[0]?.message).toEqual({
      collectionId: 'tasks',
      rows: [],
      schemaVersion: 7,
      type: 'collection-changes',
      views: [{ id: 'view-1', version: 3 }],
    });
  });

  it('never names a row the subscriber cannot read and says nothing about an ordinary change to it', () => {
    const rows = [...ROWS, buildRow({ id: 'secret', parentId: 'tasks', permissions: onlyFor(BOB) })];

    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'secret', version: 5 }],
      context: buildContext(rows, [ALICE, BOB]),
      subscriptions: [subscribe('alice', ALICE, 'tasks'), subscribe('bob', BOB, 'tasks')],
      views: [],
    });

    expect(deliveries.map((delivery) => delivery.connectionId)).toEqual(['bob']);
    expect(JSON.stringify(deliveries)).toContain('secret');
    expect(deliveries.find((delivery) => delivery.connectionId === 'alice')).toBeUndefined();
  });

  it('keeps a hidden row out of the list but asks for a new query when its permissions changed', () => {
    const rows = [...ROWS, buildRow({ id: 'secret', parentId: 'tasks', permissions: onlyFor(BOB) })];

    const deliveries = planCollectionDeliveries({
      blocks: [
        { id: 'task-1', version: 2 },
        { hasAccessChange: true, id: 'secret', version: 5 },
      ],
      context: buildContext(rows, [ALICE]),
      subscriptions: [subscribe('alice', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([
      { connectionId: 'alice', message: { collectionId: 'tasks', type: 'collection-resync' } },
    ]);
    expect(JSON.stringify(deliveries)).not.toContain('secret');
  });

  it('asks the collection a row left to query again, and tells the one it entered', () => {
    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'other-1', previousParentId: 'tasks', version: 3 }],
      context: buildContext(ROWS, [ALICE]),
      subscriptions: [subscribe('from', ALICE, 'tasks'), subscribe('into', ALICE, 'other')],
      views: [],
    });

    expect(deliveries).toEqual([
      { connectionId: 'from', message: { collectionId: 'tasks', type: 'collection-resync' } },
      {
        connectionId: 'into',
        message: {
          collectionId: 'other',
          rows: [{ id: 'other-1', version: 3 }],
          type: 'collection-changes',
          views: [],
        },
      },
    ]);
  });

  it('revokes the subscriber who can no longer read the collection', () => {
    const rows = [buildRow({ id: 'tasks', permissions: onlyFor(BOB) }), buildRow({ id: 'task-1', parentId: 'tasks' })];

    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'task-1', version: 2 }],
      context: buildContext(rows, [ALICE]),
      subscriptions: [subscribe('alice', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([
      { connectionId: 'alice', message: { collectionId: 'tasks', type: 'collection-revoked' } },
    ]);
  });

  it('asks for a new query when the access of the subscriber could not be resolved', () => {
    const deliveries = planCollectionDeliveries({
      blocks: [{ id: 'task-1', version: 2 }],
      context: buildContext(ROWS, []),
      subscriptions: [subscribe('alice', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([
      { connectionId: 'alice', message: { collectionId: 'tasks', type: 'collection-resync' } },
    ]);
  });

  it('asks for a new query instead of listing more rows than a message carries', () => {
    const many = Array.from({ length: 501 }, (_, index) => buildRow({ id: `row-${String(index)}`, parentId: 'tasks' }));

    const deliveries = planCollectionDeliveries({
      blocks: many.map((row) => ({ id: row.id, version: 1 })),
      context: buildContext([buildRow({ id: 'tasks' }), ...many], [ALICE]),
      subscriptions: [subscribe('alice', ALICE, 'tasks')],
      views: [],
    });

    expect(deliveries).toEqual([
      { connectionId: 'alice', message: { collectionId: 'tasks', type: 'collection-resync' } },
    ]);
  });
});

describe('planCollectionDeliveries on a board of 2,000 cards', () => {
  it('plans a burst of 300 changed cards for 60 followers well inside a frame budget', () => {
    const cards = Array.from({ length: 2000 }, (_, index) =>
      buildRow({ id: `card-${String(index)}`, parentId: 'tasks' }),
    );
    const users = Array.from({ length: 60 }, (_, index) => `user-${String(index)}`);
    const context = buildContext([buildRow({ id: 'tasks' }), ...cards], users);
    const subscriptions = users.map((userId) => subscribe(`connection-${userId}`, userId, 'tasks'));
    const blocks = cards.slice(0, 300).map((card) => ({ id: card.id, version: 2 }));

    const startedAt = performance.now();
    const deliveries = planCollectionDeliveries({ blocks, context, subscriptions, views: [] });
    const elapsedMs = performance.now() - startedAt;

    expect(deliveries).toHaveLength(60);
    expect(elapsedMs).toBeLessThan(250);
  });
});

describe('planCollectionResync', () => {
  it('asks every subscriber of a collection to query again', () => {
    expect(planCollectionResync([subscribe('c1', ALICE, 'tasks'), subscribe('c2', BOB, 'other')])).toEqual([
      { connectionId: 'c1', message: { collectionId: 'tasks', type: 'collection-resync' } },
      { connectionId: 'c2', message: { collectionId: 'other', type: 'collection-resync' } },
    ]);
  });
});
