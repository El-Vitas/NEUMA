'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesViewLive } from '../hooks/use.pages.view-live';
import { readAlignmentClass, readTableAppearance } from '../lib/pages.table-appearance.lib';
import { listTableColumnKeys, readTableColumnOffsets, readTableFrozenCellProps } from '../lib/pages.table-columns.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBand,
} from '../types/pages.schema.types';
import { PagesCollectionTableFooter } from './pages.collection.table.footer';
import { PagesCollectionTableGroupCalculations } from './pages.collection.table.group-calculations';
import { PagesCollectionTableGroupRows } from './pages.collection.table.group-rows';
import { PagesCollectionTableGroups } from './pages.collection.table.groups';
import { PagesCollectionTableHeader } from './pages.collection.table.header';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** The rows as the server drew them: one band, with one unnamed group when the table does not group. */
  readonly bands: readonly PageViewBand[];
  readonly canEdit: boolean;
  /** Where to read what changed after those rows were read; null when the table cannot follow changes. */
  readonly changesCursor: null | string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly view: PageSchemaView;
  readonly viewId: string;
  /** Who looks; null when the browser does not know, and a filter that names the reader then goes to the server. */
  readonly viewerId?: null | string;
}

export const PagesCollectionTable = ({
  activeViewName,
  aggregates: drawnAggregates,
  bands,
  canEdit,
  changesCursor,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  view,
  viewId,
  viewerId = null,
}: IProps) => {
  const t = useTranslations('pages');
  const configuration = readPageViewConfiguration(view.configuration);
  const live = usePagesViewLive({
    aggregates: drawnAggregates,
    bands,
    changesCursor,
    groupByKey: configuration.groupBy ?? '',
    groupByMode: configuration.groupByMode,
    pageId: schema.pageId,
    properties: schema.properties,
    spaceId,
    subGroupByKey: '',
    view,
    viewerId,
  });
  const { aggregates } = live;
  const groups = live.bands[0]?.groups ?? [];
  const rows = groups.flatMap((group) => group.rows);
  if (rows.length === 0 && groups.every((group) => group.nextCursor === undefined || group.nextCursor === null)) {
    return <EmptyState message={t('collection.emptyTable')} />;
  }

  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  const {
    calculations,
    columnAlignments,
    columnWidths,
    columnWraps,
    frozenColumns,
    groupBy,
    hidesEmptyGroups,
    rowHeight,
    sorts,
    wrapsText,
  } = configuration;
  const appearance = readTableAppearance(rowHeight, wrapsText);
  const columnAppearances = Object.fromEntries(
    properties.map((property) => [
      property.key,
      readTableAppearance(rowHeight, wrapsText || columnWraps[property.key] === true),
    ]),
  );
  const alignmentClasses = Object.fromEntries(
    properties.map((property) => [property.key, readAlignmentClass(columnAlignments, property.key)]),
  );
  const offsets = readTableColumnOffsets(columnKeys, columnWidths);
  const frozenCells = columnKeys.map((_columnKey, position) =>
    readTableFrozenCellProps(position, frozenColumns, offsets),
  );
  const isGrouped = groupBy !== null;

  return (
    <PagesCollectionTableHeader
      activeViewName={activeViewName}
      aggregates={aggregates}
      canEdit={canEdit}
      isOrderable={canEdit && sorts.length === 0}
      personOptions={personOptions}
      properties={properties}
      rowIds={rows.map((row) => row.id)}
      schema={schema}
      spaceId={spaceId}
      titleLabel={t('titleField')}
      valuesByRow={Object.fromEntries(rows.map((row) => [row.id, row.propertyValues ?? {}]))}
      viewId={viewId}
    >
      <PagesCollectionTableGroups
        activeViewName={activeViewName}
        aggregates={aggregates}
        canEdit={canEdit}
        columnCount={columnKeys.length}
        groupByKey={groupBy ?? ''}
        groups={groups.map((group) => ({
          color: group.color,
          key: group.key,
          label: group.label,
          rowCount: group.rows.length,
          rows: (
            <>
              <PagesCollectionTableGroupRows
                alignmentClasses={alignmentClasses}
                appearance={appearance}
                canEdit={canEdit}
                collectionPageId={schema.pageId}
                columnAppearances={columnAppearances}
                columnCount={columnKeys.length}
                frozenCells={frozenCells}
                group={group}
                isLoadingMore={live.isLoading('', group.key)}
                onLoadMore={() => live.loadMore('', group.key)}
                personOptions={personOptions}
                properties={properties}
                spaceId={spaceId}
              />
              {isGrouped && (
                <PagesCollectionTableGroupCalculations
                  aggregates={aggregates}
                  calculations={calculations}
                  groupKey={group.key}
                  properties={properties}
                />
              )}
            </>
          ),
        }))}
        hidesEmptyGroups={hidesEmptyGroups}
        isGrouped={isGrouped}
        schema={schema}
        spaceId={spaceId}
      />
      <PagesCollectionTableFooter
        activeViewName={activeViewName}
        aggregates={aggregates}
        canEdit={canEdit}
        properties={properties}
        schema={schema}
        spaceId={spaceId}
      />
    </PagesCollectionTableHeader>
  );
};
