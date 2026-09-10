'use client';

import { PAGE_SORT_DIRECTION } from '@company-brain/shared';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesViewFiltering } from '../types/pages.view-filtering.types';

interface IProps {
  readonly filtering: PagesViewFiltering;
  readonly properties: readonly PageSchemaProperty[];
}

/**
 * En qué orden salen las filas.
 *
 * El orden es una cadena: la primera propiedad manda, y la siguiente solo
 * decide entre las filas que la anterior dejó empatadas. Por eso se muestran en
 * su orden y no como una lista suelta.
 */
export const PagesCollectionSortEditor = ({ filtering, properties }: IProps) => {
  const t = useTranslations('pages.collection');
  const labelOf = (key: string): string => properties.find((property) => property.key === key)?.label ?? key;
  const available = properties.filter((property) => !filtering.sorts.some((sort) => sort.propertyKey === property.key));

  return (
    <div className="space-y-3">
      {filtering.sorts.length === 0 && <p className="text-muted-foreground text-sm">{t('noSorts')}</p>}
      <ol className="m-0 list-none space-y-1 p-0">
        {filtering.sorts.map((sort, index) => (
          <li className="flex items-center gap-2" key={sort.propertyKey}>
            <span className="min-w-24 flex-1 text-foreground text-sm">{labelOf(sort.propertyKey)}</span>
            <Button
              aria-label={t(
                sort.direction === PAGE_SORT_DIRECTION.ASCENDING ? 'sortAscendingFor' : 'sortDescendingFor',
                { property: labelOf(sort.propertyKey) },
              )}
              className="min-h-11 rounded-none"
              disabled={filtering.isSaving}
              onClick={() => filtering.toggleSortDirection(index)}
              size="sm"
              type="button"
              variant="outline"
            >
              {sort.direction === PAGE_SORT_DIRECTION.ASCENDING ? (
                <ArrowUp aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-4" />
              )}
              {t(sort.direction === PAGE_SORT_DIRECTION.ASCENDING ? 'sortAscending' : 'sortDescending')}
            </Button>
            <Button
              aria-label={t('removeSortFor', { property: labelOf(sort.propertyKey) })}
              className="size-11"
              disabled={filtering.isSaving}
              onClick={() => filtering.removeSort(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="border-border border-t pt-3">
        <Select
          disabled={filtering.isSaving || available.length === 0}
          onValueChange={(value) => filtering.addSort(value)}
          value=""
        >
          <SelectTrigger aria-label={t('addSort')} className="w-56">
            <SelectValue placeholder={t('addSort')} />
          </SelectTrigger>
          <SelectContent>
            {available.map((property) => (
              <SelectItem key={property.key} value={property.key}>
                {property.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
