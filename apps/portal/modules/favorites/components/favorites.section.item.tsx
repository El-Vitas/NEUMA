'use client';

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { FavoritePage } from '@/shared/types/favorites.types';

interface IProps {
  readonly canMoveDown: boolean;
  readonly canMoveUp: boolean;
  readonly favorite: FavoritePage;
  readonly onMoveDown: (pageId: string) => void;
  readonly onMoveUp: (pageId: string) => void;
  readonly onNavigate?: () => void;
  readonly onRemove: (pageId: string) => void;
}

export const FavoritesSectionItem = ({
  canMoveDown,
  canMoveUp,
  favorite,
  onMoveDown,
  onMoveUp,
  onNavigate,
  onRemove,
}: IProps) => {
  const t = useTranslations('pages');
  const favoriteActionButtonClass = cn(
    'grid size-11 shrink-0 place-items-center text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:pointer-events-none disabled:opacity-30 lg:opacity-0 lg:group-hover/favorite:opacity-100 lg:focus-visible:opacity-100',
    FOCUS_RING_CLASS,
  );

  return (
    <li className="group/favorite relative flex min-h-11 items-center pr-1" data-favorite-item="true">
      <Link
        className={cn(
          'flex min-h-11 min-w-0 flex-1 items-center gap-1.5 px-2 text-sidebar-foreground/65 text-sm hover:bg-sidebar-accent hover:text-sidebar-foreground',
          FOCUS_RING_CLASS,
        )}
        href={ROUTES.PORTAL_SPACE_PAGE(favorite.spaceId, favorite.pageId)}
        onClick={onNavigate}
        title={favorite.title}
      >
        <span className="min-w-0 truncate">{favorite.title}</span>
      </Link>
      <button
        aria-label={t('favorites.moveUp', { name: favorite.title })}
        className={favoriteActionButtonClass}
        disabled={!canMoveUp}
        onClick={() => onMoveUp(favorite.pageId)}
        type="button"
      >
        <ChevronUp aria-hidden="true" className="size-3.5" />
      </button>
      <button
        aria-label={t('favorites.moveDown', { name: favorite.title })}
        className={favoriteActionButtonClass}
        disabled={!canMoveDown}
        onClick={() => onMoveDown(favorite.pageId)}
        type="button"
      >
        <ChevronDown aria-hidden="true" className="size-3.5" />
      </button>
      <button
        aria-label={t('favorites.remove', { name: favorite.title })}
        className={favoriteActionButtonClass}
        onClick={() => onRemove(favorite.pageId)}
        type="button"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
};
