'use client';

import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addFavoriteAction, removeFavoriteAction } from '@/modules/favorites/server/actions/favorites.actions';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { hasActionError } from '@/shared/lib/action-result';

interface IProps {
  readonly isFavorite: boolean;
  readonly pageId: string;
  readonly title: string;
}

export const PageFavoriteToggle = ({ isFavorite, pageId, title }: IProps) => {
  const t = useTranslations('pages');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /**
   * The star answers to the server. The click only borrows it while the
   * mutation travels, so the same page unfavorited from the sidebar leaves no
   * stale star behind here.
   */
  const [favorite, showFavorite] = useOptimistic(isFavorite);

  const toggleFavorite = (): void => {
    const nextFavorite = !favorite;
    startTransition(async () => {
      showFavorite(nextFavorite);
      const result = nextFavorite ? await addFavoriteAction({ pageId }) : await removeFavoriteAction({ pageId });
      if (hasActionError(result)) {
        toast.error(t('permissionError'));
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      aria-label={favorite ? t('favorites.remove', { name: title }) : t('favorites.add', { name: title })}
      aria-pressed={favorite}
      className={cn(
        'grid size-11 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground',
        FOCUS_RING_CLASS,
      )}
      disabled={isPending}
      onClick={toggleFavorite}
      type="button"
    >
      <Star aria-hidden="true" className={cn('size-4', favorite && 'fill-primary text-primary')} />
    </button>
  );
};
