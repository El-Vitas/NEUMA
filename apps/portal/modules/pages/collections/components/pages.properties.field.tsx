'use client';

import { isPagePropertySystemManaged, PAGE_PROPERTY_TYPE } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_PERSON_OPTIONS,
  PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME,
} from '../../constants/pages.constants';
import { PAGE_TEXT_INPUT_TYPE_BY_PROPERTY_TYPE } from '../constants/pages.fields.constants';
import {
  getBooleanPropertyValue,
  getDatePropertyValue,
  getListPropertyValue,
  getNumberPropertyValue,
  getStringPropertyValue,
} from '../lib/pages.properties.lib';
import type {
  PageComputedError,
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '../types/pages.schema.types';
import { PagesPropertiesCheckboxField } from './pages.properties.checkbox-field';
import { PagesPropertiesDateField } from './pages.properties.date-field';
import { PagesPropertiesFilesField } from './pages.properties.files-field';
import { PagesPropertiesMultiSelectField } from './pages.properties.multi-select-field';
import { PagesPropertiesNumberField } from './pages.properties.number-field';
import { PagesPropertiesPeopleField } from './pages.properties.people-field';
import { PagesPropertiesPersonField } from './pages.properties.person-field';
import { PagesPropertiesRelationField } from './pages.properties.relation-field';
import { PagesPropertiesSelectField } from './pages.properties.select-field';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly ariaLabelledBy: string;
  /** The files of the row's own page, which a files property chooses from. */
  readonly attachments?: readonly AttachmentSummary[];
  readonly claimsFocus?: boolean;
  /** Why a formula or rollup could not be computed in this row. */
  readonly computedError?: PageComputedError;
  readonly disabled: boolean;
  /** Typed values are committed on blur; chosen values do not need it. */
  readonly onBlur?: () => void;
  readonly onChange: (value: PagePropertyValue) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  /** The row the value belongs to; a relation changes it by itself, so it must know which one. */
  readonly rowId?: string;
  readonly spaceId?: string;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertiesField = ({
  ariaLabelledBy,
  attachments = EMPTY_PAGE_ATTACHMENTS,
  claimsFocus = false,
  computedError,
  disabled,
  onBlur,
  onChange,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  rowId = '',
  spaceId = '',
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const fieldId = `page-property-${property.key}`;
  const emptyPlaceholder = t('properties.empty');
  const typedFieldProps = { autoFocus: claimsFocus, onBlur };

  if (isPagePropertySystemManaged(property.type)) {
    return (
      <span className="block min-h-11 content-center px-2 text-sm" id={fieldId}>
        <PagesPropertyValue
          computedError={computedError}
          personOptions={personOptions}
          property={property}
          value={value}
        />
      </span>
    );
  }

  switch (property.type) {
    case PAGE_PROPERTY_TYPE.SELECT:
    case PAGE_PROPERTY_TYPE.STATUS:
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
          value={getListPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.PERSON:
      return property.config.allowsMultiple ? (
        <PagesPropertiesPeopleField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          options={personOptions}
          value={getListPropertyValue(value)}
        />
      ) : (
        <PagesPropertiesPersonField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          onChange={(personId) => onChange(personId === '' ? [] : [personId])}
          options={personOptions}
          placeholder={emptyPlaceholder}
          value={getListPropertyValue(value).at(0) ?? ''}
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
        <PagesPropertiesDateField
          ariaLabelledBy={ariaLabelledBy}
          autoFocus={claimsFocus}
          disabled={disabled}
          fieldId={fieldId}
          onBlur={onBlur}
          onChange={(date) => onChange(date ?? '')}
          value={getDatePropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.NUMBER:
      return (
        <PagesPropertiesNumberField
          ariaLabelledBy={ariaLabelledBy}
          autoFocus={claimsFocus}
          config={property.config}
          disabled={disabled}
          fieldId={fieldId}
          onBlur={onBlur}
          onChange={onChange}
          placeholder={emptyPlaceholder}
          value={value === undefined ? undefined : getNumberPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.RELATION:
      return (
        <PagesPropertiesRelationField
          ariaLabelledBy={ariaLabelledBy}
          disabled={disabled}
          fieldId={fieldId}
          property={property}
          rowId={rowId}
          spaceId={spaceId}
          value={getListPropertyValue(value)}
        />
      );
    case PAGE_PROPERTY_TYPE.FILES:
      return (
        <PagesPropertiesFilesField
          ariaLabelledBy={ariaLabelledBy}
          attachments={attachments}
          disabled={disabled}
          fieldId={fieldId}
          onChange={onChange}
          value={getListPropertyValue(value)}
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
          type={PAGE_TEXT_INPUT_TYPE_BY_PROPERTY_TYPE[property.type] ?? 'text'}
          value={getStringPropertyValue(value)}
          {...typedFieldProps}
        />
      );
  }
};
