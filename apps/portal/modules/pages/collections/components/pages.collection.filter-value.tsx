'use client';

import type { PageFilterCondition } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { filterOperatorNeedsValue } from '../lib/pages.view-filtering.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PageFilterPath, PagesViewFiltering } from '../types/pages.view-filtering.types';

interface IProps {
  readonly condition: PageFilterCondition;
  readonly filtering: PagesViewFiltering;
  readonly path: PageFilterPath;
  readonly property: PageSchemaProperty;
}

/**
 * Contra qué compara una condición.
 *
 * Una selección ofrece sus opciones en vez de pedir que se escriban, y un
 * operador que no pregunta por ningún valor —«está vacío»— deja el hueco
 * ocupado: sin él, la fila de al lado correría sus campos y las condiciones
 * dejarían de leerse en columnas.
 */
export const PagesCollectionFilterValue = ({ condition, filtering, path, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const textValue = typeof condition.value === 'string' ? condition.value : '';

  if (!filterOperatorNeedsValue(condition.operator)) {
    return <span aria-hidden="true" className="w-40 shrink-0" />;
  }

  if (property.options === null) {
    return (
      <Input
        aria-label={t('filterValueFor', { property: property.label })}
        className="h-8 w-40"
        defaultValue={textValue}
        disabled={filtering.isSaving}
        onBlur={(event) => filtering.setConditionValue(path, event.target.value)}
        placeholder={t('filterValuePlaceholder')}
      />
    );
  }

  return (
    <Select
      disabled={filtering.isSaving}
      onValueChange={(value) => filtering.setConditionValue(path, value)}
      value={textValue}
    >
      <SelectTrigger aria-label={t('filterValueFor', { property: property.label })} className="w-40" size="sm">
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
  );
};
