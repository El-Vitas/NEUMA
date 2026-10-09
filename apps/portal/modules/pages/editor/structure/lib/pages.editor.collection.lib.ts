import type { Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import {
  PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR,
  PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR,
} from '../../../collections/constants/pages.collections.constants';
import type { PageCollectionInsert } from '../../../collections/types/pages.collections.types';
import { createPageEditorAskCommand } from '../../lib/pages.editor.ask.lib';
import { leaveSomewhereToWriteUnder } from '../../lib/pages.editor.write-under.lib';

/** A collection cannot be created inside the editor, so the menu asks the host page to make one. */
export const askForACollection: Command = createPageEditorAskCommand(PAGE_EDITOR_COLLECTION_REQUEST_SELECTOR);

export const askForACollectionAlreadyWritten: Command = createPageEditorAskCommand(
  PAGE_EDITOR_COLLECTION_VIEW_REQUEST_SELECTOR,
);

/** Takes the position explicitly: creating the collection is async and the cursor is gone by then. */
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
