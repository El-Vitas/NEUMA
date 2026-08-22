import { PAGE_PROPERTY_TYPE, PAGE_VIEW_TYPE } from '@company-brain/shared';
import {
  PAGE_COLLECTION_FIRST_PROPERTY_KEY,
  PAGE_COLLECTION_TITLE_PROPERTY_KEY,
} from '../constants/pages.collections.constants';
import type { PageCollectionShape, PageCollectionWording } from '../types/pages.collections.types';

/**
 * What a collection is when nobody has said anything about it yet.
 *
 * It starts as one table with what everything kept in it must have — a name,
 * which is the title of the page each row is — and one column of its own,
 * because a collection with no columns shows nothing at all and one with five
 * guesses at what somebody meant to keep in it.
 */
export const describeANewCollection = (wording: PageCollectionWording): PageCollectionShape => ({
  properties: [
    {
      key: PAGE_COLLECTION_TITLE_PROPERTY_KEY,
      label: wording.titleProperty,
      options: null,
      required: true,
      type: PAGE_PROPERTY_TYPE.TITLE,
    },
    {
      key: PAGE_COLLECTION_FIRST_PROPERTY_KEY,
      label: wording.firstProperty,
      options: null,
      required: false,
      type: PAGE_PROPERTY_TYPE.RICH_TEXT,
    },
  ],
  views: [
    {
      /** Nothing is grouped, filtered or sorted until somebody says so. */
      configuration: {},
      isDefault: true,
      name: wording.firstView,
      type: PAGE_VIEW_TYPE.TABLE,
    },
  ],
});

/** Which view of a collection a block shows: the one it was told, or the one the collection leads with. */
export const readTheViewToShow = (
  views: readonly { readonly isDefault: boolean; readonly name: string }[],
): string | null => views.find((view) => view.isDefault)?.name ?? views[0]?.name ?? null;
