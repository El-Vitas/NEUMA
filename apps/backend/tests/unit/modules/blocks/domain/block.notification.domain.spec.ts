import { describe, expect, it } from 'bun:test';
import { BLOCK_PRINCIPAL_KIND, BLOCK_ROLE } from '@neuma/shared';
import { buildBlockNotices, buildViewNotices } from '@/modules/blocks/domain/block.notification.domain';

interface Shape {
  readonly id: string;
  readonly parentId: string | null;
  readonly permissions: readonly { principal: { kind: string; userId: string }; role: string }[] | null;
  readonly version: number;
}

const block = (overrides: Partial<Shape> & Pick<Shape, 'id'>): Shape => ({
  parentId: 'collection-1',
  permissions: null,
  version: 2,
  ...overrides,
});

const grant = [{ principal: { kind: BLOCK_PRINCIPAL_KIND.user, userId: 'u1' }, role: BLOCK_ROLE.full }];

describe('buildBlockNotices', () => {
  it('lists the version of a block that kept its parent and its permissions', () => {
    const notices = buildBlockNotices(
      [block({ id: 'row-1' })],
      new Map([['row-1', block({ id: 'row-1', version: 1 })]]),
    );

    expect(notices).toEqual([{ id: 'row-1', version: 2 }]);
  });

  it('names the parent a block left', () => {
    const notices = buildBlockNotices(
      [block({ id: 'row-1', parentId: 'collection-2' })],
      new Map([['row-1', block({ id: 'row-1' })]]),
    );

    expect(notices).toEqual([{ id: 'row-1', previousParentId: 'collection-1', version: 2 }]);
  });

  it('flags a change of permissions', () => {
    const notices = buildBlockNotices(
      [block({ id: 'row-1', permissions: grant })],
      new Map([['row-1', block({ id: 'row-1' })]]),
    );

    expect(notices).toEqual([{ hasAccessChange: true, id: 'row-1', version: 2 }]);
  });

  it('flags a new block that carries its own permissions', () => {
    const notices = buildBlockNotices([block({ id: 'row-1', permissions: grant })], new Map());

    expect(notices).toEqual([{ hasAccessChange: true, id: 'row-1', version: 2 }]);
  });

  it('does not flag a new block that inherits', () => {
    expect(buildBlockNotices([block({ id: 'row-1' })], new Map())).toEqual([{ id: 'row-1', version: 2 }]);
  });
});

describe('buildViewNotices', () => {
  it('adds the collection each touched view belongs to', () => {
    const notices = buildViewNotices([{ id: 'view-1', version: 3 }], [{ id: 'view-1', pageId: 'collection-1' }]);

    expect(notices).toEqual([{ id: 'view-1', pageId: 'collection-1', version: 3 }]);
  });
});
