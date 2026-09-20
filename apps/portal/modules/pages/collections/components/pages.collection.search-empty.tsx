'use client';

import { useTranslations } from 'next-intl';
import { usePagesRowSearch } from '../hooks/use.pages.row-search';

/**
 * Lo que se dice cuando lo buscado no está en ninguna fila.
 *
 * Una tabla con la cabecera puesta y nada debajo parece rota, o parece que la
 * colección se vació. Decirlo, con lo que se buscó delante, evita las dos
 * lecturas.
 */
export const PagesCollectionSearchEmpty = () => {
  const t = useTranslations('pages.collection');
  const search = usePagesRowSearch();
  if (search === null || !search.searching || search.matchCount > 0) return null;

  return (
    <p className="px-1 py-6 text-center text-muted-foreground text-sm" data-testid="search-no-matches">
      {t('searchNoMatches', { query: search.query.trim() })}
    </p>
  );
};
