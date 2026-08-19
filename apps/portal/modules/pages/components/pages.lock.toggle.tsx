'use client';

import { Lock, LockOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { isActionSuccess } from '@/shared/lib/action-result';
import { setPageLockAction } from '../server/actions/pages.actions';
import type { PageSummary } from '../types/pages.types';

interface IProps {
  readonly isLocked: boolean;
  readonly onLockChange: (lockedAt: Date | null) => void;
  readonly pageId: string;
  readonly spaceId: string;
}

/**
 * Closes a page to edits, and opens it again.
 *
 * The same control does both and shows which one the page is in, because a lock
 * one cannot see is a page that has simply stopped accepting what is typed into
 * it, and a lock nobody present can lift is a page lost to a stray click.
 */
export const PagesLockToggle = ({ isLocked, onLockChange, pageId, spaceId }: IProps) => {
  const t = useTranslations('pages.lock');
  const [isPending, startTransition] = useTransition();

  const toggleLock = (): void => {
    startTransition(async () => {
      const result = await setPageLockAction({ locked: !isLocked, pageId, spaceId });
      if (!isActionSuccess<PageSummary>(result)) {
        toast.error(t('error'));
        return;
      }
      onLockChange(result.data.lockedAt ?? null);
      toast.success(isLocked ? t('unlocked') : t('locked'));
    });
  };

  return (
    <button
      aria-busy={isPending}
      aria-label={isLocked ? t('unlock') : t('lock')}
      aria-pressed={isLocked}
      className={cn(
        'grid size-11 place-items-center text-muted-foreground hover:text-foreground',
        FOCUS_RING_CLASS,
        isLocked && 'text-warning',
        isPending && 'opacity-50',
      )}
      disabled={isPending}
      onClick={toggleLock}
      title={isLocked ? t('unlock') : t('lock')}
      type="button"
    >
      {isLocked ? <Lock aria-hidden="true" className="size-4" /> : <LockOpen aria-hidden="true" className="size-4" />}
    </button>
  );
};
