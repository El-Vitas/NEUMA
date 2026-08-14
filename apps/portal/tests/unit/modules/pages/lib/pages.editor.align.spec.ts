import { describe, expect, it } from 'bun:test';
import type { PageBlockAlignment } from '@company-brain/shared';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { createPageBlockAlignmentCommand, readPageBlockAlignment } from '@/modules/pages/lib/pages.editor.align.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

const pageHolding = (type: string, attrs: Record<string, unknown>): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.node('doc', null, [pageEditorSchema.node(type, { assetId: 'asset-1', ...attrs })]),
    schema: pageEditorSchema,
  });

const withTheBlockSelected = (state: EditorState): EditorState =>
  state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));

const standing = (state: EditorState, align: PageBlockAlignment): Record<string, unknown> => {
  let next = state;
  createPageBlockAlignmentCommand(align)(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next.doc.child(0).attrs;
};

describe('where a block that is not writing stands in the column', () => {
  it('says where the selected block stands, and nothing for a block that cannot stand anywhere', () => {
    expect(readPageBlockAlignment(withTheBlockSelected(pageHolding('video', { align: 'right' })))?.chosen).toBe(
      'right',
    );
    expect(readPageBlockAlignment(withTheBlockSelected(pageHolding('audio', {})))?.chosen).toBeNull();
    expect(readPageBlockAlignment(withTheBlockSelected(pageHolding('image', { align: 'center' })))?.chosen).toBe(
      'center',
    );
  });

  it('stands a player where it was asked to stand', () => {
    expect(standing(withTheBlockSelected(pageHolding('audio', {})), 'center')).toMatchObject({ align: 'center' });
    expect(standing(withTheBlockSelected(pageHolding('video', {})), 'right')).toMatchObject({ align: 'right' });
  });

  /** Standing at full width is standing at the left with all of the room, so both are said at once. */
  it('reads taking the whole column as standing at the left with all of it', () => {
    expect(standing(withTheBlockSelected(pageHolding('video', { align: 'right' })), 'full')).toMatchObject({
      align: 'left',
      width: 1,
    });
  });

  it('refuses to stand a paragraph anywhere', () => {
    const writing = EditorState.create({ schema: pageEditorSchema });

    expect(readPageBlockAlignment(writing)).toBeNull();
    expect(createPageBlockAlignmentCommand('center')(writing)).toBe(false);
  });
});
