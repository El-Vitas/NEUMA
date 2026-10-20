import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { diffSnapshots } from '@/modules/pages/block-sync/lib/block-sync.diff.lib';
import { createBlockStore } from '@/modules/pages/block-sync/lib/block-sync.store.lib';
import type { BlockOperationGroup } from '@/modules/pages/block-sync/types/block-sync.types';
import {
  bold,
  bulletList,
  describeOperations,
  documentOf,
  flattenGroups,
  heading,
  listItem,
  PAGE_ID,
  paragraph,
  snapshotsOf,
  syncedBlocksOf,
  table,
  tableCell,
  tableRow,
  taskItem,
  taskList,
  text,
  toggle,
} from '../block-sync.fixtures';

const diff = (before: PageContent, after: PageContent): readonly BlockOperationGroup[] => {
  const store = createBlockStore(syncedBlocksOf(before));
  return diffSnapshots({
    next: snapshotsOf(after),
    pageId: PAGE_ID,
    previous: snapshotsOf(before),
    text: store.textWriter,
  });
};

const describeAll = (groups: readonly BlockOperationGroup[]): readonly string[] =>
  describeOperations(flattenGroups(groups));

describe('diffSnapshots', () => {
  it('sends nothing when the document did not change', () => {
    const content = documentOf(paragraph('p1', text('Hello')));

    expect(diff(content, content)).toEqual([]);
  });

  it('sends only the text update when typing in a paragraph', () => {
    const groups = diff(documentOf(paragraph('p1', text('Hello'))), documentOf(paragraph('p1', text('Hello!'))));

    expect(describeAll(groups)).toEqual(['applyText:p1:']);
    const [operation] = flattenGroups(groups);
    expect(operation?.args).toMatchObject({ property: 'title' });
  });

  it('sends the text update when only a mark changes', () => {
    const groups = diff(documentOf(paragraph('p1', text('Hello'))), documentOf(paragraph('p1', bold('Hello'))));

    expect(describeAll(groups)).toEqual(['applyText:p1:']);
  });

  it('creates the new block and lists it after its neighbour when pressing Enter', () => {
    const groups = diff(
      documentOf(paragraph('p1', text('Hello world'))),
      documentOf(paragraph('p1', text('Hello')), paragraph('p2', text(' world'))),
    );

    expect(describeAll(groups)).toEqual(['applyText:p1:', 'set:p2:', 'applyText:p2:', `listAfter:${PAGE_ID}:children`]);
    const listing = flattenGroups(groups).at(-1);
    expect(listing?.args).toEqual({ after: 'p1', id: 'p2' });
  });

  it('creates an empty block with no text update', () => {
    const groups = diff(
      documentOf(paragraph('p1', text('Hello'))),
      documentOf(paragraph('p1', text('Hello')), paragraph('p2')),
    );

    expect(describeAll(groups)).toEqual(['set:p2:', `listAfter:${PAGE_ID}:children`]);
    const creation = flattenGroups(groups)[0];
    expect(creation?.args).toMatchObject({ id: 'p2', parentId: PAGE_ID, properties: { title: [] }, type: 'paragraph' });
  });

  it('lists a block placed first before the block that was first', () => {
    const groups = diff(
      documentOf(paragraph('p1', text('a'))),
      documentOf(paragraph('p0'), paragraph('p1', text('a'))),
    );

    const listing = flattenGroups(groups).at(-1);
    expect(listing?.command).toBe('listBefore');
    expect(listing?.args).toEqual({ before: 'p1', id: 'p0' });
  });

  it('marks a deleted block dead and removes it from its parent', () => {
    const before = documentOf(paragraph('p1', text('a')), paragraph('p2', text('b')), paragraph('p3', text('c')));
    const after = documentOf(paragraph('p1', text('a')), paragraph('p3', text('c')));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual(['update:p2:', `listRemove:${PAGE_ID}:children`]);
    expect(flattenGroups(groups)[0]?.args).toEqual({ alive: false });
    expect(flattenGroups(groups)[1]?.args).toEqual({ id: 'p2' });
  });

  it('marks every block of a deleted subtree dead', () => {
    const before = documentOf(paragraph('p1', text('a')), toggle('t1', 'More', paragraph('p2', text('inside'))));
    const after = documentOf(paragraph('p1', text('a')));

    const operations = describeAll(diff(before, after));

    expect(operations).toContain('update:t1:');
    expect(operations).toContain('update:p2:');
    expect(operations).toContain(`listRemove:${PAGE_ID}:children`);
    expect(operations).toContain('listRemove:t1:children');
  });

  it('moves a block down with a single list operation', () => {
    const before = documentOf(paragraph('a', text('1')), paragraph('b', text('2')), paragraph('c', text('3')));
    const after = documentOf(paragraph('b', text('2')), paragraph('a', text('1')), paragraph('c', text('3')));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual([`listBefore:${PAGE_ID}:children`]);
    expect(flattenGroups(groups)[0]?.args).toEqual({ before: 'a', id: 'b' });
  });

  it('moves a block up with a single list operation', () => {
    const before = documentOf(paragraph('a', text('1')), paragraph('b', text('2')), paragraph('c', text('3')));
    const after = documentOf(paragraph('a', text('1')), paragraph('c', text('3')), paragraph('b', text('2')));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual([`listAfter:${PAGE_ID}:children`]);
    expect(flattenGroups(groups)[0]?.args).toEqual({ after: 'a', id: 'c' });
  });

  it('moves a block into a toggle by changing its parent and both lists', () => {
    const before = documentOf(paragraph('a', text('1')), toggle('t1', 'More', paragraph('x', text('inside'))));
    const after = documentOf(toggle('t1', 'More', paragraph('x', text('inside')), paragraph('a', text('1'))));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual(['update:a:', `listRemove:${PAGE_ID}:children`, 'listAfter:t1:children']);
    expect(flattenGroups(groups)[0]?.args).toEqual({ parentId: 't1' });
    expect(flattenGroups(groups)[2]?.args).toEqual({ after: 'x', id: 'a' });
  });

  it('moves a block out of a toggle back to the page', () => {
    const before = documentOf(toggle('t1', 'More', paragraph('x', text('inside')), paragraph('a', text('1'))));
    const after = documentOf(toggle('t1', 'More', paragraph('x', text('inside'))), paragraph('a', text('1')));

    const operations = describeAll(diff(before, after));

    expect(operations).toEqual(['update:a:', 'listRemove:t1:children', `listAfter:${PAGE_ID}:children`]);
  });

  it('nests a block under a list item', () => {
    const before = documentOf(
      bulletList(listItem('l1', paragraph('lp1', text('one'))), listItem('l2', paragraph('lp2', text('two')))),
    );
    const after = documentOf(
      bulletList(
        listItem('l1', paragraph('lp1', text('one')), bulletList(listItem('l2', paragraph('lp2', text('two'))))),
      ),
    );

    const operations = describeAll(diff(before, after));

    expect(operations).toContain('update:l2:');
    expect(operations).toContain(`listRemove:${PAGE_ID}:children`);
    expect(operations).toContain('listAfter:l1:children');
  });

  it('writes the new level when a heading changes level', () => {
    const groups = diff(documentOf(heading('h1', 1, 'Title')), documentOf(heading('h1', 2, 'Title')));

    expect(describeAll(groups)).toEqual(['update:h1:properties']);
    expect(flattenGroups(groups)[0]?.args).toEqual({ level: 2 });
  });

  it('writes the type when a block changes type', () => {
    const groups = diff(documentOf(paragraph('p1', text('Title'))), documentOf(heading('p1', 1, 'Title')));

    expect(describeAll(groups)).toContain('update:p1:');
    expect(flattenGroups(groups)[0]?.args).toMatchObject({ type: 'heading' });
  });

  it('writes the checked state when a to-do is toggled', () => {
    const before = documentOf(taskList(taskItem('t1', false, paragraph('tp1', text('Buy milk')))));
    const after = documentOf(taskList(taskItem('t1', true, paragraph('tp1', text('Buy milk')))));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual(['update:t1:properties']);
    expect(flattenGroups(groups)[0]?.args).toEqual({ checked: true });
  });

  it('deletes a format key by sending null', () => {
    const before = documentOf({
      attrs: { id: 'p1', textColor: 'red' },
      content: [text('Hello')],
      type: 'paragraph',
    });
    const after = documentOf(paragraph('p1', text('Hello')));

    const groups = diff(before, after);

    expect(describeAll(groups)).toEqual(['update:p1:format']);
    expect(flattenGroups(groups)[0]?.args).toEqual({ textColor: null });
  });

  it('creates a table row, its cells and their content parent first', () => {
    const before = documentOf(table('tb', tableRow('r1', tableCell('c1', paragraph('cp1', text('a'))))));
    const after = documentOf(
      table(
        'tb',
        tableRow('r1', tableCell('c1', paragraph('cp1', text('a')))),
        tableRow('r2', tableCell('c2', paragraph('cp2', text('b')))),
      ),
    );

    const operations = describeAll(diff(before, after));

    expect(operations).toEqual([
      'set:r2:',
      'listAfter:tb:children',
      'set:c2:',
      'listAfter:r2:children',
      'set:cp2:',
      'applyText:cp2:',
      'listAfter:c2:children',
    ]);
  });

  it('creates every block of a paste, each listed after the previous one', () => {
    const before = documentOf(paragraph('p1', text('a')));
    const after = documentOf(
      paragraph('p1', text('a')),
      paragraph('n1', text('one')),
      paragraph('n2', text('two')),
      paragraph('n3', text('three')),
    );

    const groups = diff(before, after);

    expect(groups).toHaveLength(3);
    const listings = flattenGroups(groups)
      .filter((operation) => operation.command === 'listAfter')
      .map((operation) => operation.args);
    expect(listings).toEqual([
      { after: 'p1', id: 'n1' },
      { after: 'n1', id: 'n2' },
      { after: 'n2', id: 'n3' },
    ]);
  });

  it('keeps the groups of one block together so that they can be split between transactions', () => {
    const groups = diff(
      documentOf(paragraph('p1', text('a'))),
      documentOf(paragraph('p1', text('a')), paragraph('n1', text('one'))),
    );

    expect(groups).toHaveLength(1);
    expect(describeOperations(groups[0] ?? [])).toEqual(['set:n1:', 'applyText:n1:', `listAfter:${PAGE_ID}:children`]);
  });

  it('writes a text it has no Yjs history of as a plain property update', () => {
    const before = documentOf(paragraph('p1', text('Hello')));
    const store = createBlockStore(
      syncedBlocksOf(before).map((block) => (block.id === 'p1' ? { ...block, textState: null } : block)),
    );

    const groups = diffSnapshots({
      next: snapshotsOf(documentOf(paragraph('p1', text('Hello!')))),
      pageId: PAGE_ID,
      previous: snapshotsOf(before),
      text: store.textWriter,
    });

    expect(describeAll(groups)).toEqual(['update:p1:properties']);
    expect(flattenGroups(groups)[0]?.args).toEqual({ title: [{ insert: 'Hello!' }] });
  });
});
