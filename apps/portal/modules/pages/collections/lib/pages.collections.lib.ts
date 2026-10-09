import { PAGE_COLLECTION_TITLE_PROPERTY_KEY, PAGE_PROPERTY_TYPE, PAGE_VIEW_TYPE } from '@company-brain/shared';
import { PAGE_COLLECTION_FIRST_PROPERTY_KEY } from '../constants/pages.collections.constants';
import type { PageCollectionShape, PageCollectionWording } from '../types/pages.collections.types';

/** One table with a title and a single column: no columns shows nothing, and more would be guesses. */
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
      configuration: {},
      isDefault: true,
      name: wording.firstView,
      type: PAGE_VIEW_TYPE.TABLE,
    },
  ],
});

/** Includes the view because one collection can appear twice on a page, e.g. a chart and its table. */
export const readEmbeddedCollectionKey = (pageId: string, viewName: null | string | undefined): string =>
  `${pageId}|${viewName ?? ''}`;

export const readTheViewToShow = (
  views: readonly { readonly isDefault: boolean; readonly name: string }[],
): string | null => views.find((view) => view.isDefault)?.name ?? views[0]?.name ?? null;
