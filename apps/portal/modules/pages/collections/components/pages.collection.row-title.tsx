import { Maximize2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { PagesSidePanelLink } from '../../navigation/components/pages.side-panel.link';
import type { PageRow } from '../types/pages.schema.types';

interface IProps {
  readonly className?: string;
  readonly openFullPageLabel: string;
  readonly row: PageRow;
  readonly spaceId: string;
  readonly untitledLabel: string;
}

export const PagesCollectionRowTitle = ({ className, openFullPageLabel, row, spaceId, untitledLabel }: IProps) => {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <PagesSidePanelLink className="min-w-0 underline-offset-2 hover:underline" pageId={row.id}>
        {row.title.length > 0 ? row.title : untitledLabel}
      </PagesSidePanelLink>
      <Link
        aria-label={openFullPageLabel}
        className="-m-2 shrink-0 rounded-none p-2 text-muted-foreground hover:text-foreground"
        href={ROUTES.PORTAL_SPACE_PAGE(spaceId, row.id)}
        title={openFullPageLabel}
      >
        <Maximize2 aria-hidden="true" className="size-3.5" />
      </Link>
    </span>
  );
};
