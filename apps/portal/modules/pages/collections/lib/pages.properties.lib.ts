import type { PagePropertyContext, PagePropertyType } from '@company-brain/shared';
import {
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
  getPagePropertyLogicalType,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  PAGE_PROPERTY_LOGICAL_TYPE,
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

/** A view can reference a property the collection no longer has; the key is shown instead of a blank. */
export const readPropertyLabel = (properties: readonly PageSchemaProperty[], key: string): string =>
  properties.find((property) => property.key === key)?.label ?? key;

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => !isTitlePageProperty(property.type));

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue =>
  getDefaultPagePropertyValue(property.type, toPropertyContext(property));

export const buildDefaultPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(properties.map((property) => [property.key, getDefaultPropertyValue(property)]));

/** Empty defaults are omitted: the server would read them as an answer and refuse the row. */
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

/** Null when the assignee is unknown to the directory; empty string while the directory has not loaded. */
export const readPagePersonDisplayName = (
  options: readonly PagePersonOption[],
  value: PagePropertyValue | undefined,
): string | null => {
  if (typeof value !== 'string' || value === '') return '';
  if (options.length === 0) return '';
  const person = findPagePersonOption(options, value);
  return person === undefined ? null : getPagePersonOptionLabel(options, person);
};

/** Picked values are final at once; typed ones pass through half-written states, so they save on blur. */
export const pagePropertyAnswersOnPick = (type: PagePropertyType): boolean => {
  const logicalType = getPagePropertyLogicalType(type);
  return (
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN
  );
};

export const readCheckboxLabelKey = (value: PagePropertyValue | undefined): string =>
  getBooleanPropertyValue(value) ? 'properties.yes' : 'properties.no';
