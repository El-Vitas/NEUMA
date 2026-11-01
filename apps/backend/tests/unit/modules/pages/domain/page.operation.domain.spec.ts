import { describe, expect, it } from 'bun:test';
import { type BlockTree, documentToBlocks, type PageContent } from '@neuma/shared';
import type { BlockOperation } from '@/modules/blocks/domain/block.transaction.domain.types';
import { parseTrustedBlockOperations } from '@/modules/blocks/utils/block.operation.utils';
import type { PageContentBlock, PageContentSnapshot } from '@/modules/pages/domain/page.block.domain.types';
import {
  buildCreatePageOperations,
  buildLifecycleOperation,
  buildLockOperation,
  buildMoveOperations,
  buildOwnerOperation,
  buildReorderOperation,
  buildSpaceMoveOperation,
  buildTitleOperation,
  buildValueChangeOperations,
  buildVerificationOperation,
  diffPageValues,
  planContentOperations,
} from '@/modules/pages/domain/page.operation.domain';

const SPACE_ID = 'space-1';
const PAGE_ID = 'page-1';
const TOP = { parentId: null, spaceId: SPACE_ID };
const under = (parentId: string) => ({ parentId, spaceId: SPACE_ID });

const paragraphNode = (id: string, text: string) => ({
  attrs: { id },
  content: [{ text, type: 'text' as const }],
  type: 'paragraph' as const,
});

const documentSaying = (...paragraphs: readonly (readonly [string, string])[]): PageContent => ({
  content: paragraphs.map(([id, text]) => paragraphNode(id, text)),
  schemaVersion: 1,
  type: 'doc',
});

const buildTree = (content: PageContent, parentId: null | string = null): BlockTree => {
  const converted = documentToBlocks({
    content,
    cover: null,
    icon: null,
    pageId: PAGE_ID,
    parentId,
    propertyValues: null,
    spaceId: SPACE_ID,
    title: 'Plan',
  });
  if (converted.isFail()) throw converted.getError();
  return converted.getValue();
};

const toStoredBlock = (draft: BlockTree['blocks'][number]): PageContentBlock => ({
  children: draft.children,
  editedAt: new Date('2026-10-20T00:00:00.000Z'),
  editedById: 'user-1',
  format: draft.format,
  id: draft.id,
  parentId: draft.parentId,
  permissions: null,
  properties: draft.properties,
  type: draft.type,
});

const snapshotOf = (
  tree: BlockTree,
  pageChildren: readonly string[] = tree.page.children,
  removed: readonly PageContentBlock[] = [],
): PageContentSnapshot => ({
  blocks: tree.blocks.map(toStoredBlock),
  pageChildren,
  pageId: PAGE_ID,
  removed,
});

const describeOperation = (operation: { command: string; path: readonly string[]; pointer: { id: string } }) =>
  `${operation.command} ${operation.pointer.id} ${operation.path.join('.')}`.trim();

const parseAll = (operations: readonly unknown[]): BlockOperation[] => {
  const parsed = parseTrustedBlockOperations(operations);
  if (parsed.isFail()) throw parsed.getError();
  return parsed.getValue();
};

describe('creating a page as operations', () => {
  const content = documentSaying(['block-a', 'Uno'], ['block-b', 'Dos']);

  it('creates the page and each of its blocks, then lists the children of each parent in order', () => {
    const operations = buildCreatePageOperations(buildTree(content, 'parent-1'), { afterSiblingId: 'sibling-1' });

    expect(operations.map(describeOperation)).toEqual([
      `set ${PAGE_ID}`,
      'set block-a',
      'set block-b',
      `listAfter ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
      'listAfter parent-1 children',
    ]);
    expect(operations.at(-1)?.args).toEqual({ after: 'sibling-1', id: PAGE_ID });
    expect(operations.at(3)?.args).toEqual({ id: 'block-a' });
  });

  it('stores the title of the page as plain text on the page block', () => {
    const [pageOperation] = buildCreatePageOperations(buildTree(content), { afterSiblingId: null });

    expect(pageOperation?.args).toMatchObject({
      id: PAGE_ID,
      parentId: null,
      properties: { title: [{ insert: 'Plan' }] },
      type: 'page',
    });
  });

  it('puts a page without a parent at the root without listing it anywhere', () => {
    const operations = buildCreatePageOperations(buildTree(content), { afterSiblingId: null });

    expect(operations.filter((operation) => operation.pointer.id === 'parent-1')).toEqual([]);
  });

  it('produces operations the blocks module reads', () => {
    const operations = buildCreatePageOperations(buildTree(content, 'parent-1'), { afterSiblingId: null });

    expect(parseAll(operations).map((operation) => operation.command)).toEqual([
      'create',
      'create',
      'create',
      'insertChild',
      'insertChild',
      'insertChild',
    ]);
  });
});

describe('the operations on the columns of a page', () => {
  it('writes the title as a rich text entry and an empty title as an empty list', () => {
    expect(buildTitleOperation(PAGE_ID, 'Nuevo').args).toEqual([{ insert: 'Nuevo' }]);
    expect(buildTitleOperation(PAGE_ID, '').args).toEqual([]);
  });

  it('reads back as the commands the blocks module has for a page', () => {
    const operations = parseAll([
      buildLockOperation(PAGE_ID, true),
      buildVerificationOperation(PAGE_ID, true, new Date('2027-01-01T00:00:00.000Z')),
      buildOwnerOperation(PAGE_ID, 'user-2'),
      buildLifecycleOperation(PAGE_ID, 'ACTIVE', 'parent-1'),
      buildSpaceMoveOperation(PAGE_ID, { parentId: 'parent-2', spaceId: 'space-2' }, null),
      ...buildValueChangeOperations(PAGE_ID, { status: 'done', stale: null }),
    ]);

    expect(operations).toEqual([
      { blockId: PAGE_ID, command: 'setLock', isLocked: true },
      {
        blockId: PAGE_ID,
        command: 'setVerification',
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
        isVerified: true,
      },
      { blockId: PAGE_ID, command: 'setOwner', ownerId: 'user-2' },
      { blockId: PAGE_ID, command: 'setLifecycle', detachFromParentId: 'parent-1', lifecycle: 'ACTIVE' },
      {
        afterId: null,
        blockId: PAGE_ID,
        command: 'moveToSpaceRoot',
        detachFromParentId: null,
        parentId: 'parent-2',
        spaceId: 'space-2',
      },
      { blockId: PAGE_ID, command: 'mergePageValues', values: { stale: null, status: 'done' } },
    ]);
  });

  it('sends no operation for values that did not change', () => {
    expect(buildValueChangeOperations(PAGE_ID, diffPageValues({ status: 'todo' }, { status: 'todo' }))).toEqual([]);
  });

  it('sends only what changed, and a removed value as null', () => {
    expect(diffPageValues({ gone: 'x', kept: 'y', status: 'todo' }, { kept: 'y', status: 'done' })).toEqual({
      gone: null,
      status: 'done',
    });
    expect(diffPageValues(null, { status: 'done' })).toEqual({ status: 'done' });
    expect(diffPageValues({ status: 'done' }, null)).toEqual({ status: null });
  });
});

describe('moving and ordering a page among its siblings', () => {
  it('takes the page out of the list of the old parent and puts it last in the list of the new one', () => {
    const operations = buildMoveOperations(PAGE_ID, under('old-parent'), under('new-parent'));

    expect(operations.map(describeOperation)).toEqual([
      `update ${PAGE_ID}`,
      'listRemove old-parent children',
      'listAfter new-parent children',
    ]);
    expect(operations.at(0)?.args).toEqual({ parentId: 'new-parent' });
    expect(operations.at(2)?.args).toEqual({ id: PAGE_ID });
  });

  it('moves through the list of the space for a page that comes from, or goes to, the top of a space', () => {
    const fromTop = buildMoveOperations(PAGE_ID, TOP, under('new-parent'));
    const toTop = buildMoveOperations(PAGE_ID, under('old-parent'), TOP);

    expect(fromTop.map(describeOperation)).toEqual([
      `update ${PAGE_ID}`,
      `listRemove ${SPACE_ID} rootPageIds`,
      'listAfter new-parent children',
    ]);
    expect(toTop.map(describeOperation)).toEqual([
      `update ${PAGE_ID}`,
      'listRemove old-parent children',
      `listAfter ${SPACE_ID} rootPageIds`,
    ]);
    expect(toTop.at(2)?.pointer).toEqual({ id: SPACE_ID, table: 'space' });
  });

  it('places a page before a sibling, or last when no sibling is named', () => {
    expect(buildReorderOperation(under('parent-1'), PAGE_ID, 'sibling-1')).toMatchObject({
      args: { before: 'sibling-1', id: PAGE_ID },
      command: 'listBefore',
    });
    expect(buildReorderOperation(under('parent-1'), PAGE_ID, null)).toMatchObject({
      args: { id: PAGE_ID },
      command: 'listAfter',
    });
  });

  it('orders the top-level pages through the list of the space', () => {
    expect(buildReorderOperation(TOP, PAGE_ID, 'sibling-1')).toMatchObject({
      args: { before: 'sibling-1', id: PAGE_ID },
      command: 'listBefore',
      path: ['rootPageIds'],
      pointer: { id: SPACE_ID, table: 'space' },
    });
  });

  it('reads back, for the blocks module, as the placement of a page in a list of the space', () => {
    const [placed, removed] = parseAll([
      buildReorderOperation(TOP, PAGE_ID, 'sibling-1'),
      buildMoveOperations(PAGE_ID, TOP, under('new-parent')).at(1),
    ]);

    expect(placed).toMatchObject({ blockId: PAGE_ID, command: 'insertRoot', spaceId: SPACE_ID });
    expect(removed).toEqual({ blockId: PAGE_ID, command: 'removeRoot', spaceId: SPACE_ID });
  });
});

describe('turning the blocks of a page into the ones of a document', () => {
  const current = buildTree(documentSaying(['block-a', 'Uno'], ['block-b', 'Dos'], ['block-c', 'Tres']));

  it('sends nothing when the document says what the page already says', () => {
    const same = buildTree(documentSaying(['block-a', 'Uno'], ['block-b', 'Dos'], ['block-c', 'Tres']));

    expect(planContentOperations(snapshotOf(current), same)).toEqual([]);
  });

  it('creates what is new and only places what follows the last block that kept its place', () => {
    const appended = buildTree(
      documentSaying(['block-a', 'Uno'], ['block-b', 'Dos'], ['block-c', 'Tres'], ['block-d', 'Cuatro']),
    );

    const operations = planContentOperations(snapshotOf(current), appended);

    expect(operations.map(describeOperation)).toEqual(['set block-d', `listAfter ${PAGE_ID} children`]);
    expect(operations.at(1)?.args).toEqual({ after: 'block-c', id: 'block-d' });
  });

  it('updates only the fields that changed', () => {
    const edited = buildTree(documentSaying(['block-a', 'Uno'], ['block-b', 'Otro texto'], ['block-c', 'Tres']));

    const operations = planContentOperations(snapshotOf(current), edited);

    expect(operations.map(describeOperation)).toEqual(['update block-b']);
    expect(operations.at(0)?.args).toEqual({ properties: { title: [{ insert: 'Otro texto' }] } });
  });

  it('removes what the document no longer has and takes it out of the list that held it', () => {
    const shorter = buildTree(documentSaying(['block-a', 'Uno'], ['block-c', 'Tres']));

    const operations = planContentOperations(snapshotOf(current), shorter);

    expect(operations.map(describeOperation)).toEqual(['update block-b', `listRemove ${PAGE_ID} children`]);
    expect(operations.at(0)?.args).toEqual({ alive: false });
    expect(operations.at(1)?.args).toEqual({ id: 'block-b' });
  });

  it('places again from the first block that is not where it should be', () => {
    const reordered = buildTree(documentSaying(['block-c', 'Tres'], ['block-a', 'Uno'], ['block-b', 'Dos']));

    const operations = planContentOperations(snapshotOf(current), reordered);

    expect(operations.map(describeOperation)).toEqual([
      `listBefore ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
    ]);
    expect(operations.map((operation) => operation.args)).toEqual([
      { id: 'block-c' },
      { after: 'block-c', id: 'block-a' },
      { after: 'block-a', id: 'block-b' },
    ]);
  });

  it('leaves alone the pages the page block lists after its content blocks', () => {
    const appended = buildTree(
      documentSaying(['block-a', 'Uno'], ['block-b', 'Dos'], ['block-c', 'Tres'], ['block-d', 'Z']),
    );
    const snapshot = snapshotOf(current, ['block-a', 'block-b', 'block-c', 'child-page']);

    const operations = planContentOperations(snapshot, appended);

    expect(operations.some((operation) => operation.args === undefined)).toBe(false);
    expect(operations.map((operation) => operation.args)).not.toContainEqual({ id: 'child-page' });
    expect(operations.map(describeOperation)).toEqual(['set block-d', `listAfter ${PAGE_ID} children`]);
  });

  it('brings back a removed block the document names again, with its own id', () => {
    const withoutB = buildTree(documentSaying(['block-a', 'Uno'], ['block-c', 'Tres']));
    const draftB = current.blocks.find((draft) => draft.id === 'block-b');
    if (draftB === undefined) throw new Error('The tree has no block-b');
    const removedB: PageContentBlock = { ...toStoredBlock(draftB), children: [] };
    const snapshot = snapshotOf(withoutB, ['block-a', 'block-c'], [removedB]);

    const operations = planContentOperations(snapshot, current);

    expect(operations.map(describeOperation)).toEqual([
      'update block-b',
      `listAfter ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
    ]);
    expect(operations.at(0)?.args).toEqual({ alive: true });
    expect(operations.map((operation) => operation.args).slice(1)).toEqual([
      { after: 'block-a', id: 'block-b' },
      { after: 'block-b', id: 'block-c' },
    ]);
  });

  it('moves a block under another parent by its parent field and the lists of both parents', () => {
    const quoted = buildTree({
      content: [
        paragraphNode('block-a', 'Uno'),
        { attrs: { id: 'block-q' }, content: [paragraphNode('block-b', 'Dos')], type: 'blockquote' },
        paragraphNode('block-c', 'Tres'),
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    const operations = planContentOperations(snapshotOf(current), quoted);

    expect(operations.map(describeOperation)).toEqual([
      'set block-q',
      'update block-b',
      `listRemove ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
      `listAfter ${PAGE_ID} children`,
      'listBefore block-q children',
    ]);
    expect(operations.at(1)?.args).toEqual({ parentId: 'block-q' });
  });

  it('produces operations the blocks module reads', () => {
    const shorter = buildTree(documentSaying(['block-c', 'Tres'], ['block-e', 'Nuevo']));

    const operations = planContentOperations(snapshotOf(current), shorter);

    expect(parseAll(operations).length).toBe(operations.length);
  });
});
