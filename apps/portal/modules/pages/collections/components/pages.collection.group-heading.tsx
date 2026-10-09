import type { PageOptionColor } from '@company-brain/shared';
import { UNASSIGNED_GROUP_KEY } from '@company-brain/shared';
import { cn } from '@/lib/utils';
import { readPageOptionDotClass } from '../lib/pages.option-color.lib';

interface IProps {
  readonly color: null | PageOptionColor;
  readonly groupKey: string;
  readonly label: string;
  readonly rowCount: number;
  readonly unassignedLabel: string;
}

export const PagesCollectionGroupHeading = ({ color, groupKey, label, rowCount, unassignedLabel }: IProps) => {
  return (
    <h3 className="flex items-center gap-2 pb-2 font-medium text-foreground text-sm">
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', readPageOptionDotClass(color))} />
      {groupKey === UNASSIGNED_GROUP_KEY ? unassignedLabel : label}
      <span className="font-normal text-muted-foreground tabular-nums">{rowCount}</span>
    </h3>
  );
};
