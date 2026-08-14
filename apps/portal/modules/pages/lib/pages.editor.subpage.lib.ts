import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import { PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR } from '../constants/pages.editor.blocks.constants';
import type { PageSubpageInsert } from '../types/pages.editor.subpage.types';

/**
 * Asks for the page that will hang from this one.
 *
 * A page cannot be written into the writing: it has to be made first, and only
 * whoever holds the page knows how to make one. So the menu asks, the same way
 * it asks for an image, and what lands here is whatever comes back.
 */
export const askForPageChild: Command = (_state, _dispatch, view) => {
  const asking = view?.dom.ownerDocument.querySelector<HTMLButtonElement>(PAGE_EDITOR_SUBPAGE_REQUEST_SELECTOR);
  if (asking === null || asking === undefined) return false;
  asking.click();
  return true;
};

/** Puts the line that leads to a child page where the writing was left. */
export const createPageSubpageInsertCommand =
  (schema: Schema, subpage: PageSubpageInsert): Command =>
  (state, dispatch) => {
    const subpageType = schema.nodes.subpage;
    if (subpageType === undefined) return false;
    if (dispatch === undefined) return true;

    const node = subpageType.createChecked(subpage);
    const transaction = state.tr.replaceSelectionWith(node, false);
    dispatch(transaction.scrollIntoView());
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
