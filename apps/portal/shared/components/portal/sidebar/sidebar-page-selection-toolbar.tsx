'use client';

import { FolderInput, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onMove: () => void;
  readonly onTrash: () => void;
  readonly selectedCount: number;
}

/**
 * What a selection can do while it is active: move it, trash it, or drop it —
 * always with the count in view, so nobody acts on more or fewer pages than
 * they meant to.
 */
export const SidebarPageSelectionToolbar = ({ disabled, onCancel, onMove, onTrash, selectedCount }: IProps) => {
  const t = useTranslations('pages.selection');

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 border-border border-b px-2 py-1.5">
      <span className="min-w-0 truncate text-sidebar-foreground/70 text-xs">
        {t('count', { count: selectedCount })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          className={cn('min-h-11 min-w-11', FOCUS_RING_CLASS)}
          disabled={disabled || selectedCount === 0}
          onClick={onMove}
          size="icon"
          title={t('move')}
          type="button"
          variant="ghost"
        >
          <FolderInput aria-hidden="true" className="size-4" />
          <span className="sr-only">{t('move')}</span>
        </Button>
        <Button
          className={cn('min-h-11 min-w-11', FOCUS_RING_CLASS)}
          disabled={disabled || selectedCount === 0}
          onClick={onTrash}
          size="icon"
          title={t('trash')}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">{t('trash')}</span>
        </Button>
        <Button
          className={cn('min-h-11 min-w-11', FOCUS_RING_CLASS)}
          disabled={disabled}
          onClick={onCancel}
          size="icon"
          title={t('cancel')}
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">{t('cancel')}</span>
        </Button>
      </div>
    </div>
  );
};
