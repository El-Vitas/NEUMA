import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR,
  PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR,
} from '../constants/pages.collections.constants';
import type { PageCollectionInsert } from '../types/pages.collections.types';
import { leaveSomewhereToWriteUnder } from './pages.editor.write-under.lib';

const clickWhoeverAnswers =
  (selector: string): Command =>
  (_state, _dispatch, view) => {
    const asking = view?.dom.ownerDocument.querySelector<HTMLButtonElement>(selector);
    if (asking === null || asking === undefined) return false;
    asking.click();
    return true;
  };

/**
 * Asks for a collection to keep here.
 *
 * Like a page, a collection cannot be written: it is a page with a shape, and
 * only whoever holds the page knows how to make one. So the menu asks, and what
 * lands in the writing is the block that shows it.
 */
export const askForACollection: Command = clickWhoeverAnswers(PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR);

/** Asks which collection already written is being shown here. */
export const askForACollectionAlreadyWritten: Command = clickWhoeverAnswers(
  PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR,
);

/**
 * Puts the block that shows a collection where the writing was left.
 *
 * Where it was left is said outright for the same reason a child page says it:
 * making a collection takes a moment, and in that moment the cursor is gone.
 */
export const createPageCollectionInsertCommand =
  (schema: Schema, collection: PageCollectionInsert, spot: number): Command =>
  (state, dispatch) => {
    const collectionType = schema.nodes.collection;
    if (collectionType === undefined) return false;
    if (dispatch === undefined) return true;

    const node = collectionType.createChecked({
      pageId: collection.pageId,
      spaceId: collection.spaceId,
      viewName: collection.viewName,
    });
    const at = Math.min(Math.max(spot, 0), state.doc.content.size);
    dispatch(leaveSomewhereToWriteUnder(state.tr.replaceRangeWith(at, at, node), schema).scrollIntoView());
    return true;
  };
