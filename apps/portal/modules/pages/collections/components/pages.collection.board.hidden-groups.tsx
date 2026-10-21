'use client';

import type { PageGroupByMode } from '@neuma/shared';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { describeGroupKey } from '../lib/pages.query-outcome.lib';
import type { PagesBoardColumns } from '../types/pages.board-columns.types';
import type { PageSchemaProperty, PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionGroupCount } from './pages.collection.group-count';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly columns: PagesBoardColumns;
  readonly groupByKey: string;
  readonly mode: PageGroupByMode;
  readonly properties: readonly PageSchemaProperty[];
}

/** The groups the view keeps out of sight, each with how many rows it holds, and the way to bring it back. */
export const PagesCollectionBoardHiddenGroups = ({ aggregates, columns, groupByKey, mode, properties }: IProps) => {
  const t = useTranslations('pages.collection');
  if (columns.hiddenColumns.length === 0) return null;
  const property = properties.find((candidate) => candidate.key === groupByKey);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('hiddenGroups', { count: columns.hiddenColumns.length })}
          className="min-h-11 rounded-md text-muted-foreground"
          data-testid="board-hidden-groups"
          disabled={columns.isBusy}
          size="sm"
          type="button"
          variant="ghost"
        >
          <EyeOff aria-hidden="true" className="size-4" />
          <span className="tabular-nums">{columns.hiddenColumns.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {columns.hiddenColumns.map((key) => {
          const { label } = describeGroupKey(property, mode, key, (group) => t(`statusGroups.${group}`));
          return (
            <DropdownMenuItem key={key} onSelect={() => columns.toggleHidden(key)}>
              <Eye aria-hidden="true" className="size-4" />
              <span className="flex-1 truncate">{t('showGroup', { group: label })}</span>
              <span className="text-muted-foreground tabular-nums">
                <PagesCollectionGroupCount aggregates={aggregates} drawn={0} groupKey={key} />
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
