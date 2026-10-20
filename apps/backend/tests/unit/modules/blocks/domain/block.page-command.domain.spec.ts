import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import { planBlockTransaction } from '@/modules/blocks/domain/block.transaction.domain';
import type {
  BlockOperation,
  BlockTransactionInput,
  WorkingBlock,
} from '@/modules/blocks/domain/block.transaction.domain.types';
import { parseBlockOperations, parseTrustedBlockOperations } from '@/modules/blocks/utils/block.operation.utils';
import { blockTextEngine } from '@/modules/blocks/utils/block.text.utils';
import { buildBlock, buildInput, buildPage, NOW, USER_ID } from '../block.test-data';

const plan = (input: BlockTransactionInput) => planBlockTransaction(input, blockTextEngine);

const plannedOf = (input: BlockTransactionInput) => {
  const planned = plan(input);
  if (planned.isFail()) throw planned.getError();
  return planned.getValue();
};

const refusalOf = (input: BlockTransactionInput): string => {
  const planned = plan(input);
  if (planned.isOk()) throw new Error('Expected the command to be refused');
  return planned.getError().code;
};

const writtenBlock = (input: BlockTransactionInput, blockId: string): WorkingBlock => {
  const write = plannedOf(input).writes.find((entry) => entry.block.id === blockId);
  if (write === undefined) throw new Error(`Block ${blockId} was not written`);
  return write.block;
};

const lockedAt = new Date('2026-10-01T00:00:00.000Z');
const page = buildPage({ children: ['p1'], id: 'page-1', version: 4 });
const paragraph = buildBlock({ id: 'p1', parentId: 'page-1', version: 2 });

describe('the page commands of the blocks module', () => {
  describe('locking', () => {
    it('stamps who locked the page and when, and keeps it a write of the page block alone', () => {
      const operations: BlockOperation[] = [{ blockId: 'page-1', command: 'setLock', isLocked: true }];

      const result = plannedOf(buildInput(operations, [page, paragraph]));

      expect(result.writes.map((write) => write.block.id)).toEqual(['page-1']);
      const locked = writtenBlock(buildInput(operations, [page, paragraph]), 'page-1');
      expect(locked).toMatchObject({ lockedAt: NOW, page: { lockedById: USER_ID }, version: 5 });
    });

    it('lets a locked page be unlocked by someone who can edit it', () => {
      const locked = buildPage({ id: 'page-1', lockedAt, version: 4 });
      const operations: BlockOperation[] = [{ blockId: 'page-1', command: 'setLock', isLocked: false }];

      const unlocked = writtenBlock(buildInput(operations, [locked]), 'page-1');

      expect(unlocked.lockedAt).toBeNull();
      expect(unlocked.page?.lockedById).toBeNull();
    });

    it('refuses to lock a page to someone who may only read it', () => {
      const operations: BlockOperation[] = [{ blockId: 'page-1', command: 'setLock', isLocked: true }];

      const code = refusalOf(
        buildInput(operations, [page], { actor: { userId: USER_ID, workspaceRole: USER_ROLE.CLIENT } }),
      );

      expect(code).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('refuses a command on a block that is not a page', () => {
      const operations: BlockOperation[] = [{ blockId: 'p1', command: 'setLock', isLocked: true }];

      expect(refusalOf(buildInput(operations, [page, paragraph]))).toBe('BLOCK_OPERATION_INVALID');
    });
  });

  describe('verification and owner', () => {
    it('verifies with who, when and until when, and clears all three together', () => {
      const expiresAt = new Date('2027-01-01T00:00:00.000Z');
      const verify: BlockOperation[] = [{ blockId: 'page-1', command: 'setVerification', expiresAt, isVerified: true }];

      const verified = writtenBlock(buildInput(verify, [page]), 'page-1');
      const cleared = writtenBlock(
        buildInput([{ blockId: 'page-1', command: 'setVerification', expiresAt: null, isVerified: false }], [verified]),
        'page-1',
      );

      expect(verified.page).toMatchObject({ verificationExpiresAt: expiresAt, verifiedAt: NOW, verifiedById: USER_ID });
      expect(cleared.page).toMatchObject({ verificationExpiresAt: null, verifiedAt: null, verifiedById: null });
    });

    it('works on a locked page, which only refuses to be edited', () => {
      const locked = buildPage({ id: 'page-1', lockedAt });
      const operations: BlockOperation[] = [{ blockId: 'page-1', command: 'setOwner', ownerId: 'user-2' }];

      expect(writtenBlock(buildInput(operations, [locked]), 'page-1').page?.ownerId).toBe('user-2');
    });

    it('refuses to change a page in the trash', () => {
      const trashed = buildPage({ id: 'page-1', lifecycle: 'TRASHED' });
      const operations: BlockOperation[] = [{ blockId: 'page-1', command: 'setOwner', ownerId: 'user-2' }];

      expect(refusalOf(buildInput(operations, [trashed]))).toBe('PAGE_INVALID_LIFECYCLE');
    });
  });

  describe('the trash', () => {
    it('trashes the page block alone, stamping when, and does not touch what is below it', () => {
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: null, lifecycle: 'TRASHED' },
      ];

      const input = buildInput(operations, [page, paragraph]);

      expect(plannedOf(input).writes.map((write) => write.block.id)).toEqual(['page-1']);
      expect(writtenBlock(input, 'page-1')).toMatchObject({
        lifecycle: 'TRASHED',
        page: { purgeAfter: null, trashedAt: NOW },
      });
    });

    it('trashes a locked page, which a lock does not stop', () => {
      const locked = buildPage({ id: 'page-1', lockedAt });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: null, lifecycle: 'TRASHED' },
      ];

      expect(writtenBlock(buildInput(operations, [locked]), 'page-1').lifecycle).toBe('TRASHED');
    });

    it('refuses to trash a page that is in the trash already', () => {
      const trashed = buildPage({ id: 'page-1', lifecycle: 'TRASHED' });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: null, lifecycle: 'TRASHED' },
      ];

      expect(refusalOf(buildInput(operations, [trashed]))).toBe('PAGE_INVALID_LIFECYCLE');
    });

    it('restores a trashed page and clears the date and the pending deletion', () => {
      const trashed = buildPage({ id: 'page-1', lifecycle: 'TRASHED', page: { ...emptyColumns, purgeAfter: NOW } });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: null, lifecycle: 'ACTIVE' },
      ];

      const restored = writtenBlock(buildInput(operations, [trashed]), 'page-1');

      expect(restored).toMatchObject({ lifecycle: 'ACTIVE', page: { purgeAfter: null, trashedAt: null } });
    });

    it('refuses to restore a page that is not in the trash', () => {
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: null, lifecycle: 'ACTIVE' },
      ];

      expect(refusalOf(buildInput(operations, [page]))).toBe('PAGE_INVALID_LIFECYCLE');
    });

    it('restores a page to the root, out of the list of a parent that is in the trash', () => {
      const parent = buildPage({ children: ['page-1'], id: 'parent-1', lifecycle: 'TRASHED', version: 6 });
      const trashed = buildPage({ id: 'page-1', lifecycle: 'TRASHED', parentId: 'parent-1', version: 3 });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'setLifecycle', detachFromParentId: 'parent-1', lifecycle: 'ACTIVE' },
      ];

      const input = buildInput(operations, [parent, trashed]);

      expect(writtenBlock(input, 'page-1')).toMatchObject({ lifecycle: 'ACTIVE', parentId: null });
      expect(writtenBlock(input, 'parent-1').children).toEqual([]);
    });
  });

  describe('rewriting the values of a row for a change of its collection', () => {
    const rewrite: BlockOperation[] = [{ blockId: 'page-1', command: 'rewritePageValues', values: { status: 'done' } }];

    it('rewrites the values of a locked row, which a change of the shape is not an edit of', () => {
      const locked = buildPage({ id: 'page-1', lockedAt, properties: { title: [], values: { status: 'todo' } } });

      expect(writtenBlock(buildInput(rewrite, [locked]), 'page-1').properties.values).toEqual({ status: 'done' });
    });

    it('rewrites the values of a row in the trash, so it comes back consistent', () => {
      const trashed = buildPage({
        id: 'page-1',
        lifecycle: 'TRASHED',
        properties: { title: [], values: { status: 'todo' } },
      });

      expect(writtenBlock(buildInput(rewrite, [trashed]), 'page-1').properties.values).toEqual({ status: 'done' });
    });

    it('still asks for the right to edit the row', () => {
      const code = refusalOf(
        buildInput(rewrite, [buildPage({ id: 'page-1' })], {
          actor: { userId: USER_ID, workspaceRole: USER_ROLE.CLIENT },
        }),
      );

      expect(code).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('is a command only the backend sends', () => {
      const wire = {
        args: { values: { status: 'done' } },
        command: 'rewritePageValues',
        path: [],
        pointer: { id: 'page-1', table: 'block' },
      };

      expect(parseBlockOperations([wire]).isFail()).toBe(true);
      expect(parseTrustedBlockOperations([wire]).isOk()).toBe(true);
    });
  });

  describe('the values of a row', () => {
    it('merges the named values over the ones the page has and removes the ones sent as null', () => {
      const row = buildPage({
        id: 'page-1',
        properties: { title: [], values: { priority: 'low', status: 'todo' } },
      });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'mergePageValues', values: { notes: 'hola', priority: null, status: 'done' } },
      ];

      const merged = writtenBlock(buildInput(operations, [row]), 'page-1');

      expect(merged.properties.values).toEqual({ notes: 'hola', status: 'done' });
    });

    it('refuses to write the values of a locked page', () => {
      const locked = buildPage({ id: 'page-1', lockedAt });
      const operations: BlockOperation[] = [
        { blockId: 'page-1', command: 'mergePageValues', values: { status: 'done' } },
      ];

      expect(refusalOf(buildInput(operations, [locked]))).toBe('PAGE_LOCKED');
    });
  });

  describe('moving a branch to another space', () => {
    const root = buildPage({ children: ['p1', 'child-page'], id: 'page-1', parentId: 'old-parent', version: 4 });
    const oldParent = buildPage({ children: ['page-1'], id: 'old-parent', version: 8 });
    const childPage = buildPage({ children: ['p2'], id: 'child-page', parentId: 'page-1' });
    const nested = buildBlock({ id: 'p2', parentId: 'child-page' });
    const loaded = [oldParent, root, paragraph, childPage, nested];
    const operations: BlockOperation[] = [
      {
        afterId: null,
        blockId: 'page-1',
        command: 'moveToSpaceRoot',
        detachFromParentId: 'old-parent',
        parentId: null,
        spaceId: 'space-2',
      },
    ];

    const moveInput = (blocks: readonly WorkingBlock[], move: readonly BlockOperation[] = operations) =>
      buildInput(move, blocks, {
        extraReadableSpaceIds: ['space-2'],
        load: {
          context: [],
          isDepthExceeded: false,
          locked: blocks,
          spaces: [
            { id: 'space-1', rootPageIds: [] },
            { id: 'space-2', rootPageIds: ['top-1'] },
          ],
        },
      });

    const toParent: BlockOperation[] = [
      {
        afterId: 'sibling-1',
        blockId: 'page-1',
        command: 'moveToSpaceRoot',
        detachFromParentId: 'old-parent',
        parentId: 'new-parent',
        spaceId: 'space-2',
      },
    ];
    const newParent = buildPage({ children: ['sibling-1'], id: 'new-parent', spaceId: 'space-2' });
    const sibling = buildPage({ id: 'sibling-1', parentId: 'new-parent', spaceId: 'space-2' });

    it('lands under a page of the new space right after the sibling named, in the same transaction', () => {
      const input = moveInput([oldParent, root, paragraph, childPage, nested, newParent, sibling], toParent);

      expect(writtenBlock(input, 'page-1')).toMatchObject({ parentId: 'new-parent', spaceId: 'space-2' });
      expect(writtenBlock(input, 'new-parent').children).toEqual(['sibling-1', 'page-1']);
      expect(writtenBlock(input, 'old-parent').children).toEqual([]);
    });

    it('refuses to land under a page of the new space that is locked, and writes nothing', () => {
      const locked = buildPage({ ...newParent, lockedAt });

      expect(refusalOf(moveInput([oldParent, root, paragraph, childPage, nested, locked, sibling], toParent))).toBe(
        'PAGE_LOCKED',
      );
    });

    it('refuses to land under a page of a space the mover cannot read', () => {
      const input = buildInput(toParent, [oldParent, root, newParent], { extraReadableSpaceIds: [] });

      expect(refusalOf(input)).toBe('BLOCK_ACCESS_DENIED');
    });

    it('lists the page in the top-level pages of the new space, and leaves the list of the old space', () => {
      const topPage = buildPage({ id: 'page-1', version: 2 });
      const toTop: BlockOperation[] = [
        {
          afterId: null,
          blockId: 'page-1',
          command: 'moveToSpaceRoot',
          detachFromParentId: null,
          parentId: null,
          spaceId: 'space-2',
        },
      ];
      const input = moveInput([topPage], toTop);

      const writes = plannedOf(input).spaceWrites;

      expect(writes).toEqual([{ id: 'space-2', rootPageIds: ['top-1', 'page-1'] }]);
    });

    it('takes the page and everything below it to the new space, and the page to its root', () => {
      const input = moveInput(loaded);

      const written = plannedOf(input).writes.map((write) => write.block);

      expect(
        written
          .filter((block) => block.spaceId === 'space-2')
          .map((block) => block.id)
          .toSorted(),
      ).toEqual(['child-page', 'p1', 'p2', 'page-1']);
      expect(writtenBlock(input, 'page-1').parentId).toBeNull();
    });

    it('takes the page out of the list of the parent it leaves in the old space', () => {
      const input = moveInput(loaded);

      expect(writtenBlock(input, 'old-parent').children).toEqual([]);
      expect(writtenBlock(input, 'old-parent').spaceId).toBe('space-1');
    });

    it('moves a locked branch, which a lock does not stop', () => {
      const lockedChild = buildPage({ ...childPage, lockedAt });

      const input = moveInput([oldParent, root, paragraph, lockedChild, nested]);

      expect(writtenBlock(input, 'child-page').spaceId).toBe('space-2');
    });
  });
});

describe('who may send a page command', () => {
  const wireOperation = {
    args: { locked: true },
    command: 'setLock',
    path: [],
    pointer: { id: 'page-1', table: 'block' },
  };

  it('never takes it from a client, who can only send the commands of an edit', () => {
    const parsed = parseBlockOperations([wireOperation]);

    expect(parsed.getError().code).toBe('BLOCK_OPERATION_INVALID');
  });

  it('takes it from the backend itself, with every argument checked', () => {
    expect(parseTrustedBlockOperations([wireOperation]).getValue()).toEqual([
      { blockId: 'page-1', command: 'setLock', isLocked: true },
    ]);
    expect(parseTrustedBlockOperations([{ ...wireOperation, args: { locked: 'yes' } }]).getError().code).toBe(
      'BLOCK_OPERATION_INVALID',
    );
    expect(parseTrustedBlockOperations([{ ...wireOperation, args: { locked: true, extra: 1 } }]).isFail()).toBe(true);
  });

  it('still takes the commands of an edit from the backend itself', () => {
    const edit = {
      args: { id: 'p1' },
      command: 'listRemove',
      path: ['children'],
      pointer: { id: 'page-1', table: 'block' },
    };

    expect(parseTrustedBlockOperations([edit]).isOk()).toBe(true);
  });
});

const emptyColumns = {
  lockedById: null,
  ownerId: null,
  purgeAfter: null,
  trashedAt: null,
  verificationExpiresAt: null,
  verifiedAt: null,
  verifiedById: null,
};
