import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { TextSelection } from 'prosemirror-state';
import { diffSnapshots } from '@/modules/pages/block-sync/lib/block-sync.diff.lib';
import { createBlockStore } from '@/modules/pages/block-sync/lib/block-sync.store.lib';
import type { BlockDiffInput, BlockOperationGroup } from '@/modules/pages/block-sync/types/block-sync.types';
import { movePageEditorBlockUp } from '@/modules/pages/editor/blocks/lib/pages.editor.block-move.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  describeOperations,
  documentOf,
  flattenGroups,
  heading,
  PAGE_ID,
  paragraph,
  readSnapshot,
  snapshotsOf,
  syncedBlocksOf,
  text,
} from '../block-sync.fixtures';

const diff = (
  before: PageContent,
  after: PageContent,
  knowledge: Pick<BlockDiffInput, 'buried' | 'canAnchor'> = {},
): readonly BlockOperationGroup[] => {
  const store = createBlockStore(syncedBlocksOf(before));
  return diffSnapshots({
    next: snapshotsOf(after),
    pageId: PAGE_ID,
    previous: snapshotsOf(before),
    text: store.textWriter,
    ...knowledge,
  });
};

const describeAll = (groups: readonly BlockOperationGroup[]): readonly string[] =>
  describeOperations(flattenGroups(groups));

const base = documentOf(paragraph('p1', text('Hello')), paragraph('p2', text('World')));
const withAdded = documentOf(
  paragraph('p1', text('Hello')),
  paragraph('p2', text('World')),
  paragraph('p3', text('Bloque nuevo')),
);

describe('a block that comes back after it was deleted', () => {
  const buried = new Map([['p3', readSnapshot(snapshotsOf(withAdded), 'p3')]]);

  it('is revived with an update and listed in its parent, never created again', () => {
    const groups = diff(base, withAdded, { buried });

    expect(describeAll(groups)).toEqual(['update:p3:', `listAfter:${PAGE_ID}:children`]);
    expect(flattenGroups(groups)[0]?.args).toEqual({ alive: true, parentId: PAGE_ID });
    expect(flattenGroups(groups)[1]?.args).toEqual({ after: 'p2', id: 'p3' });
  });

  it('is revived under the parent it has now when it comes back somewhere else', () => {
    const before = documentOf(
      { attrs: { id: 't1', open: true, summary: 'More' }, content: [paragraph('x', text('inside'))], type: 'toggle' },
      paragraph('p2', text('World')),
    );
    const buriedHere = new Map([['p3', readSnapshot(snapshotsOf(withAdded), 'p3')]]);
    const after = documentOf(
      {
        attrs: { id: 't1', open: true, summary: 'More' },
        content: [paragraph('x', text('inside')), paragraph('p3', text('Bloque nuevo'))],
        type: 'toggle',
      },
      paragraph('p2', text('World')),
    );

    const groups = diff(before, after, { buried: buriedHere });

    expect(flattenGroups(groups)[0]?.args).toEqual({ alive: true, parentId: 't1' });
    expect(describeAll(groups)).toContain('listAfter:t1:children');
  });

  it('also sends what changed in it since it was deleted', () => {
    const store = createBlockStore(syncedBlocksOf(withAdded));
    const edited = documentOf(
      paragraph('p1', text('Hello')),
      paragraph('p2', text('World')),
      paragraph('p3', text('Bloque nuevo!')),
    );

    const groups = diffSnapshots({
      buried,
      next: snapshotsOf(edited),
      pageId: PAGE_ID,
      previous: snapshotsOf(base),
      text: store.textWriter,
    });

    expect(describeAll(groups)).toEqual(['update:p3:', 'applyText:p3:', `listAfter:${PAGE_ID}:children`]);
  });

  it('is created when nothing says it ever existed', () => {
    expect(describeAll(diff(base, withAdded))).toContain('set:p3:');
  });
});

describe('where a block is listed when its neighbours are not on the server', () => {
  const neighbours = documentOf(paragraph('a', text('1')), paragraph('d', text('2')), paragraph('c', text('3')));

  it('goes after the nearest sibling that is, skipping a dead neighbour', () => {
    const after = documentOf(
      paragraph('a', text('1')),
      paragraph('d', text('2')),
      paragraph('n', text('new')),
      paragraph('c', text('3')),
    );

    const groups = diff(neighbours, after, { canAnchor: (blockId) => blockId !== 'd' });

    const listing = flattenGroups(groups).find((operation) => operation.command === 'listAfter');
    expect(listing?.args).toEqual({ after: 'a', id: 'n' });
  });

  it('goes before the nearest sibling after it when none before is on the server', () => {
    const before = documentOf(paragraph('d', text('2')), paragraph('c', text('3')));
    const after = documentOf(paragraph('d', text('2')), paragraph('n', text('new')), paragraph('c', text('3')));

    const groups = diff(before, after, { canAnchor: (blockId) => blockId !== 'd' });

    const listing = flattenGroups(groups).find((operation) => operation.command === 'listBefore');
    expect(listing?.args).toEqual({ before: 'c', id: 'n' });
  });

  it('goes first when no sibling at all is on the server', () => {
    const before = documentOf(paragraph('d', text('2')));
    const after = documentOf(paragraph('d', text('2')), paragraph('n', text('new')));

    const groups = diff(before, after, { canAnchor: (blockId) => blockId !== 'd' });

    const listing = flattenGroups(groups).find((operation) => operation.pointer.id === PAGE_ID);
    expect(listing?.command).toBe('listBefore');
    expect(listing?.args).toEqual({ id: 'n' });
  });

  it('takes a block made in the same change as an anchor, since it is made first', () => {
    const before = documentOf(paragraph('a', text('1')));
    const after = documentOf(paragraph('a', text('1')), paragraph('n1', text('one')), paragraph('n2', text('two')));

    const groups = diff(before, after, { canAnchor: (blockId) => blockId === 'a' });

    const listings = flattenGroups(groups)
      .filter((operation) => operation.command === 'listAfter')
      .map((operation) => operation.args);
    expect(listings).toEqual([
      { after: 'a', id: 'n1' },
      { after: 'n1', id: 'n2' },
    ]);
  });
});

describe('moving a block up with the editor shortcut', () => {
  it('lists it again after a block that is there, in one operation', () => {
    const before = documentOf(paragraph('p1', text('One')), paragraph('p2', text('Two')), heading('h1', 2, 'Title'));
    const state = createPageEditorState(before, 'Select', 'Insert');
    const headingStart = state.doc.child(0).nodeSize + state.doc.child(1).nodeSize + 1;
    const inHeading = state.apply(state.tr.setSelection(TextSelection.create(state.doc, headingStart)));
    let moved = inHeading;
    movePageEditorBlockUp(inHeading, (transaction) => {
      moved = inHeading.apply(transaction);
    });

    const groups = diff(before, serializePageEditorState(moved));

    expect(describeAll(groups)).toEqual([`listAfter:${PAGE_ID}:children`]);
    expect(flattenGroups(groups)[0]?.args).toEqual({ after: 'p1', id: 'h1' });
  });
});
