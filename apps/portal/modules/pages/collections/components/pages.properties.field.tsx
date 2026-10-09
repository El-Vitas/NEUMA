'use client';

import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import { EMPTY_PAGE_PERSON_OPTIONS, PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME } from '../../constants/pages.constants';
import {
  getBooleanPropertyValue,
  getMultiSelectPropertyValue,
  getNumberPropertyValue,
  getStringPropertyValue,
} from '../lib/pages.properties.lib';
import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesCheckboxField } from './pages.properties.checkbox-field';
import { PagesPropertiesMultiSelectField } from './pages.properties.multi-select-field';
import { PagesPropertiesPersonField } from './pages.properties.person-field';
import { PagesPropertiesSelectField } from './pages.properties.select-field';

interface IProps {
  readonly ariaLabelledBy: string;
  readonly claimsFocus?: boolean;
  readonly disabled: boolean;
  /** Typed values are committed on blur; chosen values do not need it. */
  readonly onBlur?: () => void;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertiesField = ({
  ariaLabelledBy,
  claimsFocus = false,
  disabled,
  onBlur,
  onChange,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const fieldId = `page-property-${property.key}`;
  const emptyPlaceholder = t('properties.empty');
  const typedFieldProps = { autoFocus: claimsFocus, onBlur };

  switch (property.type) {
    case PAGE_PROPERTY_TYPE.SELECT:
      return (
        <PagesPropertiesSelectField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          placeholder={emptyPlaceholder}
          property={property}
          value={getStringPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
      return (
        <PagesPropertiesMultiSelectField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          property={property}
          value={getMultiSelectPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.PERSON:
      return (
        <PagesPropertiesPersonField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          options={personOptions}
          placeholder={emptyPlaceholder}
          value={getStringPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return (
        <PagesPropertiesCheckboxField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          value={getBooleanPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.DATE:
      return (
        <Input
          aria-labelledby={ariaLabelledBy}
          className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={getStringPropertyValue(value)}
          {...typedFieldProps}
        />
      );
    case PAGE_PROPERTY_TYPE.NUMBER:
      return (
        <Input
          aria-labelledby={ariaLabelledBy}
          className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => onChange(Number(event.target.value))}
          placeholder={emptyPlaceholder}
          type="number"
          value={value === undefined ? '' : String(getNumberPropertyValue(value))}
          {...typedFieldProps}
        />
      );
    default:
      return (
        <Input
          aria-labelledby={ariaLabelledBy}
          className={PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME}
          disabled={disabled}
          id={fieldId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={emptyPlaceholder}
          type="text"
          value={getStringPropertyValue(value)}
          {...typedFieldProps}
        />
      );
  }
};
