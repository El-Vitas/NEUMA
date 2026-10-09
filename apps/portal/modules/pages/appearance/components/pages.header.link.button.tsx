'use client';

import { Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { useCopyPageLink } from '@/shared/hooks/use.copy-page-link.hook';

interface IProps {
  readonly pageId: string;
  readonly spaceId: string;
}

/** Offered to readers as well as editors: a link is shared so someone else can open the page. */
export const PagesHeaderLinkButton = ({ pageId, spaceId }: IProps) => {
  const t = useTranslations('pages');
  const copyPageLink = useCopyPageLink();

  return (
    <button
      aria-label={t('copyPageLink')}
      className={cn('grid size-11 place-items-center text-muted-foreground hover:text-foreground', FOCUS_RING_CLASS)}
      onClick={() => void copyPageLink(spaceId, pageId)}
      title={t('copyPageLink')}
      type="button"
    >
      <Link2 aria-hidden="true" className="size-4" />
    </button>
  );
};
