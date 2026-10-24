'use client';

import { PAGE_DATE_SCALE, PAGE_VIEW_TYPE, readPageViewConfiguration } from '@neuma/shared';
import { useMemo } from 'react';
import { PAGE_CALENDAR_MONTH_LENGTH } from '../constants/pages.calendar.constants';
import { toPlacedTimeline } from '../lib/pages.cached-paint.lib';
import { getEditableSchemaProperties } from '../lib/pages.properties.lib';
import { readShownCardProperties, readShownProperties } from '../lib/pages.view-visibility.lib';
import type { CachedWindowRows } from '../types/pages.cached-paint.types';
import type { PageViewBand } from '../types/pages.schema.types';
import type { ReadCachedView } from '../types/pages.view-cache.types';
import { PagesCollectionBoard } from './pages.collection.board';
import { PagesCollectionCalendar } from './pages.collection.calendar';
import { PagesCollectionCardAppearanceProvider } from './pages.collection.card-appearance.provider';
import { PagesCollectionGallery } from './pages.collection.gallery';
import { PagesCollectionList } from './pages.collection.list';
import { PagesCollectionLookupsProvider } from './pages.collection.lookups.provider';
import { PagesCollectionRowQueryProvider } from './pages.collection.row-query.provider';
import { PagesCollectionTable } from './pages.collection.table';
import { PagesCollectionTimeline } from './pages.collection.timeline';

interface IProps {
  /** The bands to draw instead of the ones kept, once what changed since was placed in them. */
  readonly bands?: null | readonly PageViewBand[];
  readonly read: ReadCachedView;
  readonly spaceId: string;
  /** The rows of a calendar or a timeline to draw instead of the ones kept, once what changed since was placed. */
  readonly window?: CachedWindowRows | null;
}

/**
 * A view drawn from what the cache kept, with the same components the server's drawing uses. It is read only and cannot
 * follow changes: it stands in until the server answers, which replaces it.
 */
export const PagesCollectionCachedBody = ({ bands = null, read, spaceId, window = null }: IProps) => {
  const { view } = read;
  const configuration = readPageViewConfiguration(view.configuration);
  const properties = useMemo(() => getEditableSchemaProperties(read.schema), [read.schema]);
  const aggregates = useMemo(() => Promise.resolve(read.aggregates), [read.aggregates]);
  const shownBands = bands ?? read.bands;
  const common = { changesCursor: null, schema: read.schema, spaceId, view, viewerId: read.viewerId } as const;

  const draw = () => {
    switch (view.type) {
      case PAGE_VIEW_TYPE.TABLE:
        return (
          <PagesCollectionTable
            {...common}
            activeViewName={view.name}
            aggregates={aggregates}
            bands={shownBands}
            canEdit={false}
            personOptions={read.personOptions}
            properties={readShownProperties(view, properties)}
            viewId={view.id}
          />
        );
      case PAGE_VIEW_TYPE.BOARD:
        return (
          <PagesCollectionBoard
            {...common}
            activeViewName={view.name}
            aggregates={aggregates}
            bands={shownBands}
            canEdit={false}
            groupByKey={configuration.groupBy ?? ''}
            isManualOrder={configuration.sorts.length === 0}
            personOptions={read.personOptions}
            properties={readShownCardProperties(view, properties)}
            subGroupByKey={configuration.subGroupBy ?? ''}
            viewId={view.id}
          />
        );
      case PAGE_VIEW_TYPE.LIST:
        return (
          <PagesCollectionList
            {...common}
            aggregates={aggregates}
            bands={shownBands}
            personOptions={read.personOptions}
            properties={readShownCardProperties(view, properties)}
          />
        );
      case PAGE_VIEW_TYPE.GALLERY:
        return (
          <PagesCollectionGallery
            {...common}
            activeViewName={view.name}
            aggregates={aggregates}
            bands={shownBands}
            canEdit={false}
            personOptions={read.personOptions}
            properties={readShownCardProperties(view, properties)}
          />
        );
      case PAGE_VIEW_TYPE.CALENDAR: {
        const month = read.calendar?.month ?? new Date().toISOString().slice(0, PAGE_CALENDAR_MONTH_LENGTH);
        return (
          <PagesCollectionCalendar
            {...common}
            activeViewName={view.name}
            canEdit={false}
            dateProperty={configuration.dateProperty}
            day={read.calendar?.day ?? `${month}-01`}
            isTruncated={read.calendar?.isTruncated ?? false}
            month={month}
            rows={window?.rows ?? read.windowRows}
            scale={read.calendar?.scale ?? PAGE_DATE_SCALE.MONTH}
            undated={window?.undated ?? read.calendar?.undated ?? 0}
          />
        );
      }
      case PAGE_VIEW_TYPE.TIMELINE:
        return (
          <PagesCollectionTimeline
            {...common}
            activeViewName={view.name}
            canEdit={false}
            dateProperty={configuration.dateProperty}
            endDateProperty={configuration.endDateProperty}
            rows={window?.rows ?? read.windowRows}
            timeline={toPlacedTimeline(read.timeline, window)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PagesCollectionLookupsProvider lookups={read.lookups}>
      <PagesCollectionRowQueryProvider quickFilter={null} search="">
        <PagesCollectionCardAppearanceProvider
          coverProperty={configuration.coverProperty}
          size={configuration.cardSize}
        >
          {draw()}
        </PagesCollectionCardAppearanceProvider>
      </PagesCollectionRowQueryProvider>
    </PagesCollectionLookupsProvider>
  );
};
