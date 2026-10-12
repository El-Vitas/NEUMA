import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { PageContent } from '../../../types/pages.types';
import { serializePageEditorDocument } from '../../lib/pages.editor.lib';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/** An untouched block stays the same object across states, so identity tells which blocks left. */
export const readSelectedPageBlocks = (state: EditorState): readonly EditorNode[] | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const blocks: EditorNode[] = [];
  for (let index = range.startIndex; index < range.endIndex; index += 1) blocks.push(range.parent.child(index));
  return blocks;
};

export const readSelectedPageBlocksContent = (state: EditorState): PageContent | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;

  const blocks = state.doc.slice(range.start, range.end).content;
  if (blocks.childCount === 0) return null;
  const documentType = state.schema.nodes.doc;
  if (documentType?.validContent(blocks) !== true) return null;
  return serializePageEditorDocument(documentType.create(null, blocks));
};
