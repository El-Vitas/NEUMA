import {
  PAGE_DATE_SCALE,
  PAGE_VIEW_OUTCOME_KIND,
  PAGE_VIEW_SHAPE,
  PAGE_VIEW_TYPE,
  readPageViewConfiguration,
} from '@neuma/shared';
import { PAGE_CALENDAR_MONTH_LENGTH } from '../constants/pages.calendar.constants';
import { readBoardBands, readViewGroups } from '../lib/pages.view-editing.lib';
import { readShownCardProperties, readShownProperties } from '../lib/pages.view-visibility.lib';
import type { PageViewRendererRegistry } from '../types/pages.view-renderer.types';
import { PagesCollectionBoard } from './pages.collection.board';
import { PagesCollectionCalendar } from './pages.collection.calendar';
import { PagesCollectionChart } from './pages.collection.chart';
import { PagesCollectionGallery } from './pages.collection.gallery';
import { PagesCollectionList } from './pages.collection.list';
import { PagesCollectionTable } from './pages.collection.table';
import { PagesCollectionTimeline } from './pages.collection.timeline';

export const PageViewRenderers: PageViewRendererRegistry = {
  [PAGE_VIEW_TYPE.TABLE]: {
    render: ({ aggregates, canEdit, outcome, personOptions, properties, schema, spaceId, view }) =>
      PagesCollectionTable({
        activeViewName: view.name,
        aggregates,
        canEdit,
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        nextCursor: outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS ? (outcome.nextCursor ?? null) : null,
        personOptions,
        properties: readShownProperties(view, properties),
        schema,
        spaceId,
        viewId: view.id,
      }),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.BOARD]: {
    render: ({ aggregates, canEdit, changesCursor, outcome, personOptions, properties, schema, spaceId, view }) => (
      <PagesCollectionBoard
        activeViewName={view.name}
        aggregates={aggregates}
        bands={readBoardBands(outcome)}
        canEdit={canEdit}
        changesCursor={changesCursor}
        groupByKey={readPageViewConfiguration(view.configuration).groupBy ?? ''}
        isManualOrder={readPageViewConfiguration(view.configuration).sorts.length === 0}
        personOptions={personOptions}
        properties={readShownCardProperties(view, properties)}
        schema={schema}
        spaceId={spaceId}
        subGroupByKey={readPageViewConfiguration(view.configuration).subGroupBy ?? ''}
        view={view}
        viewId={view.id}
      />
    ),
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
  [PAGE_VIEW_TYPE.LIST]: {
    render: ({ aggregates, outcome, personOptions, properties, schema, spaceId, view }) =>
      PagesCollectionList({
        aggregates,
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        nextCursor: outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS ? (outcome.nextCursor ?? null) : null,
        pageId: schema.pageId,
        personOptions,
        properties: readShownCardProperties(view, properties),
        spaceId,
        viewId: view.id,
      }),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.CALENDAR]: {
    render: ({ canEdit, outcome, schema, spaceId, view }) => {
      const month = outcome.calendar?.month ?? new Date().toISOString().slice(0, PAGE_CALENDAR_MONTH_LENGTH);
      return (
        <PagesCollectionCalendar
          activeViewName={view.name}
          canEdit={canEdit}
          dateProperty={readPageViewConfiguration(view.configuration).dateProperty}
          day={outcome.calendar?.day ?? `${month}-01`}
          isTruncated={outcome.calendar?.isTruncated ?? false}
          month={month}
          rows={outcome.rows}
          scale={outcome.calendar?.scale ?? PAGE_DATE_SCALE.MONTH}
          schema={schema}
          spaceId={spaceId}
          undated={outcome.calendar?.undated ?? 0}
        />
      );
    },
    shape: PAGE_VIEW_SHAPE.FLAT,
  },
  [PAGE_VIEW_TYPE.TIMELINE]: {
    render: ({ canEdit, outcome, schema, spaceId, view }) => {
      const configuration = readPageViewConfiguration(view.configuration);
      return (
        <PagesCollectionTimeline
          activeViewName={view.name}
          canEdit={canEdit}
          dateProperty={configuration.dateProperty}
          endDateProperty={configuration.endDateProperty}
          rows={outcome.rows}
          schema={schema}
          spaceId={spaceId}
          timeline={outcome.timeline}
        />
      );
    },
    shape: PAGE_VIEW_SHAPE.FLAT,
  },
  [PAGE_VIEW_TYPE.CHART]: {
    render: ({ aggregates, properties, view }) => {
      const configuration = readPageViewConfiguration(view.configuration);
      return PagesCollectionChart({
        aggregates,
        groupBy: configuration.groupBy,
        kind: configuration.chartKind,
        measure: configuration.chartMeasure,
        mode: configuration.groupByMode,
        properties,
        valueProperty: configuration.chartValueProperty,
      });
    },
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
  [PAGE_VIEW_TYPE.GALLERY]: {
    render: ({ aggregates, canEdit, outcome, personOptions, properties, schema, spaceId, view }) =>
      PagesCollectionGallery({
        activeViewName: view.name,
        aggregates,
        canEdit,
        cardSize: readPageViewConfiguration(view.configuration).cardSize,
        groups: readViewGroups(outcome),
        isGrouped: outcome.kind === PAGE_VIEW_OUTCOME_KIND.GROUPED_ROWS,
        nextCursor: outcome.kind === PAGE_VIEW_OUTCOME_KIND.FLAT_ROWS ? (outcome.nextCursor ?? null) : null,
        pageId: schema.pageId,
        personOptions,
        properties: readShownCardProperties(view, properties),
        schema,
        spaceId,
        viewId: view.id,
      }),
    shape: 'EITHER',
  },
};
