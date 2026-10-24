'use client';

import { findPageOption, PAGE_PROPERTY_TYPE } from '@neuma/shared';
import { useLocale, useTranslations } from 'next-intl';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { usePagesCollectionLookups } from '../hooks/use.pages.collection-lookups';
import { formatDateValueForDisplay } from '../lib/pages.dates.lib';
import {
  formatPropertyValueForDisplay,
  getDatePropertyValue,
  getListPropertyValue,
  isComputedListProperty,
  joinPropertyNames,
  readCheckboxLabelKey,
  readPagePersonDisplayName,
  readShownProperty,
} from '../lib/pages.properties.lib';
import type {
  PageComputedError,
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '../types/pages.schema.types';
import { PagesPropertiesComputedError } from './pages.properties.computed-error';
import { PagesPropertiesLinkValue } from './pages.properties.link-value';
import { PagesPropertiesOptionChip } from './pages.properties.option-chip';

interface IProps {
  /** Why a formula or rollup could not be computed for this row; absent when it could. */
  readonly computedError?: PageComputedError;
  /** False inside a control that is itself clickable, where a link would nest one interactive element in another. */
  readonly isLinked?: boolean;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly value: PagePropertyValue | undefined;
}

export const PagesPropertyValue = ({
  computedError,
  isLinked = true,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property: declared,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const locale = useLocale();
  const lookups = usePagesCollectionLookups();
  const property = readShownProperty(declared);

  if (computedError !== undefined) return <PagesPropertiesComputedError error={computedError} />;
  if (isComputedListProperty(declared)) return joinPropertyNames(getListPropertyValue(value));

  switch (property.type) {
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return t(readCheckboxLabelKey(value));
    case PAGE_PROPERTY_TYPE.SELECT:
    case PAGE_PROPERTY_TYPE.STATUS: {
      const chosen = findPageOption(property.options, typeof value === 'string' ? value : '');
      return chosen === null ? null : <PagesPropertiesOptionChip option={chosen} />;
    }
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
      return (
        <span className="inline-flex flex-wrap gap-1">
          {getListPropertyValue(value).map((optionId) => {
            const chosen = findPageOption(property.options, optionId);
            return chosen === null ? null : <PagesPropertiesOptionChip key={optionId} option={chosen} />;
          })}
        </span>
      );
    case PAGE_PROPERTY_TYPE.PERSON:
    case PAGE_PROPERTY_TYPE.CREATED_BY:
    case PAGE_PROPERTY_TYPE.EDITED_BY: {
      const personIds = typeof value === 'string' ? [value] : getListPropertyValue(value);
      return joinPropertyNames(
        personIds.map(
          (personId) => readPagePersonDisplayName(personOptions, personId) ?? t('properties.unknownPerson'),
        ),
      );
    }
    case PAGE_PROPERTY_TYPE.DATE:
    case PAGE_PROPERTY_TYPE.CREATED_TIME:
    case PAGE_PROPERTY_TYPE.EDITED_TIME: {
      const date = getDatePropertyValue(value);
      return date === null ? '' : formatDateValueForDisplay(date, locale);
    }
    case PAGE_PROPERTY_TYPE.URL:
    case PAGE_PROPERTY_TYPE.EMAIL:
    case PAGE_PROPERTY_TYPE.PHONE:
      return (
        <PagesPropertiesLinkValue
          isLinked={isLinked}
          text={formatPropertyValueForDisplay(property, value)}
          type={property.type}
        />
      );
    case PAGE_PROPERTY_TYPE.FILES:
      return joinPropertyNames(
        getListPropertyValue(value).flatMap((fileId) => {
          const file = lookups.attachedFiles.find((candidate) => candidate.id === fileId);
          return file === undefined ? [] : [file.name];
        }),
      );
    case PAGE_PROPERTY_TYPE.RELATION:
      return joinPropertyNames(
        getListPropertyValue(value).flatMap((rowId) => {
          const row = lookups.relatedRows.find((candidate) => candidate.id === rowId);
          return row === undefined ? [] : [row.title === '' ? t('untitled') : row.title];
        }),
      );
    default:
      return formatPropertyValueForDisplay(property, value);
  }
};
