'use client';

import { useTranslations } from 'next-intl';
import { getEditableSchemaProperties } from '../lib/pages.properties.lib';
import type { PagePropertyValue, PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';

interface IProps {
  readonly canEdit: boolean;
  readonly onPropertyValueChange: (key: string, value: PagePropertyValue) => void;
  readonly parentSchema: PageSchema | null;
  readonly propertyValues: PagePropertyValues;
}

export const PagesPropertiesPanel = ({ canEdit, onPropertyValueChange, parentSchema, propertyValues }: IProps) => {
  const t = useTranslations('pages');
  const properties = getEditableSchemaProperties(parentSchema);
  if (properties.length === 0) return null;

  return (
    <section aria-label={t('properties.title')} className="max-w-336 space-y-4 border-border border-t pt-6">
      <h2 className="font-medium text-foreground text-sm">{t('properties.title')}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {properties.map((property) => (
          <PagesPropertiesField
            disabled={!canEdit}
            key={property.key}
            onChange={(value) => onPropertyValueChange(property.key, value)}
            property={property}
            value={propertyValues[property.key]}
          />
        ))}
      </div>
    </section>
  );
};
