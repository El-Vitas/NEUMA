import { BADGE_BASE_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly dotColor: string;
  readonly label: string;
}

export const DotBadgeCell = ({ dotColor, label }: IProps) => (
  <span className={`inline-flex items-center gap-x-1.5 rounded-none px-2 py-1 font-medium text-xs ${BADGE_BASE_CLASS}`}>
    <span className={`size-1.5 rounded-full ${dotColor}`} />
    {label}
  </span>
);
