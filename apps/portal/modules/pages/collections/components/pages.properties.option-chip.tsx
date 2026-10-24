import type { PagePropertyOption } from '@neuma/shared';
import { cn } from '@/lib/utils';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import { PagesPropertiesStatusIcon } from './pages.properties.status-icon';

interface IProps {
  readonly option: PagePropertyOption;
}

/** A status carries a shape as well as a color: its group must not be told by color alone. */
export const PagesPropertiesOptionChip = ({ option }: IProps) => (
  <span
    className={cn('inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5', readPageOptionColorClass(option.color))}
  >
    {option.group !== null && <PagesPropertiesStatusIcon group={option.group} />}
    {option.value}
  </span>
);
