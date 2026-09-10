'use client';

import type { PageFilterCondition, PageFilterOperator } from '@company-brain/shared';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { filterOperatorNeedsValue, listFilterOperatorsFor } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesViewFiltering } from '../types/pages.view-filtering.types';

interface IProps {
  readonly condition: PageFilterCondition;
  readonly filtering: PagesViewFiltering;
  readonly index: number;
  readonly property: PageSchemaProperty;
}

/**
 * Una condición: qué propiedad, cómo se compara y contra qué.
 *
 * Los operadores que se ofrecen son los que esa clase de propiedad admite —una
 * fecha no «contiene» nada—, y el campo del valor desaparece cuando el operador
 * no pregunta por ninguno. Una selección ofrece sus opciones en vez de pedir
 * que se escriban.
 */
export const PagesCollectionFilterCondition = ({ condition, filtering, index, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const operators = listFilterOperatorsFor(property);
  const textValue = typeof condition.value === 'string' ? condition.value : '';

  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="min-w-24 font-medium text-foreground text-sm">{property.label}</span>
      <Select
        disabled={filtering.isSaving}
        onValueChange={(value) => filtering.setConditionOperator(index, value as PageFilterOperator)}
        value={condition.operator}
      >
        <SelectTrigger aria-label={t('filterOperatorFor', { property: property.label })} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((operator) => (
            <SelectItem key={operator} value={operator}>
              {t(`filterOperators.${operator}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {filterOperatorNeedsValue(condition.operator) &&
        (property.options === null ? (
          <Input
            aria-label={t('filterValueFor', { property: property.label })}
            className="w-44"
            defaultValue={textValue}
            disabled={filtering.isSaving}
            onBlur={(event) => filtering.setConditionValue(index, event.target.value)}
            placeholder={t('filterValuePlaceholder')}
          />
        ) : (
          <Select
            disabled={filtering.isSaving}
            onValueChange={(value) => filtering.setConditionValue(index, value)}
            value={textValue}
          >
            <SelectTrigger aria-label={t('filterValueFor', { property: property.label })} className="w-44">
              <SelectValue placeholder={t('filterValuePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {property.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      <Button
        aria-label={t('removeFilterFor', { property: property.label })}
        className="size-11"
        disabled={filtering.isSaving}
        onClick={() => filtering.removeCondition(index)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
};
