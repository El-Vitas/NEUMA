import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import type { EditorState } from 'prosemirror-state';
import { NodeSelection } from 'prosemirror-state';
import { createPageBlockAlignmentCommand, readPageBlockAlignment } from '@/modules/pages/lib/pages.editor.align.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const imagePage = (attrs: Record<string, unknown> = {}): PageContent =>
  ({
    content: [{ attrs: { assetId: 'asset-1', ...attrs }, type: 'image' }],
    schemaVersion: 1,
    type: 'doc',
  }) as PageContent;

const paragraphPage: PageContent = {
  content: [{ content: [{ text: 'Suelto', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const withTheBlockSelected = (content: PageContent): EditorState => {
  const state = createPageEditorState(content, 'Select block');
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
};

const run = (content: PageContent, align: 'left' | 'center' | 'right' | 'full'): EditorState | null => {
  const state = withTheBlockSelected(content);
  let next: EditorState | null = null;
  createPageBlockAlignmentCommand(align)(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

describe('where an image stands', () => {
  it('is nothing until it is placed, which is where a page puts it by default', () => {
    expect(readPageBlockAlignment(withTheBlockSelected(imagePage()))?.chosen).toBeNull();
  });

  it('is read back from the block once it has been placed', () => {
    expect(readPageBlockAlignment(withTheBlockSelected(imagePage({ align: 'right' })))?.chosen).toBe('right');
  });

  it('says nothing about a block that is not an image, so nothing is offered for it', () => {
    expect(readPageBlockAlignment(withTheBlockSelected(paragraphPage))).toBeNull();
  });
});

describe('placing an image', () => {
  it('writes where it stands into the block, where the page keeps it', () => {
    const next = run(imagePage(), 'center');
    if (next === null) throw new Error('the image was not placed');

    expect(next.doc.child(0).attrs.align).toBe('center');
    expect(serializePageEditorState(next).content[0]).toMatchObject({ attrs: { align: 'center' }, type: 'image' });
  });

  /** Standing at full width is standing at the left with all of the room. */
  it('gives it all the room when asked for full width, and leaves it on a side to come back to', () => {
    const next = run(imagePage(), 'full');
    if (next === null) throw new Error('the image was not widened');

    expect(next.doc.child(0).attrs.width).toBe(1);
    expect(next.doc.child(0).attrs.align).toBe('left');
  });

  it('leaves alone a block that is not an image', () => {
    expect(run(paragraphPage, 'center')).toBeNull();
  });
});
