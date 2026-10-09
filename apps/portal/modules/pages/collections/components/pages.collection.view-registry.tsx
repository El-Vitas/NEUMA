import {
  PAGE_VIEW_OUTCOME_KIND,
  PAGE_VIEW_SHAPE,
  PAGE_VIEW_TYPE,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { readBoardBands, readViewGroups } from '../lib/pages.view-editing.lib';
import { readShownCardProperties, readShownProperties } from '../lib/pages.view-visibility.lib';
import type { PageViewRendererRegistry } from '../types/pages.view-renderer.types';
import { PagesCollectionBoard } from './pages.collection.board';
import { PagesCollectionCalendar } from './pages.collection.calendar';
import { PagesCollectionChart } from './pages.collection.chart';
import { PagesCollectionGallery } from './pages.collection.gallery';
import { PagesCollectionList } from './pages.collection.list';
import { PagesCollectionTable } from './pages.collection.table';

export const PageViewRenderers: PageViewRendererRegistry = {
  [PAGE_VIEW_TYPE.TABLE]: {
    render: ({ canEdit, outcome, personOptions, properties, schema, spaceId, view }) =>
      PagesCollectionTable({
        activeViewName: view.name,
        canEdit,
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        personOptions,
        properties: readShownProperties(view, properties),
        schema,
        spaceId,
      }),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.BOARD]: {
    render: ({ canEdit, outcome, personOptions, properties, schema, spaceId, view }) => (
      <PagesCollectionBoard
        activeViewName={view.name}
        bands={readBoardBands(outcome)}
        canEdit={canEdit}
        groupByKey={readPageViewConfiguration(view.configuration).groupBy ?? ''}
        personOptions={personOptions}
        properties={readShownCardProperties(view, properties)}
        schema={schema}
        spaceId={spaceId}
        subGroupByKey={readPageViewConfiguration(view.configuration).subGroupBy ?? ''}
      />
    ),
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
  [PAGE_VIEW_TYPE.LIST]: {
    render: ({ outcome, personOptions, properties, spaceId, view }) =>
      PagesCollectionList({
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        personOptions,
        properties: readShownCardProperties(view, properties),
        spaceId,
      }),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.CALENDAR]: {
    render: ({ canEdit, outcome, schema, spaceId, view }) => (
      <PagesCollectionCalendar
        canEdit={canEdit}
        dateProperty={readPageViewConfiguration(view.configuration).dateProperty}
        rows={outcome.rows}
        schema={schema}
        spaceId={spaceId}
      />
    ),
    shape: PAGE_VIEW_SHAPE.FLAT,
  },
  [PAGE_VIEW_TYPE.CHART]: {
    render: ({ outcome, properties, view }) =>
      PagesCollectionChart({
        /* A chart draws one dimension: the grouping property is its axis, so it takes no bands. */
        groups: readBoardBands(outcome)[0]?.groups ?? [],
        kind: readPageViewConfiguration(view.configuration).chartKind,
        measure: readPageViewConfiguration(view.configuration).chartMeasure,
        properties,
        valueProperty: readPageViewConfiguration(view.configuration).chartValueProperty,
      }),
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
  [PAGE_VIEW_TYPE.GALLERY]: {
    render: ({ outcome, personOptions, properties, spaceId, view }) =>
      PagesCollectionGallery({
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        personOptions,
        properties: readShownCardProperties(view, properties),
        spaceId,
      }),
    shape: 'EITHER',
  },
};
