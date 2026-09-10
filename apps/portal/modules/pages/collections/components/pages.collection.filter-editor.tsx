'use client';

import { PAGE_FILTER_GROUP_OPERATOR } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { readFilterConditionKey } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesViewFiltering } from '../types/pages.view-filtering.types';
import { PagesCollectionFilterCondition } from './pages.collection.filter-condition';

interface IProps {
  readonly filtering: PagesViewFiltering;
  readonly properties: readonly PageSchemaProperty[];
}

/**
 * Lo que esta vista deja pasar.
 *
 * Las condiciones se juntan con «y» o con «o», y esa elección solo se ofrece
 * cuando hay más de una: preguntarla con una sola condición es preguntar por
 * algo que no cambia nada.
 */
export const PagesCollectionFilterEditor = ({ filtering, properties }: IProps) => {
  const t = useTranslations('pages.collection');
  const propertyOf = (key: string): PageSchemaProperty | undefined =>
    properties.find((property) => property.key === key);

  return (
    <div className="space-y-3">
      {filtering.conditions.length === 0 && <p className="text-muted-foreground text-sm">{t('noFilters')}</p>}
      {filtering.conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{t('joinConditions')}</span>
          <Select
            disabled={filtering.isSaving}
            onValueChange={(value) =>
              filtering.setJoinOperator(
                value === PAGE_FILTER_GROUP_OPERATOR.OR
                  ? PAGE_FILTER_GROUP_OPERATOR.OR
                  : PAGE_FILTER_GROUP_OPERATOR.AND,
              )
            }
            value={filtering.joinOperator}
          >
            <SelectTrigger aria-label={t('joinConditions')} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PAGE_FILTER_GROUP_OPERATOR.AND}>{t('joinAnd')}</SelectItem>
              <SelectItem value={PAGE_FILTER_GROUP_OPERATOR.OR}>{t('joinOr')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <ul className="m-0 list-none divide-y divide-border p-0">
        {filtering.conditions.map((condition, index) => {
          const property = propertyOf(condition.propertyKey);
          if (property === undefined) return null;
          return (
            <PagesCollectionFilterCondition
              condition={condition}
              filtering={filtering}
              index={index}
              key={readFilterConditionKey(condition)}
              property={property}
            />
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-border border-t pt-3">
        <Select
          disabled={filtering.isSaving || properties.length === 0}
          onValueChange={(value) => {
            const property = propertyOf(value);
            if (property !== undefined) filtering.addCondition(property);
          }}
          value=""
        >
          <SelectTrigger aria-label={t('addFilter')} className="w-56">
            <SelectValue placeholder={t('addFilter')} />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.key} value={property.key}>
                {property.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtering.conditions.length > 0 && (
          <Button
            className="min-h-11 rounded-none"
            disabled={filtering.isSaving}
            onClick={() => filtering.clearConditions()}
            type="button"
            variant="ghost"
          >
            {t('clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
};
