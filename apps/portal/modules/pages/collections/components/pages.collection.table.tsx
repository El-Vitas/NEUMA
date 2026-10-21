import { readPageViewConfiguration } from '@neuma/shared';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { readAlignmentClass, readTableAppearance } from '../lib/pages.table-appearance.lib';
import { listTableColumnKeys, readTableColumnOffsets, readTableFrozenCellProps } from '../lib/pages.table-columns.lib';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageViewAggregates,
  PageViewGroup,
} from '../types/pages.schema.types';
import { PagesCollectionTableFooter } from './pages.collection.table.footer';
import { PagesCollectionTableGroupCalculations } from './pages.collection.table.group-calculations';
import { PagesCollectionTableGroups } from './pages.collection.table.groups';
import { PagesCollectionTableHeader } from './pages.collection.table.header';
import { PagesCollectionTableMoreRows } from './pages.collection.table.more-rows';
import { PagesCollectionTableRow } from './pages.collection.table.row';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly canEdit: boolean;
  readonly groups: readonly PageViewGroup[];
  readonly isGrouped: boolean;
  /** Where the rows of an ungrouped table end; the groups carry their own. */
  readonly nextCursor: null | string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly viewId: string;
}

export const PagesCollectionTable = async ({
  activeViewName,
  aggregates,
  canEdit,
  groups,
  isGrouped,
  nextCursor,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  viewId,
}: IProps) => {
  const t = await getTranslations('pages');
  const rows = groups.flatMap((group) => group.rows);
  if (rows.length === 0 && groups.every((group) => group.nextCursor === undefined || group.nextCursor === null)) {
    return <EmptyState message={t('collection.emptyTable')} />;
  }

  const columnKeys = listTableColumnKeys(properties.map((property) => property.key));
  const activeView = schema.views.find((view) => view.name === activeViewName);
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
  } = readPageViewConfiguration(activeView?.configuration ?? {});
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
        groups={groups.map((group) => {
          const firstCursor = isGrouped ? (group.nextCursor ?? null) : nextCursor;
          return {
            color: group.color,
            key: group.key,
            label: group.label,
            rowCount: group.rows.length,
            rows: (
              <>
                {group.rows.map((row) => (
                  <PagesCollectionTableRow
                    alignmentClasses={alignmentClasses}
                    appearance={appearance}
                    canEdit={canEdit}
                    collectionPageId={schema.pageId}
                    columnAppearances={columnAppearances}
                    frozenCells={frozenCells}
                    key={row.id}
                    openFullPageLabel={t('sidePanel.openFullPage')}
                    personOptions={personOptions}
                    properties={properties}
                    row={row}
                    scope={group.key}
                    selectLabel={t('collection.selectRow', { title: row.title.length > 0 ? row.title : t('untitled') })}
                    spaceId={spaceId}
                    untitledLabel={t('untitled')}
                  />
                ))}
                {firstCursor !== null && (
                  <PagesCollectionTableMoreRows
                    alignmentClasses={alignmentClasses}
                    appearance={appearance}
                    canEdit={canEdit}
                    collectionPageId={schema.pageId}
                    columnAppearances={columnAppearances}
                    columnCount={columnKeys.length}
                    frozenCells={frozenCells}
                    paging={{
                      drawnRowIds: group.rows.map((row) => row.id),
                      firstCursor,
                      ...(isGrouped ? { group: { key: group.key } } : {}),
                      pageId: schema.pageId,
                      spaceId,
                      viewId,
                    }}
                    personOptions={personOptions}
                    properties={properties}
                    scope={group.key}
                    spaceId={spaceId}
                  />
                )}
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
          };
        })}
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
