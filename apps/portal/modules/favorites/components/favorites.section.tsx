'use client';

import { useTranslations } from 'next-intl';
import type { FavoritePage } from '@/shared/types/favorites.types';
import { useFavorites } from '../hooks/use.favorites';
import { canMoveFavoriteDown, canMoveFavoriteUp } from '../lib/favorites.lib';
import { FavoritesSectionItem } from './favorites.section.item';

interface IProps {
  readonly favorites: readonly FavoritePage[];
  readonly onNavigate?: () => void;
}

export const FavoritesSection = ({ favorites: serverFavorites, onNavigate }: IProps) => {
  const t = useTranslations('pages');
  const { favorites, moveFavorite, removeFavorite } = useFavorites(serverFavorites);

  return (
    <section aria-label={t('favorites.title')} className="px-2 pb-2">
      <h2 className="px-3 py-2 font-semibold text-[11px] text-sidebar-foreground/50 uppercase tracking-[0.12em]">
        {t('favorites.title')}
      </h2>
      {favorites.length === 0 ? (
        <p className="px-3 pb-2 text-sidebar-foreground/50 text-sm">{t('favorites.empty')}</p>
      ) : (
        <ul aria-label={t('favorites.title')} className="space-y-px">
          {favorites.map((favorite) => (
            <FavoritesSectionItem
              canMoveDown={canMoveFavoriteDown(favorites, favorite.pageId)}
              canMoveUp={canMoveFavoriteUp(favorites, favorite.pageId)}
              favorite={favorite}
              key={favorite.pageId}
              onMoveDown={(pageId) => void moveFavorite(pageId, 'down')}
              onMoveUp={(pageId) => void moveFavorite(pageId, 'up')}
              onNavigate={onNavigate}
              onRemove={(pageId) => void removeFavorite(pageId)}
            />
          ))}
        </ul>
      )}
    </section>
  );
};
