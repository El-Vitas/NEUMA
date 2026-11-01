import type { PageStatusGroup } from '@neuma/shared';
import { PAGE_STATUS_GROUP } from '@neuma/shared';
import { Circle, CircleCheck, CircleDot } from 'lucide-react';

interface IProps {
  readonly group: PageStatusGroup;
}

export const PagesPropertiesStatusIcon = ({ group }: IProps) => {
  switch (group) {
    case PAGE_STATUS_GROUP.COMPLETE:
      return <CircleCheck aria-hidden="true" className="size-3.5 shrink-0" />;
    case PAGE_STATUS_GROUP.IN_PROGRESS:
      return <CircleDot aria-hidden="true" className="size-3.5 shrink-0" />;
    default:
      return <Circle aria-hidden="true" className="size-3.5 shrink-0" />;
  }
};
