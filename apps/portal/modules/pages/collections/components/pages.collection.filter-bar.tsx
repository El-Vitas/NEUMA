'use client';

import { ArrowUpDown, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { usePagesViewFiltering } from '../hooks/use.pages.view-filtering';
import type { PageSchema } from '../types/pages.schema.types';
import { PagesCollectionFilterEditor } from './pages.collection.filter-editor';
import { PagesCollectionSortEditor } from './pages.collection.sort-editor';

interface IProps {
  readonly activeViewName: string;
  readonly schema: PageSchema;
  readonly spaceId: string;
}

/**
 * Lo que esta vista deja pasar y en qué orden, al alcance de la mano.
 *
 * Vive sobre las filas y no dentro de la configuración de la colección porque
 * filtrar se hace mirando las filas: se prueba una condición, se ve qué quedó y
 * se corrige. Cada botón dice cuántas condiciones lleva puestas, para que no
 * haya que abrirlo para saber si la vista está filtrada.
 */
export const PagesCollectionFilterBar = ({ activeViewName, schema, spaceId }: IProps) => {
  const t = useTranslations('pages.collection');
  const filtering = usePagesViewFiltering(schema, activeViewName, spaceId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button className="min-h-11 rounded-md text-muted-foreground" size="sm" type="button" variant="ghost">
            <Filter aria-hidden="true" className="size-4" />
            {filtering.conditions.length === 0 ? t('filter') : t('filterCount', { count: filtering.conditions.length })}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(36rem,calc(100vw-2rem))]">
          <PagesCollectionFilterEditor filtering={filtering} properties={schema.properties} />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="min-h-11 rounded-md text-muted-foreground" size="sm" type="button" variant="ghost">
            <ArrowUpDown aria-hidden="true" className="size-4" />
            {filtering.sorts.length === 0 ? t('sort') : t('sortCount', { count: filtering.sorts.length })}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(30rem,calc(100vw-2rem))]">
          <PagesCollectionSortEditor filtering={filtering} properties={schema.properties} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
