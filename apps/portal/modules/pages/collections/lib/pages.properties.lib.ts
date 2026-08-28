import type { PagePropertyContext } from '@company-brain/shared';
import {
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  pagePropertyRequiresPersonDirectory,
} from '@company-brain/shared';
import type {
  PagePersonOption,
  PagePropertyValue,
  PagePropertyValues,
  PageSchema,
  PageSchemaProperty,
} from '../types/pages.schema.types';

const toPropertyContext = (property: PageSchemaProperty): PagePropertyContext => ({
  options: property.options?.map((option) => option.value) ?? null,
  personIds: undefined,
});

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => !isTitlePageProperty(property.type));

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue =>
  getDefaultPagePropertyValue(property.type, toPropertyContext(property));

export const buildDefaultPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(properties.map((property) => [property.key, getDefaultPropertyValue(property)]));

/**
 * The defaults a row can be made with, leaving out what would be no answer.
 *
 * A collection may require an answer for every row, and it may also hold
 * properties nobody can guess — who it is for, when it is due. Sending an empty
 * one is worse than sending none: the collection reads it as an answer and
 * refuses it, and whoever pressed the button is told nothing they can act on.
 */
export const buildRowPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(
    properties
      .map((property) => [property, getDefaultPropertyValue(property)] as const)
      .filter(([property, value]) => !isPagePropertyValueEmpty(property.type, value))
      .map(([property, value]) => [property.key, value]),
  );

export const getStringPropertyValue = (value: PagePropertyValue | undefined): string =>
  typeof value === 'string' ? value : '';

export const getNumberPropertyValue = (value: PagePropertyValue | undefined): number =>
  typeof value === 'number' ? value : 0;

export const getBooleanPropertyValue = (value: PagePropertyValue | undefined): boolean =>
  typeof value === 'boolean' && value;

export const getMultiSelectPropertyValue = (value: PagePropertyValue | undefined): readonly string[] =>
  Array.isArray(value) ? value : [];

export const formatPropertyValueForDisplay = (
  property: PageSchemaProperty,
  value: PagePropertyValue | undefined,
): string => formatPagePropertyValue(property.type, value);

/** Whether a row answered a property at all, which is what decides if it takes room on a card. */
export const hasPropertyValueToShow = (value: PagePropertyValue | undefined): boolean =>
  value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

export const hasPersonProperty = (properties: readonly PageSchemaProperty[]): boolean =>
  properties.some((property) => pagePropertyRequiresPersonDirectory(property.type));

export const schemaNeedsPersonOptions = (schema: PageSchema | null): boolean =>
  hasPersonProperty(getEditableSchemaProperties(schema));

export const findPagePersonOption = (
  options: readonly PagePersonOption[],
  personId: string,
): PagePersonOption | undefined => options.find((option) => option.id === personId);

export const getPagePersonOptionLabel = (options: readonly PagePersonOption[], option: PagePersonOption): string => {
  const hasNameCollision = options.filter((candidate) => candidate.name === option.name).length > 1;
  return hasNameCollision ? `${option.name} (${option.email})` : option.name;
};

/** Which word a checkbox is read as, so the cell that shows it asks one question and not two. */
export const readCheckboxLabelKey = (value: PagePropertyValue | undefined): string =>
  getBooleanPropertyValue(value) ? 'properties.yes' : 'properties.no';
