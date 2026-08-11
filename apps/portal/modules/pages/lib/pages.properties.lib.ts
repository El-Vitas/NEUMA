import type { PagePropertyContext } from '@company-brain/shared';
import {
  formatPagePropertyValue,
  getDefaultPagePropertyValue,
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
  options: property.options,
  personIds: undefined,
});

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => !isTitlePageProperty(property.type));

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue =>
  getDefaultPagePropertyValue(property.type, toPropertyContext(property));

export const buildDefaultPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(properties.map((property) => [property.key, getDefaultPropertyValue(property)]));

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
