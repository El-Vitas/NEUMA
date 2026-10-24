'use client';

import type { PageGroupByMode } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { usePagesViewSaving } from '../hooks/use.pages.view-saving';
import { listGroupablePropertyKeys, setViewSubGroupBy } from '../lib/pages.view-editing.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageSchema, PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionBoardHiddenGroups } from './pages.collection.board.hidden-groups';
import { PagesCollectionCardOptions } from './pages.collection.card-options';

interface IProps {
  readonly activeViewName: string;
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly columns: PagesBoardColumns;
  readonly groupByKey: string;
  readonly mode: PageGroupByMode;
  readonly schema: PageSchema;
  readonly spaceId: string;
  /** Empty when the board has a single grouping dimension. */
  readonly subGroupByKey: string;
}

/** What only whoever edits the view sees above a board: the bands, the groups kept out of sight, and the cards. */
export const PagesCollectionBoardToolbar = ({
  activeViewName,
  aggregates,
  columns,
  groupByKey,
  mode,
  schema,
  spaceId,
  subGroupByKey,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const { apply, isSaving } = usePagesViewSaving(schema, activeViewName, spaceId);
  const bandable = listGroupablePropertyKeys(schema.properties).filter((key) => key !== groupByKey);
  const labelOf = (key: string): string => schema.properties.find((property) => property.key === key)?.label ?? key;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1" data-testid="board-toolbar">
      <Select
        disabled={isSaving || bandable.length === 0}
        onValueChange={(value) =>
          apply((current) => setViewSubGroupBy(current, activeViewName, value === PAGE_VIEW_NO_GROUP ? null : value))
        }
        value={subGroupByKey === '' ? PAGE_VIEW_NO_GROUP : subGroupByKey}
      >
        <SelectTrigger aria-label={t('bandsFor', { view: activeViewName })} className="h-9 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PAGE_VIEW_NO_GROUP}>{t('noBands')}</SelectItem>
          {bandable.map((key) => (
            <SelectItem key={key} value={key}>
              {t('bandsByProperty', { property: labelOf(key) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PagesCollectionBoardHiddenGroups
        aggregates={aggregates}
        columns={columns}
        groupByKey={groupByKey}
        mode={mode}
        properties={schema.properties}
      />
      <PagesCollectionCardOptions activeViewName={activeViewName} schema={schema} spaceId={spaceId} />
    </div>
  );
};
