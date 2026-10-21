import type { PageOptionColor } from '@neuma/shared';
import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';

interface IProps {
  readonly color: null | PageOptionColor;
  /** How many rows the group holds, which the database finishes counting after the rows are drawn. */
  readonly count: ReactNode;
  readonly groupKey: string;
  readonly label: string;
  readonly unassignedLabel: string;
}

export const PagesCollectionGroupHeading = ({ color, count, groupKey, label, unassignedLabel }: IProps) => {
  return (
    <h3 className="flex items-center gap-2 pb-2 font-medium text-foreground text-sm">
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(color))} />
      {groupKey === UNASSIGNED_GROUP_KEY ? unassignedLabel : label}
      <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
    </h3>
  );
};
