import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import type {
  PagePropertyValue,
  PagePropertyValues,
  PageSchema,
  PageSchemaProperty,
} from '../types/pages.schema.types';

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => property.type !== PAGE_PROPERTY_TYPE.TITLE);

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue => {
  switch (property.type) {
    case PAGE_PROPERTY_TYPE.MULTI_SELECT:
      return [];
    case PAGE_PROPERTY_TYPE.CHECKBOX:
      return false;
    case PAGE_PROPERTY_TYPE.NUMBER:
      return 0;
    case PAGE_PROPERTY_TYPE.SELECT:
      return property.options?.[0] ?? '';
    default:
      return '';
  }
};

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
): string => {
  if (value === undefined) return '';
  if (property.type === PAGE_PROPERTY_TYPE.MULTI_SELECT) return getMultiSelectPropertyValue(value).join(', ');
  return String(value);
};
