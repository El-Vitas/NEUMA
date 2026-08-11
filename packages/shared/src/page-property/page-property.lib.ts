import type { PagePropertyType } from '../types/page-schema.types.js';
import { PAGE_PROPERTY_DEFINITIONS } from './page-property.definitions.js';
import type {
  PagePropertyContext,
  PagePropertyDefinition,
  PagePropertyLogicalType,
  PagePropertyValue,
  PagePropertyValues,
} from './page-property.types.js';

export { humanizeSelectOption } from './page-property.definitions.js';

export const getPagePropertyDefinition = (type: PagePropertyType): PagePropertyDefinition =>
  PAGE_PROPERTY_DEFINITIONS[type];

export const isTitlePageProperty = (type: PagePropertyType): boolean =>
  getPagePropertyDefinition(type).capabilities.isTitle;

export const pagePropertyRequiresOptions = (type: PagePropertyType): boolean =>
  getPagePropertyDefinition(type).capabilities.requiresOptions;

export const pagePropertyRequiresPersonDirectory = (type: PagePropertyType): boolean =>
  getPagePropertyDefinition(type).capabilities.requiresPersonDirectory;

export const canPagePropertyGroupBoard = (type: PagePropertyType): boolean =>
  getPagePropertyDefinition(type).capabilities.canGroupBoard;

export const getDefaultPagePropertyValue = (type: PagePropertyType, context: PagePropertyContext): PagePropertyValue =>
  getPagePropertyDefinition(type).getDefaultValue(context);

export const isValidPagePropertyValue = (
  type: PagePropertyType,
  value: PagePropertyValue,
  context: PagePropertyContext,
): boolean => getPagePropertyDefinition(type).isValidValue(value, context);

export const readPagePropertyValue = (
  propertyValues: PagePropertyValues,
  key: string,
): PagePropertyValue | undefined => (Object.hasOwn(propertyValues, key) ? propertyValues[key] : undefined);

export const isPagePropertyValueEmpty = (type: PagePropertyType, value: PagePropertyValue | undefined): boolean =>
  value === undefined || getPagePropertyDefinition(type).isEmptyValue(value);

export const getPagePropertyLogicalType = (type: PagePropertyType): PagePropertyLogicalType =>
  getPagePropertyDefinition(type).logicalType;

export const formatPagePropertyValue = (type: PagePropertyType, value: PagePropertyValue | undefined): string =>
  value === undefined ? '' : getPagePropertyDefinition(type).toDisplayString(value);
