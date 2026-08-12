import type { EditorState } from 'prosemirror-state';
import type { PageContent } from '../types/pages.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { serializePageEditorDocument } from './pages.editor.lib';

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
  if (documentType === undefined || !documentType.validContent(blocks)) return null;
  return serializePageEditorDocument(documentType.create(null, blocks));
};
