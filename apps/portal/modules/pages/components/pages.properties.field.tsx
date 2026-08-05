'use client';

import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { FormField } from '@/shared/components/ui/form-field';
import {
  getBooleanPropertyValue,
  getMultiSelectPropertyValue,
  getNumberPropertyValue,
  getStringPropertyValue,
} from '../lib/pages.properties.lib';
import type { PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesCheckboxField } from './pages.properties.checkbox-field';
import { PagesPropertiesMultiSelectField } from './pages.properties.multi-select-field';
import { PagesPropertiesSelectField } from './pages.properties.select-field';

interface IProps {
  readonly disabled: boolean;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertiesField = ({ disabled, onChange, property, value }: IProps) => {
  const fieldId = `page-property-${property.key}`;

  switch (property.type) {
    case PAGE_PROPERTY_TYPE.SELECT:
      return (
        <PagesPropertiesSelectField
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          property={property}
          value={getStringPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
      return (
        <PagesPropertiesMultiSelectField
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          property={property}
          value={getMultiSelectPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return (
        <PagesPropertiesCheckboxField
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          property={property}
          value={getBooleanPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.DATE:
      return (
        <FormField
          disabled={disabled}
          id={fieldId}
          inputClassName="text-base"
          label={property.label}
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={getStringPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.NUMBER:
      return (
        <FormField
          disabled={disabled}
          id={fieldId}
          inputClassName="text-base"
          label={property.label}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={String(getNumberPropertyValue(value))}
        />
      );
    default:
      return (
        <FormField
          disabled={disabled}
          id={fieldId}
          inputClassName="text-base"
          label={property.label}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={getStringPropertyValue(value)}
        />
      );
  }
};
