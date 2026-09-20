'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { usePagesRowSearch } from '../hooks/use.pages.row-search';

/**
 * El buscador de la colección: encuentra entre lo que ya se está viendo.
 *
 * Responde al teclear, sin viaje: las filas que el filtro dejó pasar están
 * todas en pantalla, así que buscar es quedarse con unas cuantas y no volver a
 * pedirlas.
 */
export const PagesCollectionSearchField = () => {
  const t = useTranslations('pages.collection');
  const search = usePagesRowSearch();
  if (search === null) return null;

  return (
    <div className="flex items-center gap-1">
      <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <Input
        aria-label={t('searchRows')}
        className="h-9 w-40 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        onChange={(event) => search.setQuery(event.target.value)}
        placeholder={t('searchRows')}
        value={search.query}
      />
      {/* Cuántas quedaron de las que había: el de arriba cuenta lo que pasa el filtro, este lo que encuentra la búsqueda. */}
      {search.searching && (
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {t('searchMatches', { shown: search.matchCount, total: search.total })}
        </span>
      )}
      {search.searching && (
        <Button
          aria-label={t('searchClear')}
          className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => search.setQuery('')}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  );
};
