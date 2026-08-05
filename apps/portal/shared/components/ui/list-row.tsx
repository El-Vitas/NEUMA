import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

interface IProps {
  readonly href: string;
  readonly secondary: ReactNode;
  readonly title: string;
  readonly trailing?: ReactNode;
}

const ListRow = ({ href, secondary, title, trailing }: IProps) => (
  <li>
    <Link
      className="group flex min-h-16 items-center justify-between gap-3 bg-surface px-4 py-3 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-20 sm:gap-6 sm:px-6 sm:py-4"
      href={href}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-base text-foreground group-hover:text-primary sm:text-lg">
          {title}
        </span>
        <span className="mt-1 block text-muted-foreground text-sm">{secondary}</span>
      </span>
      {trailing}
    </Link>
  </li>
);

export type { IProps as ListRowProps };
export { ListRow };
