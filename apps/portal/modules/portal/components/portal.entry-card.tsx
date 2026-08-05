import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly href: string;
}

export const PortalEntryCard = ({ icon: Icon, title, description, href }: IProps) => {
  return (
    <Link
      className={`flex min-h-11 flex-col gap-2 border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 ${FOCUS_RING_CLASS}`}
      href={href}
    >
      <span className="flex items-center gap-3 font-display font-semibold text-foreground text-lg">
        <Icon aria-hidden="true" className="size-5 text-primary" />
        {title}
      </span>
      <span className="text-muted-foreground text-sm">{description}</span>
    </Link>
  );
};
