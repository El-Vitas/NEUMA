'use client';

import type { PageFilterCondition } from '@neuma/shared';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { listFilterOperatorsFor, readFilterOperatorFor } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesViewFiltering } from '../types/pages.view-filtering.types';
import { PagesCollectionFilterValue } from './pages.collection.filter-value';

interface IProps {
  readonly condition: PageFilterCondition;
  readonly filtering: PagesViewFiltering;
  readonly path: PageFilterPath;
  readonly property: PageSchemaProperty;
}

/** Fields keep fixed widths so conditions align in columns; remove stays muted until hovered. */
export const PagesCollectionFilterCondition = ({ condition, filtering, path, property }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 truncate font-medium text-foreground text-sm" title={property.label}>
        {property.label}
      </span>
      <Select
        disabled={filtering.isSaving}
        onValueChange={(value) => filtering.setConditionOperator(path, readFilterOperatorFor(property, value))}
        value={condition.operator}
      >
        <SelectTrigger aria-label={t('filterOperatorFor', { property: property.label })} className="w-32" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {listFilterOperatorsFor(property).map((operator) => (
            <SelectItem key={operator} value={operator}>
              {t(`filterOperators.${operator}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PagesCollectionFilterValue condition={condition} filtering={filtering} path={path} property={property} />
      <Button
        aria-label={t('removeFilterFor', { property: property.label })}
        className="ml-auto size-11 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={filtering.isSaving}
        onClick={() => filtering.removeNode(path)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
};
