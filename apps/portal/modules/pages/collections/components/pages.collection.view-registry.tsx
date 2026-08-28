import { PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE, readPageViewConfiguration } from '@company-brain/shared';
import { readShownCardProperties, readShownProperties } from '../lib/pages.view-visibility.lib';
import type { PageViewRendererRegistry } from '../types/pages.view-renderer.types';
import { PagesCollectionBoard } from './pages.collection.board';
import { PagesCollectionTable } from './pages.collection.table';

/**
 * Which piece draws which kind of view.
 *
 * A kind of view enters the product by adding its component and one entry here.
 * Nothing that reads rows, filters or groups them has to learn its name.
 */
export const PageViewRenderers: PageViewRendererRegistry = {
  [PAGE_VIEW_TYPE.TABLE]: {
    render: ({ outcome, properties, spaceId, view }) =>
      PagesCollectionTable({ properties: readShownProperties(view, properties), rows: outcome.rows, spaceId }),
    shape: PAGE_VIEW_SHAPE.FLAT,
  },
  [PAGE_VIEW_TYPE.BOARD]: {
    render: ({ canEdit, outcome, properties, spaceId, view }) => (
      <PagesCollectionBoard
        canEdit={canEdit}
        groupByKey={readPageViewConfiguration(view.configuration).groupBy ?? ''}
        groups={outcome.groups}
        properties={readShownCardProperties(view, properties)}
        spaceId={spaceId}
      />
    ),
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
};
