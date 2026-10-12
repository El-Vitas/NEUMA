import { pageMentionAttrsSchema } from '@neuma/shared';
import { type Node as EditorNode, Fragment } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import type { PageContent } from '../../../types/pages.types';
import { serializePageEditorDocument } from '../../lib/pages.editor.lib';
import type { PageEditorBlockLink } from '../../menus/types/pages.editor.page-drop.types';
import type { PageEditorBlockRange } from '../types/pages.editor.block-drag.types';

/** Uses the same contract a page is saved with, so the receiving page gets exactly what this one would store. */
export const readPageEditorBlocksContent = (state: EditorState, range: PageEditorBlockRange): PageContent | null => {
  const blocks = state.doc.slice(range.from, range.to).content;
  if (blocks.childCount === 0) return null;
  const documentType = state.schema.nodes.doc;
  if (documentType?.validContent(blocks) !== true) return null;
  return serializePageEditorDocument(documentType.create(null, blocks));
};

const readFirstLine = (block: EditorNode): string => {
  if (block.isTextblock) return block.textContent;
  return block.firstChild === null ? '' : readFirstLine(block.firstChild);
};

/** Empty when the blocks have no text, so the page can be named later. */
export const readPageEditorBlocksTitle = (state: EditorState, range: PageEditorBlockRange): string => {
  const first = state.doc.slice(range.from, range.to).content.firstChild;
  return first === null ? '' : readFirstLine(first).trim();
};

/** Nothing, unless removal would leave the page with nowhere to write. */
const readReplacement = (state: EditorState, range: PageEditorBlockRange): Fragment | null => {
  const place = state.doc.resolve(range.from);
  const startIndex = place.index();
  const endIndex = place.parent.childCount === startIndex ? startIndex : state.doc.resolve(range.to).index();
  if (place.parent.canReplace(startIndex, endIndex)) return Fragment.empty;

  const paragraph: EditorNode | undefined = state.schema.nodes.paragraph?.createAndFill() ?? undefined;
  if (paragraph === undefined) return null;
  const replacement = Fragment.from(paragraph);
  return place.parent.canReplace(startIndex, endIndex, replacement) ? replacement : null;
};

/** The link is the same mention node that `@` produces. */
export const createPageEditorBlockLinkCommand =
  ({ label, pageId, range, spaceId }: PageEditorBlockLink): Command =>
  (state, dispatch) => {
    const mention = pageMentionAttrsSchema.safeParse({ label, pageId, spaceId });
    const paragraphType = state.schema.nodes.paragraph;
    const mentionType = state.schema.nodes.mention;
    if (!mention.success || paragraphType === undefined || mentionType === undefined) return false;
    if (dispatch === undefined) return true;

    const link = paragraphType.create(null, mentionType.createChecked(mention.data));
    const transaction = state.tr.replaceWith(range.from, range.to, link);
    transaction.setSelection(
      Selection.near(transaction.doc.resolve(Math.min(range.from, transaction.doc.content.size))),
    );
    dispatch(transaction.scrollIntoView());
    return true;
  };

/** Takes the range explicitly instead of reading the selection, since the gesture chose the blocks, not the cursor. */
export const createPageEditorBlockRangeRemovalCommand =
  (range: PageEditorBlockRange): Command =>
  (state, dispatch) => {
    const replacement = readReplacement(state, range);
    if (replacement === null) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr.replaceWith(range.from, range.to, replacement);
    transaction.setSelection(
      Selection.near(transaction.doc.resolve(Math.min(range.from, transaction.doc.content.size))),
    );
    dispatch(transaction.scrollIntoView());
    return true;
  };
