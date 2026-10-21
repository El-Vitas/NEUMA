'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { getDefaultPropertyValue, isPropertyBulkAssignable } from '../lib/pages.properties.lib';
import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';

interface IProps {
  readonly onAssign: (propertyKey: string, value: PagePropertyValue) => void;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly rowCount: number;
}

export const PagesCollectionSelectionAssign = ({ onAssign, personOptions, properties, rowCount }: IProps) => {
  const t = useTranslations('pages.collection');
  const labelId = useId();
  const [chosen, setChosen] = useState<null | PageSchemaProperty>(null);
  const [value, setValue] = useState<PagePropertyValue>('');

  const chooseProperty = (propertyKey: string): void => {
    const property = properties.find((candidate) => candidate.key === propertyKey);
    if (property === undefined) return;
    setChosen(property);
    setValue(getDefaultPropertyValue(property));
  };

  return (
    <div className="space-y-2">
      <p className="px-1 text-muted-foreground text-xs">{t('bulkAssignHint', { count: rowCount })}</p>
      <Select onValueChange={chooseProperty} value={chosen?.key ?? ''}>
        <SelectTrigger aria-label={t('bulkWhich')} className="w-full">
          <SelectValue placeholder={t('bulkWhich')} />
        </SelectTrigger>
        <SelectContent>
          {properties.filter(isPropertyBulkAssignable).map((property) => (
            <SelectItem key={property.key} value={property.key}>
              {property.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {chosen !== null && (
        <>
          <span className="sr-only" id={labelId}>
            {chosen.label}
          </span>
          <PagesPropertiesField
            ariaLabelledBy={labelId}
            disabled={false}
            onChange={setValue}
            personOptions={personOptions}
            property={chosen}
            value={value}
          />
          <Button
            className="min-h-11 w-full"
            onClick={() => onAssign(chosen.key, value)}
            type="button"
            variant="outline"
          >
            {t('bulkAssignConfirm')}
          </Button>
        </>
      )}
    </div>
  );
};
