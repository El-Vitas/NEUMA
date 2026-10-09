import type { Node as EditorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { PageContent } from '../../../types/pages.types';
import { serializePageEditorDocument } from '../../lib/pages.editor.lib';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/**
 * The selected blocks themselves, as the editor holds them. A block nobody
 * touches stays the very same object in every later state of the page, so they
 * say exactly which blocks left once the other page has them.
 */
export const readSelectedPageBlocks = (state: EditorState): readonly EditorNode[] | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const blocks: EditorNode[] = [];
  for (let index = range.startIndex; index < range.endIndex; index += 1) blocks.push(range.parent.child(index));
  return blocks;
};

/**
 * The selected blocks read as page content of their own, ready to be handed to
 * another page.
 *
 * They travel as the same contract a page is saved with, so what arrives at the
 * other end is exactly what the page here would have stored — nesting,
 * children and colours included.
 */
export const readSelectedPageBlocksContent = (state: EditorState): PageContent | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;

  const blocks = state.doc.slice(range.start, range.end).content;
  if (blocks.childCount === 0) return null;
  const documentType = state.schema.nodes.doc;
  if (documentType?.validContent(blocks) !== true) return null;
  return serializePageEditorDocument(documentType.create(null, blocks));
};
