import { pageMentionAttrsSchema } from '@company-brain/shared';
import { type Node as EditorNode, Fragment } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { Selection } from 'prosemirror-state';
import type { PageContent } from '../../../types/pages.types';
import { serializePageEditorDocument } from '../../lib/pages.editor.lib';
import type { PageEditorBlockLink } from '../../menus/types/pages.editor.page-drop.types';
import type { PageEditorBlockRange } from '../types/pages.editor.block-drag.types';

/**
 * A stretch of blocks read as page content of their own.
 *
 * They travel as the same contract a page is saved with, so what arrives at the
 * other end is exactly what this page would have stored — nesting, children and
 * colours included.
 */
export const readPageEditorBlocksContent = (state: EditorState, range: PageEditorBlockRange): PageContent | null => {
  const blocks = state.doc.slice(range.from, range.to).content;
  if (blocks.childCount === 0) return null;
  const documentType = state.schema.nodes.doc;
  if (documentType?.validContent(blocks) !== true) return null;
  return serializePageEditorDocument(documentType.create(null, blocks));
};

/** The first line written inside a block, however deep it is held. */
const readFirstLine = (block: EditorNode): string => {
  if (block.isTextblock) return block.textContent;
  return block.firstChild === null ? '' : readFirstLine(block.firstChild);
};

/**
 * What the blocks would call the page they become: the first line they say. A
 * block that says nothing names nothing, so the page can be named later.
 */
export const readPageEditorBlocksTitle = (state: EditorState, range: PageEditorBlockRange): string => {
  const first = state.doc.slice(range.from, range.to).content.firstChild;
  return first === null ? '' : readFirstLine(first).trim();
};

/**
 * What is left where the blocks were: nothing, unless taking them out would
 * leave the page with nowhere to write.
 */
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

/**
 * Puts a link to the new page where the blocks used to be, so the page they
 * left still says where they went.
 *
 * The link is the same mention one writes with `@`: one way of pointing at a
 * page, however it came to be written.
 */
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

/**
 * Takes a known stretch of blocks off the page, for when they now live
 * somewhere else. It is told which blocks rather than reading the selection:
 * the ones that travelled were chosen by the gesture, not by the cursor.
 */
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
