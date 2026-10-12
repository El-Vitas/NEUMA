'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { PagesTrashConfirmDialog } from './pages.trash.confirm.dialog';

interface IProps {
  readonly onTrashed: () => void;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}

export const PagesTrashButton = ({ onTrashed, pageId, spaceId, title }: IProps) => {
  const t = useTranslations('pages');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <button
        aria-label={t('trashPage')}
        className={cn('grid size-11 place-items-center text-muted-foreground hover:text-foreground', FOCUS_RING_CLASS)}
        onClick={() => setIsConfirmOpen(true)}
        title={t('trashHint')}
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
      {isConfirmOpen && (
        <PagesTrashConfirmDialog
          onClose={() => setIsConfirmOpen(false)}
          onTrashed={onTrashed}
          page={{ id: pageId, title }}
          spaceId={spaceId}
        />
      )}
    </>
  );
};
