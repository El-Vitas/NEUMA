import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_MENTION_TRIGGER,
  PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR,
} from '../constants/pages.editor.blocks.constants';
import type { PageSubpageInsert } from '../types/pages.editor.subpage.types';
import { createPageEditorAskCommand } from './pages.editor.ask.lib';
import { leaveSomewhereToWriteUnder } from './pages.editor.write-under.lib';

/**
 * Asks for the page that will hang from this one.
 *
 * A page cannot be written into the writing: it has to be made first, and only
 * whoever holds the page knows how to make one. So the menu asks, the same way
 * it asks for an image, and what lands here is whatever comes back.
 */
export const askForPageChild: Command = createPageEditorAskCommand(PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR);

/**
 * Puts the line that leads to a child page where the writing was left.
 *
 * Where it was left is said outright rather than read from the writing when the
 * page comes back: making a page takes a moment, and in that moment the cursor
 * has been elsewhere — the menu was pressed, the writing lost hold — so a line
 * asked for at the end of a page would land at the top of it.
 */
export const createPageSubpageInsertCommand =
  (schema: Schema, subpage: PageSubpageInsert, spot: number): Command =>
  (state, dispatch) => {
    const subpageType = schema.nodes.subpage;
    if (subpageType === undefined) return false;
    if (dispatch === undefined) return true;

    const node = subpageType.createChecked(subpage);
    const at = Math.min(Math.max(spot, 0), state.doc.content.size);
    dispatch(leaveSomewhereToWriteUnder(state.tr.replaceRangeWith(at, at, node), schema).scrollIntoView());
    return true;
  };

/**
 * Asks which page already written is being named here.
 *
 * The asking is the same one `@` does, so it is done by writing the `@`: one
 * way of looking for a page, whether it was reached from the menu or typed
 * straight into the sentence.
 */
export const askForAPageAlreadyWritten: Command = (state, dispatch) => {
  if (dispatch === undefined) return true;
  dispatch(state.tr.insertText(PAGE_EDITOR_MENTION_TRIGGER));
  return true;
};

/** What a page hanging from another is called before anybody has named it. */
export const nameTheChildPage = (title: string, untitled: string): string =>
  title.trim().length > 0 ? title.trim() : untitled;

/** What a page is called now, asked of the pages this one already knows about. */
export const readPageTitleFrom = (
  pages: readonly { readonly id: string; readonly title: string }[],
  pageId: string,
): string | null => pages.find((page) => page.id === pageId)?.title ?? null;
