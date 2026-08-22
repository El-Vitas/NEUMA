import { describe, expect, it } from 'bun:test';
import { TextSelection } from 'prosemirror-state';
import { DecorationSet } from 'prosemirror-view';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { createPageEditorPlaceholderPlugin } from '@/modules/pages/editor/lib/pages.editor.placeholder.plugin.lib';
import type { PageContent } from '@/modules/pages/types/pages.types';

const buildState = (content: PageContent) => createPageEditorState(content, 'Select block');

const emptyDocument: PageContent = {
  content: [{ content: [], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

const writtenDocument: PageContent = {
  content: [{ content: [{ text: 'Ya escrito', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
};

const readDecorations = (placeholder: string, content: PageContent, at = 1): DecorationSet => {
  const state = buildState(content);
  const placed = state.apply(state.tr.setSelection(TextSelection.create(state.doc, at)));
  const plugin = createPageEditorPlaceholderPlugin(placeholder);
  const decorations = plugin.props.decorations?.call(plugin, placed);
  return decorations instanceof DecorationSet ? decorations : DecorationSet.empty;
};

describe('createPageEditorPlaceholderPlugin', () => {
  it('offers the invitation on the empty block the cursor is standing on', () => {
    const decorations = readDecorations('Escribe aqui', emptyDocument);

    expect(decorations.find()).toHaveLength(1);
  });

  it('says nothing once the block has something written in it', () => {
    const decorations = readDecorations('Escribe aqui', writtenDocument);

    expect(decorations.find()).toHaveLength(0);
  });

  it('stays quiet when no invitation was given to offer', () => {
    const decorations = readDecorations('', emptyDocument);

    expect(decorations.find()).toHaveLength(0);
  });
});
