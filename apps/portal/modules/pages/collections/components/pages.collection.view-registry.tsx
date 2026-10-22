import { PAGE_DATE_SCALE, PAGE_VIEW_SHAPE, PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { PAGE_CALENDAR_MONTH_LENGTH } from '../constants/pages.calendar.constants';
import { readViewBands } from '../lib/pages.view-bands.lib';
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
    render: ({
      aggregates,
      canEdit,
      changesCursor,
      outcome,
      personOptions,
      properties,
      schema,
      spaceId,
      view,
      viewerId,
    }) => (
      <PagesCollectionTable
        activeViewName={view.name}
        aggregates={aggregates}
        bands={readViewBands(outcome)}
        canEdit={canEdit}
        changesCursor={changesCursor}
        personOptions={personOptions}
        properties={readShownProperties(view, properties)}
        schema={schema}
        spaceId={spaceId}
        view={view}
        viewerId={viewerId}
        viewId={view.id}
      />
    ),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.BOARD]: {
    render: ({
      aggregates,
      canEdit,
      changesCursor,
      outcome,
      personOptions,
      properties,
      schema,
      spaceId,
      view,
      viewerId,
    }) => (
      <PagesCollectionBoard
        activeViewName={view.name}
        aggregates={aggregates}
        bands={readViewBands(outcome)}
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
        viewerId={viewerId}
        viewId={view.id}
      />
    ),
    shape: PAGE_VIEW_SHAPE.GROUPED,
  },
  [PAGE_VIEW_TYPE.LIST]: {
    render: ({ aggregates, changesCursor, outcome, personOptions, properties, schema, spaceId, view, viewerId }) => (
      <PagesCollectionList
        aggregates={aggregates}
        bands={readViewBands(outcome)}
        changesCursor={changesCursor}
        personOptions={personOptions}
        properties={readShownCardProperties(view, properties)}
        schema={schema}
        spaceId={spaceId}
        view={view}
        viewerId={viewerId}
      />
    ),
    shape: 'EITHER',
  },
  [PAGE_VIEW_TYPE.CALENDAR]: {
    render: ({ canEdit, changesCursor, outcome, schema, spaceId, view, viewerId }) => {
      const month = outcome.calendar?.month ?? new Date().toISOString().slice(0, PAGE_CALENDAR_MONTH_LENGTH);
      return (
        <PagesCollectionCalendar
          activeViewName={view.name}
          canEdit={canEdit}
          changesCursor={changesCursor}
          dateProperty={readPageViewConfiguration(view.configuration).dateProperty}
          day={outcome.calendar?.day ?? `${month}-01`}
          isTruncated={outcome.calendar?.isTruncated ?? false}
          month={month}
          rows={outcome.rows}
          scale={outcome.calendar?.scale ?? PAGE_DATE_SCALE.MONTH}
          schema={schema}
          spaceId={spaceId}
          undated={outcome.calendar?.undated ?? 0}
          view={view}
          viewerId={viewerId}
        />
      );
    },
    shape: PAGE_VIEW_SHAPE.FLAT,
  },
  [PAGE_VIEW_TYPE.TIMELINE]: {
    render: ({ canEdit, changesCursor, outcome, schema, spaceId, view, viewerId }) => {
      const configuration = readPageViewConfiguration(view.configuration);
      return (
        <PagesCollectionTimeline
          activeViewName={view.name}
          canEdit={canEdit}
          changesCursor={changesCursor}
          dateProperty={configuration.dateProperty}
          endDateProperty={configuration.endDateProperty}
          rows={outcome.rows}
          schema={schema}
          spaceId={spaceId}
          timeline={outcome.timeline}
          view={view}
          viewerId={viewerId}
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
    render: ({
      aggregates,
      canEdit,
      changesCursor,
      outcome,
      personOptions,
      properties,
      schema,
      spaceId,
      view,
      viewerId,
    }) => (
      <PagesCollectionGallery
        activeViewName={view.name}
        aggregates={aggregates}
        bands={readViewBands(outcome)}
        canEdit={canEdit}
        changesCursor={changesCursor}
        personOptions={personOptions}
        properties={readShownCardProperties(view, properties)}
        schema={schema}
        spaceId={spaceId}
        view={view}
        viewerId={viewerId}
      />
    ),
    shape: 'EITHER',
  },
};
