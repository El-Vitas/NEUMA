import { describe, expect, it } from 'bun:test';
import { EditorState } from 'prosemirror-state';
import { type Decoration, DecorationSet } from 'prosemirror-view';
import {
  createPageEditorRestrictedBlocksPlugin,
  readPageEditorRestrictedBlocks,
  restrictPageEditorBlocks,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-restricted.plugin.lib';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';

const buildState = (): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.nodeFromJSON({
      content: [
        { attrs: { id: 'open-block' }, content: [{ text: 'Open', type: 'text' }], type: 'paragraph' },
        { attrs: { id: 'closed-block' }, content: [{ text: 'Closed', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    }),
    plugins: [createPageEditorRestrictedBlocksPlugin()],
    schema: pageEditorSchema,
  });

const decorationsOf = (state: EditorState): Decoration[] => {
  const plugin = state.plugins[0];
  const set = plugin?.props.decorations?.call(plugin, state);
  return set instanceof DecorationSet ? set.find() : [];
};

describe('the lock on a block with its own access', () => {
  it('draws nothing until it is told which blocks are restricted', () => {
    expect(decorationsOf(buildState())).toEqual([]);
  });

  it('marks the restricted block and no other', () => {
    const state = buildState().apply(
      restrictPageEditorBlocks(buildState(), { ids: new Set(['closed-block']), label: 'Restricted block' }),
    );

    const marked = decorationsOf(state);
    const firstBlockSize = state.doc.child(0).nodeSize;
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.every((decoration) => decoration.from >= firstBlockSize)).toBe(true);
  });

  it('draws one lock inside the restricted block and remembers the words that describe it', () => {
    const state = buildState().apply(
      restrictPageEditorBlocks(buildState(), { ids: new Set(['closed-block']), label: 'Restricted block' }),
    );

    const locks = decorationsOf(state).filter((decoration) =>
      String(decoration.spec.key ?? '').startsWith('page-editor-restricted-block-'),
    );
    expect(locks).toHaveLength(1);
    expect(readPageEditorRestrictedBlocks(state)?.label).toBe('Restricted block');
  });

  it('stops marking a block once it is no longer in the set', () => {
    const marked = buildState().apply(
      restrictPageEditorBlocks(buildState(), { ids: new Set(['closed-block']), label: 'Restricted block' }),
    );

    const cleared = marked.apply(restrictPageEditorBlocks(marked, { ids: new Set(), label: 'Restricted block' }));

    expect(decorationsOf(cleared)).toEqual([]);
  });

  it('keeps the set while the document is edited', () => {
    const marked = buildState().apply(
      restrictPageEditorBlocks(buildState(), { ids: new Set(['closed-block']), label: 'Restricted block' }),
    );

    const edited = marked.apply(marked.tr.insertText('x', 2));

    expect(decorationsOf(edited).length).toBeGreaterThan(0);
  });
});
