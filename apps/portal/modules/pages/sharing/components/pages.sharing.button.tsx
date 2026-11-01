'use client';

import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import type { SharingChange } from '../types/pages.sharing.types';
import { PagesSharingBadge } from './pages.sharing.badge';
import { PagesSharingDialog } from './pages.sharing.dialog';

interface IProps {
  readonly hasOwnPermissions: boolean;
  readonly onChanged?: (change: SharingChange) => void;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}

/** The page's "Share" control: it shows a lock while the page declares its own access, and opens the dialog. */
export const PagesSharingButton = ({ hasOwnPermissions, onChanged, pageId, spaceId, title }: IProps) => {
  const t = useTranslations('pages.sharing');
  const [isOpen, setIsOpen] = useState(false);
  /** What the dialog just saved, kept only while the prop it was saved against has not moved on. */
  const [saved, setSaved] = useState<{ readonly basedOn: boolean; readonly value: boolean } | null>(null);
  const isRestricted = saved !== null && saved.basedOn === hasOwnPermissions ? saved.value : hasOwnPermissions;

  const handleChanged = (change: SharingChange): void => {
    setSaved({ basedOn: hasOwnPermissions, value: change.hasOwnPermissions });
    onChanged?.(change);
  };

  return (
    <>
      <Button
        aria-label={t('shareTitle')}
        className="min-h-11 gap-1.5"
        onClick={() => setIsOpen(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Share2 aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{t('share')}</span>
        {isRestricted && <PagesSharingBadge scope="page" />}
      </Button>
      {isOpen && (
        <PagesSharingDialog
          blockId={pageId}
          onChanged={handleChanged}
          onClose={() => setIsOpen(false)}
          scope="page"
          spaceId={spaceId}
          title={title}
        />
      )}
    </>
  );
};
