'use client';

import { readPageViewConfiguration, UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesBoardColumns } from '../hooks/use.pages.board-columns';
import { usePagesBoardDrag } from '../hooks/use.pages.board-drag';
import { usePagesBoardPaging } from '../hooks/use.pages.board-paging';
import { usePagesEdgeScrolling } from '../hooks/use.pages.edge-scrolling';
import { usePagesRowCreation } from '../hooks/use.pages.row-creation';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageBoardColumnDrag, PageBoardNamingCell } from '../types/pages.board-drag.types';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageViewAggregates,
  PageViewBand,
} from '../types/pages.schema.types';
import { PagesCollectionBoardColumn } from './pages.collection.board.column';
import { PagesCollectionBoardNewColumn } from './pages.collection.board.new-column';
import { PagesCollectionGroupCount } from './pages.collection.group-count';

interface IProps {
  /** Owner of the folded columns and limits. */
  readonly activeViewName: string;
  /** The counts of each column, which arrive after the cards. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** A single unnamed band when the board groups by one property. */
  readonly bands: readonly PageViewBand[];
  readonly canEdit: boolean;
  readonly groupByKey: string;
  /** False when the view sorts its cards: their place is then the sort's. */
  readonly isManualOrder: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  /** Already narrowed to what this view shows. */
  readonly properties: readonly PageSchemaProperty[];
  readonly schema: PageSchema;
  readonly spaceId: string;
  /** Empty when the board has a single grouping dimension. */
  readonly subGroupByKey: string;
  readonly viewId: string;
}

/**
 * Columns grow with their content and the page scrolls, not the column: nested scrolling would need two gestures
 * and break dragging between columns. With a sub-grouping, bands span the whole board so columns stay aligned.
 */
export const PagesCollectionBoard = ({
  activeViewName,
  aggregates,
  bands,
  canEdit,
  groupByKey,
  isManualOrder,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  properties,
  schema,
  spaceId,
  subGroupByKey,
  viewId,
}: IProps) => {
  const t = useTranslations('pages');
  const isBanded = subGroupByKey !== '';
  const paging = usePagesBoardPaging({ bands, pageId: schema.pageId, spaceId, viewId });
  const drag = usePagesBoardDrag({
    bands: paging.bands,
    groupByKey,
    groupByMode: readPageViewConfiguration(schema.views.find((view) => view.id === viewId)?.configuration ?? {})
      .groupByMode,
    isManualOrder,
    pageId: schema.pageId,
    properties: schema.properties,
    spaceId,
    subGroupByKey,
    viewId,
  });
  const {
    onDragLeave: stopEdgeScrolling,
    onDragOver: scrollAtEdge,
    onDrop: dropAtEdge,
    surface,
  } = usePagesEdgeScrolling();
  const creation = usePagesRowCreation({
    bandedByKey: subGroupByKey,
    collectionPageId: schema.pageId,
    placedByKey: groupByKey,
    properties: schema.properties,
    spaceId,
  });
  const columns = usePagesBoardColumns(schema, groupByKey, activeViewName, spaceId);
  const [namingIn, setNamingIn] = useState<null | PageBoardNamingCell>(null);
  const [carriedColumn, setCarriedColumn] = useState<null | string>(null);
  const [columnTarget, setColumnTarget] = useState<null | string>(null);

  const columnDrag: PageBoardColumnDrag = {
    carried: carriedColumn,
    onDropOn: (beforeValue) => {
      const carried = carriedColumn;
      setCarriedColumn(null);
      setColumnTarget(null);
      if (carried !== null && carried !== beforeValue) columns.moveColumn(carried, beforeValue);
    },
    onEnd: () => {
      setCarriedColumn(null);
      setColumnTarget(null);
    },
    onOver: setColumnTarget,
    onStart: setCarriedColumn,
    target: columnTarget,
  };
  /** Only declared options are editable: columns derived from row values (dates, numbers) cannot be renamed alone. */
  const canCommandColumns =
    canEdit && (schema.properties.find((property) => property.key === groupByKey)?.options ?? null) !== null;
  const commandOf = (groupKey: string): null | PagesBoardColumns =>
    canCommandColumns && groupKey !== UNASSIGNED_GROUP_KEY ? columns : null;
  /** Only empty columns hide, and none while a card is dragged, so there is always somewhere to drop it. */
  const isShown = (group: { readonly key: string; readonly rows: readonly unknown[] }): boolean => {
    if (group.rows.length > 0 || drag.draggingRowId !== null) return true;
    if (group.key === UNASSIGNED_GROUP_KEY && columns.hidesUnassignedColumn) return false;
    return !columns.hidesEmptyGroups;
  };

  const createNamed = (bandKey: string, groupKey: string, title: string): void => {
    setNamingIn(null);
    creation.createRowIn(groupKey, title, bandKey);
  };

  return (
    <>
      <output aria-live="polite" className="sr-only">
        {drag.announcement}
      </output>
      {/* Bleeds past the body margin to use the full width; the padding restores it inside. */}
      <section
        aria-label={t('collection.boardColumns')}
        className="-mx-4 space-y-4 overflow-x-auto px-4 pb-3 sm:-mr-6 sm:-ml-14 sm:pr-6 sm:pl-14 lg:-mr-8 lg:-ml-16 lg:pr-8 lg:pl-16 xl:-mr-10 xl:pr-10"
        data-testid="collection-board"
        /* Dragging against the edge scrolls the board, so a card can reach an off-screen column in one gesture. */
        onDragLeave={stopEdgeScrolling}
        onDragOver={scrollAtEdge}
        onDrop={dropAtEdge}
        ref={surface}
      >
        {(isBanded ? drag.bands : drag.bands.slice(0, 1)).map((band) => (
          <section aria-label={isBanded ? band.label : undefined} data-testid="collection-board-band" key={band.key}>
            {isBanded && (
              <h3 className="flex items-center gap-2 pb-2 font-medium text-foreground text-sm">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(band.color))}
                />
                {band.key === UNASSIGNED_GROUP_KEY ? t('collection.unassignedGroup') : band.label}
                <span className="font-normal text-muted-foreground tabular-nums">
                  <PagesCollectionGroupCount
                    aggregates={aggregates}
                    bandKey={band.key}
                    drawn={band.groups.reduce((total, group) => total + group.rows.length, 0)}
                  />
                </span>
              </h3>
            )}
            <div className="flex items-start gap-3">
              {band.groups.filter(isShown).map((group) => (
                <PagesCollectionBoardColumn
                  aggregates={aggregates}
                  bandKey={band.key}
                  canDrag={canEdit}
                  canEdit={canEdit}
                  columnDrag={columnDrag}
                  columns={commandOf(group.key)}
                  drag={drag}
                  group={group}
                  isCollapsed={columns.collapsedColumns.includes(group.key)}
                  isCreating={creation.isCreating}
                  isLoadingMore={paging.isLoading(band.key, group.key)}
                  isNaming={namingIn?.bandKey === band.key && namingIn.groupKey === group.key}
                  key={group.key}
                  onCreate={(title) => createNamed(band.key, group.key, title)}
                  onLoadMore={() => paging.loadMore(band.key, group.key)}
                  onNameCancel={() => setNamingIn(null)}
                  onNameStart={() => setNamingIn({ bandKey: band.key, groupKey: group.key })}
                  personOptions={personOptions}
                  properties={properties}
                  spaceId={spaceId}
                />
              ))}
              {/* Only in the first band: a new column belongs to every band. */}
              {canCommandColumns && band.key === drag.bands[0]?.key && (
                <div className="flex shrink-0 flex-col items-start gap-1">
                  <PagesCollectionBoardNewColumn
                    disabled={columns.isBusy}
                    isCarryingColumn={carriedColumn !== null}
                    isColumnTarget={carriedColumn !== null && columnTarget === null}
                    onAdd={columns.addColumn}
                    onColumnDrop={() => columnDrag.onDropOn(null)}
                    onColumnOver={() => columnDrag.onOver(null)}
                  />
                  <Button
                    className="w-40 justify-start rounded-lg text-muted-foreground text-xs hover:text-foreground"
                    data-testid="board-toggle-unassigned"
                    disabled={columns.isBusy}
                    onClick={columns.toggleUnassignedColumn}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {columns.hidesUnassignedColumn ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                    {t(columns.hidesUnassignedColumn ? 'collection.showUnassigned' : 'collection.hideUnassigned')}
                  </Button>
                </div>
              )}
            </div>
          </section>
        ))}
      </section>
    </>
  );
};
