import { describe, expect, it } from 'bun:test';
import { USER_ROLE } from '@neuma/shared';
import { planBlockTransaction } from '@/modules/blocks/domain/block.transaction.domain';
import type { BlockOperation, BlockTransactionInput } from '@/modules/blocks/domain/block.transaction.domain.types';
import { blockTextEngine } from '@/modules/blocks/utils/block.text.utils';
import { buildBlock, buildInput, buildPage, createParagraph, listAfter, NOW, USER_ID } from '../block.test-data';

const plan = (input: BlockTransactionInput) => planBlockTransaction(input, blockTextEngine);

const refusalOf = (input: BlockTransactionInput): string => {
  const planned = plan(input);
  if (planned.isOk()) throw new Error('Expected the transaction to be refused');
  return planned.getError().code;
};

const plannedOf = (input: BlockTransactionInput) => {
  const planned = plan(input);
  if (planned.isFail()) throw planned.getError();
  return planned.getValue();
};

const asRole = (role: keyof typeof USER_ROLE) => ({ actor: { userId: USER_ID, workspaceRole: USER_ROLE[role] } });

const page = buildPage({ children: ['p1'], id: 'page-1', version: 4 });
const paragraph = buildBlock({ id: 'p1', parentId: 'page-1', version: 2 });
const create = [createParagraph('p2', 'page-1'), listAfter('page-1', 'p2', 'p1')];

describe('planBlockTransaction', () => {
  describe('creating a block', () => {
    it('plans the new block first, with its text and version, and the parent with its new child', () => {
      const result = plannedOf(buildInput(create, [page, paragraph]));

      expect(result.writes.map((write) => [write.block.id, write.isNew])).toEqual([
        ['p2', true],
        ['page-1', false],
      ]);
      const created = result.writes[0]?.block;
      expect(created).toMatchObject({
        createdById: USER_ID,
        editedAt: NOW,
        spaceId: 'space-1',
        text: 'Hello',
        version: 1,
      });
      expect(created?.textState).not.toBeNull();
      expect(result.writes[1]?.block.children).toEqual(['p1', 'p2']);
      expect(result.versions).toEqual([
        { id: 'p2', version: 1 },
        { id: 'page-1', version: 5 },
      ]);
    });

    it('plans a parent before its child when both are new', () => {
      const operations: BlockOperation[] = [
        {
          blockId: 'sub',
          command: 'create',
          fields: { format: null, parentId: 'page-1', properties: { title: [] }, type: 'page' },
        },
        createParagraph('inside', 'sub'),
        listAfter('sub', 'inside'),
        listAfter('page-1', 'sub'),
      ];

      const result = plannedOf(buildInput(operations, [page, paragraph, buildPage({ id: 'unused' })]));

      expect(result.writes.map((write) => write.block.id).slice(0, 2)).toEqual(['sub', 'inside']);
    });

    it('refuses a creation whose id is taken, saying so only to someone who can read it', () => {
      expect(refusalOf(buildInput([createParagraph('p1', 'page-1')], [page, paragraph]))).toBe('BLOCK_ALREADY_EXISTS');
      const hidden = buildBlock({
        id: 'p1',
        parentId: 'page-1',
        permissions: [{ principal: { kind: 'user', userId: 'someone-else' }, role: 'full' }],
      });
      expect(refusalOf(buildInput([createParagraph('p1', 'page-1')], [page, hidden]))).toBe('BLOCK_ACCESS_DENIED');
    });

    it('refuses a child that the parent does not list, and a listed child nobody created', () => {
      expect(refusalOf(buildInput([createParagraph('p2', 'page-1')], [page, paragraph]))).toBe('BLOCK_TREE_INVALID');
      expect(refusalOf(buildInput([listAfter('page-1', 'ghost')], [page, paragraph]))).toBe('BLOCK_TREE_INVALID');
    });

    it('refuses a block outside any page at the root, and a parent that does not exist', () => {
      const atRoot: BlockOperation = {
        blockId: 'p2',
        command: 'create',
        fields: { format: null, parentId: null, properties: { title: [] }, type: 'paragraph' },
      };

      expect(refusalOf(buildInput([atRoot], [page]))).toBe('BLOCK_TREE_INVALID');
      expect(refusalOf(buildInput([createParagraph('p2', 'nowhere')], [page]))).toBe('BLOCK_ACCESS_DENIED');
    });

    it('refuses content that does not fit the type, naming the block', () => {
      const wrong: BlockOperation = {
        blockId: 'p2',
        command: 'create',
        fields: { format: null, parentId: 'page-1', properties: { title: 'plain text' }, type: 'paragraph' },
      };

      expect(refusalOf(buildInput([wrong, listAfter('page-1', 'p2')], [page]))).toBe('BLOCK_CONTENT_INVALID');
    });
  });

  describe('changing the type of a block', () => {
    it('refuses to turn a page into a content block and a content block into a page', () => {
      const toParagraph: BlockOperation[] = [
        { blockId: 'page-1', command: 'patchFields', patch: { type: 'paragraph' } },
      ];
      const toPage: BlockOperation[] = [{ blockId: 'p1', command: 'patchFields', patch: { type: 'page' } }];

      expect(refusalOf(buildInput(toParagraph, [page, paragraph]))).toBe('BLOCK_TREE_INVALID');
      expect(refusalOf(buildInput(toPage, [page, paragraph]))).toBe('BLOCK_TREE_INVALID');
    });
  });

  describe('addresses a block can hold', () => {
    const createWith = (type: string, properties: Record<string, unknown>): BlockOperation[] => [
      { blockId: 'p2', command: 'create', fields: { format: null, parentId: 'page-1', properties, type } },
      listAfter('page-1', 'p2', 'p1'),
    ];

    it.each(['javascript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:run', 'file:///etc/passwd'])(
      'refuses %s in a bookmark',
      (url) => {
        expect(refusalOf(buildInput(createWith('bookmark', { url }), [page, paragraph]))).toBe('BLOCK_CONTENT_INVALID');
      },
    );

    it('keeps a bookmark to an https address', () => {
      const result = plannedOf(buildInput(createWith('bookmark', { url: 'https://example.com/a' }), [page, paragraph]));

      expect(result.writes[0]?.block.id).toBe('p2');
    });

    it('refuses an embed that is not https or not on a known provider', () => {
      const badUrls = ['javascript:alert(1)', 'http://www.youtube.com/watch?v=1', 'https://evil.example/x'];

      for (const url of badUrls) {
        const operations = createWith('embed', { provider: 'youtube', url });
        expect(refusalOf(buildInput(operations, [page, paragraph]))).toBe('BLOCK_CONTENT_INVALID');
      }
    });

    it('refuses a link mark that points to javascript: or data:', () => {
      for (const link of ['javascript:alert(1)', 'data:text/html,x']) {
        const operations = createWith('paragraph', { title: [{ attributes: { link }, insert: 'click' }] });
        expect(refusalOf(buildInput(operations, [page, paragraph]))).toBe('BLOCK_CONTENT_INVALID');
      }
    });
  });

  describe('versions and authorship', () => {
    it('raises the version by the number of operations that reached the block', () => {
      const operations: BlockOperation[] = [
        { bag: 'properties', blockId: 'p1', command: 'replaceEntry', key: 'checked', value: true },
        { bag: 'format', blockId: 'p1', command: 'replaceEntry', key: 'textColor', value: 'red' },
        { blockId: 'p1', command: 'patchFields', patch: { type: 'to_do' } },
      ];

      const result = plannedOf(buildInput(operations, [page, paragraph]));

      expect(result.versions).toEqual([{ id: 'p1', version: 5 }]);
      expect(result.writes[0]?.block).toMatchObject({ editedAt: NOW, editedById: USER_ID, type: 'to_do' });
    });

    it('refuses a rich text that is not made of segments, and one whose marks the type does not know', () => {
      const notSegments: BlockOperation[] = [
        { bag: 'properties', blockId: 'p1', command: 'replaceEntry', key: 'title', value: [{ insert: 42 }, 'nope'] },
      ];
      const unknownMark: BlockOperation[] = [
        {
          bag: 'properties',
          blockId: 'p1',
          command: 'replaceEntry',
          key: 'title',
          value: [{ attributes: { bogus: true }, insert: 'x' }],
        },
      ];

      expect(refusalOf(buildInput(notSegments, [page, paragraph]))).toBe('BLOCK_TEXT_UPDATE_INVALID');
      expect(refusalOf(buildInput(unknownMark, [page, paragraph]))).toBe('BLOCK_CONTENT_INVALID');
    });

    it('recomputes the text of a block whose rich text changed', () => {
      const operations: BlockOperation[] = [
        { bag: 'properties', blockId: 'p1', command: 'replaceEntry', key: 'title', value: [{ insert: 'New words' }] },
      ];

      expect(plannedOf(buildInput(operations, [page, paragraph])).writes[0]?.block.text).toBe('New words');
    });

    it('keeps the stored content of a block that only gained a child, even when it would not parse today', () => {
      const legacy = buildPage({ children: [], id: 'page-1', properties: { title: 'old shape' } });

      const result = plannedOf(buildInput([createParagraph('p2', 'page-1'), listAfter('page-1', 'p2')], [legacy]));

      expect(result.writes.find((write) => write.block.id === 'page-1')?.block.properties).toEqual({
        title: 'old shape',
      });
    });
  });

  describe('who may write', () => {
    const edit: BlockOperation[] = [
      { bag: 'format', blockId: 'p1', command: 'replaceEntry', key: 'textColor', value: 'red' },
    ];

    it('lets a worker edit and a client only read', () => {
      expect(plannedOf(buildInput(edit, [page, paragraph], asRole('WORKER'))).versions).toHaveLength(1);
      expect(refusalOf(buildInput(edit, [page, paragraph], asRole('CLIENT')))).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('answers a block hidden by permissions like a missing one', () => {
      const hiddenPage = buildPage({
        children: ['p1'],
        id: 'page-1',
        permissions: [{ principal: { kind: 'user', userId: 'someone-else' }, role: 'full' }],
      });

      expect(refusalOf(buildInput(edit, [hiddenPage, paragraph]))).toBe('BLOCK_ACCESS_DENIED');
      expect(refusalOf(buildInput([{ ...edit[0], blockId: 'missing' } as BlockOperation], [page]))).toBe(
        'BLOCK_ACCESS_DENIED',
      );
    });

    it('refuses a viewer granted only read on a block', () => {
      const readOnly = buildPage({
        children: ['p1'],
        id: 'page-1',
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });

      expect(refusalOf(buildInput(edit, [readOnly, paragraph]))).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('refuses everything when the space is not readable', () => {
      expect(refusalOf(buildInput(edit, [page, paragraph], { isSpaceReadable: false }))).toBe('BLOCK_ACCESS_DENIED');
    });

    it('refuses a block of another space as if it were missing', () => {
      const foreign = buildBlock({ id: 'p1', parentId: 'page-1', spaceId: 'space-2' });

      expect(refusalOf(buildInput(edit, [page, foreign]))).toBe('BLOCK_ACCESS_DENIED');
    });

    it('lets only whoever has full access change permissions', () => {
      const operations: BlockOperation[] = [{ blockId: 'p1', command: 'setPermissions', permissions: null }];

      expect(refusalOf(buildInput(operations, [page, paragraph], asRole('WORKER')))).toBe(
        'BLOCK_PERMISSIONS_FORBIDDEN',
      );
      expect(
        plannedOf(buildInput(operations, [page, paragraph], asRole('ADMIN'))).writes[0]?.block.permissions,
      ).toBeNull();
    });
  });

  describe('declaring permissions on a block created in the same transaction', () => {
    const creatingWithPermissions = (): BlockOperation[] => [
      ...create,
      { blockId: 'p2', command: 'setPermissions', permissions: null },
    ];

    it('needs the power to manage permissions on the parent, as it does on an existing block', () => {
      expect(refusalOf(buildInput(creatingWithPermissions(), [page, paragraph], asRole('WORKER')))).toBe(
        'BLOCK_PERMISSIONS_FORBIDDEN',
      );
    });

    it('is allowed to whoever can manage permissions on the parent', () => {
      const planned = plannedOf(buildInput(creatingWithPermissions(), [page, paragraph], asRole('ADMIN')));

      expect(planned.writes.map((write) => write.block.id)).toContain('p2');
    });

    it('lets an editor create the block without declaring permissions', () => {
      expect(plannedOf(buildInput(create, [page, paragraph], asRole('WORKER'))).writes[0]?.block.id).toBe('p2');
    });
  });

  describe('leaving nobody able to change who has access', () => {
    const members = [
      { canReadSpace: true, id: USER_ID, workspaceRole: USER_ROLE.ADMIN },
      { canReadSpace: true, id: 'worker', workspaceRole: USER_ROLE.WORKER },
      { canReadSpace: true, id: 'client', workspaceRole: USER_ROLE.CLIENT },
    ];
    const entry = (userId: string, role: 'editor' | 'full' | 'reader') => ({
      principal: { kind: 'user' as const, userId },
      role,
    });
    const setting = (permissions: ReturnType<typeof entry>[] | null): BlockOperation[] => [
      { blockId: 'p1', command: 'setPermissions', permissions },
    ];
    const admin = { ...asRole('ADMIN'), members };

    it('refuses a declaration after which nobody who can open the space holds full access', () => {
      expect(refusalOf(buildInput(setting([entry('worker', 'editor')]), [page, paragraph], admin))).toBe(
        'BLOCK_PERMISSIONS_LOCKOUT',
      );
      expect(refusalOf(buildInput(setting([entry('client', 'full')]), [page, paragraph], admin))).toBe(
        'BLOCK_PERMISSIONS_LOCKOUT',
      );
      expect(refusalOf(buildInput(setting([]), [page, paragraph], admin))).toBe('BLOCK_PERMISSIONS_LOCKOUT');
    });

    it('lets the declaration through while someone keeps full access, the actor or not', () => {
      expect(plannedOf(buildInput(setting([entry(USER_ID, 'full')]), [page, paragraph], admin)).writes).toHaveLength(1);
      expect(plannedOf(buildInput(setting([entry('worker', 'full')]), [page, paragraph], admin)).writes).toHaveLength(
        1,
      );
    });

    it('judges going back to inherit by what the ancestors declare', () => {
      const closedPage = buildPage({
        children: ['p1'],
        id: 'page-1',
        permissions: [entry('worker', 'editor')],
        version: 4,
      });
      const own = buildBlock({ id: 'p1', parentId: 'page-1', permissions: [entry(USER_ID, 'full')], version: 2 });

      expect(refusalOf(buildInput(setting(null), [closedPage, own], admin))).toBe('BLOCK_PERMISSIONS_LOCKOUT');
      expect(plannedOf(buildInput(setting(null), [page, own], admin)).writes).toHaveLength(1);
    });
  });

  describe('locked and trashed pages', () => {
    const edit: BlockOperation[] = [
      { bag: 'format', blockId: 'p1', command: 'replaceEntry', key: 'textColor', value: 'red' },
    ];

    it('refuses a write below a locked page and to the locked page itself', () => {
      const locked = buildPage({ children: ['p1'], id: 'page-1', lockedAt: NOW });
      const onPage: BlockOperation[] = [
        { bag: 'format', blockId: 'page-1', command: 'replaceEntry', key: 'open', value: true },
      ];

      expect(refusalOf(buildInput(edit, [locked, paragraph]))).toBe('PAGE_LOCKED');
      expect(refusalOf(buildInput(onPage, [locked]))).toBe('PAGE_LOCKED');
    });

    it('does not let a child page inherit the lock of its parent page', () => {
      const lockedParent = buildPage({ children: ['sub'], id: 'page-1', lockedAt: NOW });
      const sub = buildPage({ children: ['p1'], id: 'sub', parentId: 'page-1' });
      const inside = buildBlock({ id: 'p1', parentId: 'sub' });

      expect(
        plannedOf(
          buildInput(edit, [inside], {
            load: { context: [lockedParent, sub], isDepthExceeded: false, locked: [inside], spaces: [] },
          }),
        ).versions,
      ).toHaveLength(1);
    });

    it('refuses a write below a trashed page, even a context ancestor', () => {
      const trashed = buildPage({ children: ['p1'], id: 'page-1', lifecycle: 'TRASHED' });

      expect(
        refusalOf(
          buildInput(edit, [paragraph], {
            load: { context: [trashed], isDepthExceeded: false, locked: [paragraph], spaces: [] },
          }),
        ),
      ).toBe('PAGE_INVALID_LIFECYCLE');
    });

    it('refuses to create a block inside a locked page', () => {
      const locked = buildPage({ children: [], id: 'page-1', lockedAt: NOW });

      expect(refusalOf(buildInput([createParagraph('p2', 'page-1'), listAfter('page-1', 'p2')], [locked]))).toBe(
        'PAGE_LOCKED',
      );
    });
  });

  describe('moving a block', () => {
    const second = buildPage({ children: [], id: 'page-2', version: 1 });
    const move: BlockOperation[] = [
      { blockId: 'p1', command: 'patchFields', patch: { parentId: 'page-2' } },
      { blockId: 'page-1', childId: 'p1', command: 'removeChild' },
      listAfter('page-2', 'p1'),
    ];

    it('plans the block, both parents and a rebind of the links below it', () => {
      const result = plannedOf(buildInput(move, [page, paragraph, second]));

      expect(result.versions.map((entry) => entry.id).toSorted()).toEqual(['p1', 'page-1', 'page-2']);
      expect(result.rebinds).toEqual([{ rootBlockId: 'p1', sourcePageId: 'page-2' }]);
    });

    it('needs edit on the old and on the new parent', () => {
      const readOnlyTarget = buildPage({
        children: [],
        id: 'page-2',
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });
      const readOnlySource = buildPage({
        children: ['p1'],
        id: 'page-1',
        permissions: [{ principal: { kind: 'space' }, role: 'reader' }],
      });

      expect(refusalOf(buildInput(move, [page, paragraph, readOnlyTarget]))).toBe('BLOCK_EDIT_FORBIDDEN');
      expect(refusalOf(buildInput(move, [readOnlySource, paragraph, second]))).toBe('BLOCK_EDIT_FORBIDDEN');
    });

    it('refuses a move that leaves the block listed under its old parent', () => {
      expect(refusalOf(buildInput([move[0], move[2]] as BlockOperation[], [page, paragraph, second]))).toBe(
        'BLOCK_TREE_INVALID',
      );
    });

    it('refuses a move under the block itself or one of its descendants', () => {
      const parent = buildPage({ children: ['a'], id: 'a-parent' });
      const top = buildBlock({ children: ['child'], id: 'a', parentId: 'a-parent', type: 'toggle' });
      const child = buildBlock({ children: [], id: 'child', parentId: 'a', type: 'toggle' });
      const intoDescendant: BlockOperation[] = [
        { blockId: 'a', command: 'patchFields', patch: { parentId: 'child' } },
        { blockId: 'a-parent', childId: 'a', command: 'removeChild' },
        listAfter('child', 'a'),
      ];

      expect(refusalOf(buildInput(intoDescendant, [parent, top, child]))).toBe('BLOCK_CYCLE');
    });

    it('refuses a move to a parent of another space', () => {
      const foreign = buildPage({ children: [], id: 'page-2', spaceId: 'space-2' });

      expect(refusalOf(buildInput(move, [page, paragraph, foreign]))).toBe('BLOCK_ACCESS_DENIED');
    });
  });

  describe('links', () => {
    const mention = { insert: { mention: { label: 'Plan', pageId: 'target-1', spaceId: 'space-1' } } };

    it('drafts a mention link from the nearest page of the block', () => {
      const operations: BlockOperation[] = [
        {
          bag: 'properties',
          blockId: 'p1',
          command: 'replaceEntry',
          key: 'title',
          value: [{ insert: 'See ' }, mention],
        },
      ];

      const result = plannedOf(buildInput(operations, [page, paragraph]));

      expect(result.linkDrafts).toEqual([
        { kind: 'mention', sourceBlockId: 'p1', sourcePageId: 'page-1', targetBlockId: 'target-1' },
      ]);
      expect(result.linkSourceIds).toEqual(['p1']);
    });

    it('drafts no link for a removed block, but reconciles its source so the old ones go', () => {
      const withMention = buildBlock({ id: 'p1', parentId: 'page-1', properties: { title: [mention] } });
      const operations: BlockOperation[] = [
        { blockId: 'p1', command: 'patchFields', patch: { alive: false } },
        { blockId: 'page-1', childId: 'p1', command: 'removeChild' },
      ];

      const result = plannedOf(buildInput(operations, [page, withMention]));

      expect(result.linkDrafts).toEqual([]);
      expect(result.linkSourceIds).toEqual(['p1']);
    });
  });
});
