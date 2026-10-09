'use client';

import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { TableBody, TableCell, TableRow } from '@/shared/components/ui/table';
import { usePagesGroupCollapsing } from '../hooks/use.pages.group-collapsing';
import { usePagesGroupOrdering } from '../hooks/use.pages.group-ordering';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';
import type { PageSchema, PageTableGroup } from '../types/pages.schema.types';

interface IProps {
  readonly activeViewName: string;
  readonly canEdit: boolean;
  readonly columnCount: number;
  readonly groupByKey: string;
  readonly groups: readonly PageTableGroup[];
  readonly hidesEmptyGroups: boolean;
  readonly isGrouped: boolean;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/** One component owns every group: collapsed state is a single list, and per-band copies would overwrite each other. */
export const PagesCollectionTableGroups = ({
  activeViewName,
  canEdit,
  columnCount,
  groupByKey,
  groups,
  hidesEmptyGroups,
  isGrouped,
  schema,
  spaceId,
}: IProps) => {
  const t = useTranslations('pages.collection');
  const collapsing = usePagesGroupCollapsing(schema, activeViewName, spaceId);
  const ordering = usePagesGroupOrdering(schema, groupByKey, spaceId);

  const labelOf = (group: PageTableGroup): string =>
    group.key === UNASSIGNED_GROUP_KEY ? t('unassignedGroup') : group.label;

  if (!isGrouped) return groups.map((group) => <TableBody key={group.key}>{group.rows}</TableBody>);

  const shown = groups.filter((group) => !hidesEmptyGroups || group.rowCount > 0);
  /** The unassigned group always sits last and is not a declared value, so it is excluded from reordering. */
  const movable = shown.filter((group) => ordering.canMove(group.key)).map((group) => group.key);

  return shown.map((group) => (
    <TableBody key={group.key}>
      <TableRow className="bg-muted/40 hover:bg-muted/60" data-testid="collection-table-group">
        <TableCell className="p-0" colSpan={columnCount}>
          <div className="flex min-h-11 items-center gap-1 pr-2">
            <button
              aria-expanded={!collapsing.isCollapsed(group.key)}
              className="flex min-h-11 flex-1 items-center gap-2 px-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => collapsing.toggle(group.key)}
              type="button"
            >
              {collapsing.isCollapsed(group.key) ? (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span
                aria-hidden="true"
                className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(group.color))}
              />
              <span className="truncate font-medium text-foreground">{labelOf(group)}</span>
              <span className="text-muted-foreground tabular-nums">{group.rowCount}</span>
            </button>
            {/* Buttons instead of dragging the band: it spans the table and is already the collapse target. */}
            {canEdit && ordering.canMove(group.key) && (
              <>
                <Button
                  aria-label={t('moveGroupEarlier', { group: labelOf(group) })}
                  className="size-9 text-muted-foreground hover:text-foreground"
                  disabled={ordering.isBusy || movable.indexOf(group.key) === 0}
                  onClick={() => ordering.move(group.key, 'EARLIER')}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={t('moveGroupLater', { group: labelOf(group) })}
                  className="size-9 text-muted-foreground hover:text-foreground"
                  disabled={ordering.isBusy || movable.indexOf(group.key) === movable.length - 1}
                  onClick={() => ordering.move(group.key, 'LATER')}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {!collapsing.isCollapsed(group.key) && group.rows}
    </TableBody>
  ));
};
