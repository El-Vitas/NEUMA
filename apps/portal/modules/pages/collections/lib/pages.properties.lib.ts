import type { PagePropertyContext, PagePropertyType } from '@neuma/shared';
import {
  formatPageComputedNumber,
  formatPagePropertyValue,
  formatPageUniqueId,
  getDefaultPagePropertyValue,
  getPagePropertyLogicalType,
  isPageComputedPropertyType,
  isPageDateValue,
  isPagePropertySystemManaged,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  PAGE_PROPERTY_LOGICAL_TYPE,
  PAGE_PROPERTY_TYPE,
  pagePropertyRequiresPersonDirectory,
  readPageEffectivePropertyType,
  toValueList,
} from '@neuma/shared';
import { ONLINE_ONLY_CELL_TYPES } from '../constants/pages.fields.constants';
import type {
  PagePersonOption,
  PagePropertyValue,
  PagePropertyValues,
  PageSchema,
  PageSchemaProperty,
} from '../types/pages.schema.types';

const toPropertyContext = (property: PageSchemaProperty): PagePropertyContext => ({
  config: property.config,
  options: property.options,
  personIds: undefined,
});

const isAuthorProperty = (type: PagePropertyType): boolean =>
  type === PAGE_PROPERTY_TYPE.CREATED_BY || type === PAGE_PROPERTY_TYPE.EDITED_BY;

/** A view can reference a property the collection no longer has; the key is shown instead of a blank. */
export const readPropertyLabel = (properties: readonly PageSchemaProperty[], key: string): string =>
  properties.find((property) => property.key === key)?.label ?? key;

export const getEditableSchemaProperties = (schema: PageSchema | null): readonly PageSchemaProperty[] =>
  schema === null ? [] : schema.properties.filter((property) => !isTitlePageProperty(property.type));

export const getDefaultPropertyValue = (property: PageSchemaProperty): PagePropertyValue =>
  getDefaultPagePropertyValue(property.type, toPropertyContext(property));

export const buildDefaultPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(properties.map((property) => [property.key, getDefaultPropertyValue(property)]));

/**
 * Empty defaults are omitted: the server would read them as an answer and refuse the row. What the server fills
 * itself (unique ids, who made it and when) is not sent either, since a client write to it is refused.
 */
export const buildRowPropertyValues = (properties: readonly PageSchemaProperty[]): PagePropertyValues =>
  Object.fromEntries(
    properties
      .filter((property) => !isPagePropertySystemManaged(property.type))
      .map((property) => [property, getDefaultPropertyValue(property)] as const)
      .filter(([property, value]) => !isPagePropertyValueEmpty(property.type, value))
      .map(([property, value]) => [property.key, value]),
  );

/** What the server fills cannot be written, and files are chosen among the ones uploaded to the row's own page. */
export const isPropertyEditableInPlace = (property: PageSchemaProperty): boolean =>
  !isPagePropertySystemManaged(property.type) && property.type !== PAGE_PROPERTY_TYPE.FILES;

/**
 * Whether a change to a cell of this type may wait for the network. A value that is a list of people, options or rows
 * is changed by what enters and leaves it, which the server alone can apply without undoing another person (ADR 025).
 */
export const canQueueCellWrite = (type: PagePropertyType): boolean => !ONLINE_ONLY_CELL_TYPES.includes(type);

/** The address a value opens: a web link as it is, a mail or a phone number with its scheme. */
export const readPropertyLinkHref = (type: PagePropertyType, text: string): string => {
  if (type === PAGE_PROPERTY_TYPE.EMAIL) return `mailto:${text}`;
  if (type === PAGE_PROPERTY_TYPE.PHONE) return `tel:${text.replaceAll(/\s+/g, '')}`;
  return text;
};

/** Names of people, rows or files side by side; a name that could not be resolved leaves no empty gap. */
export const joinPropertyNames = (names: readonly string[]): string => names.filter((name) => name !== '').join(', ');

/**
 * One value for many rows only makes sense for what a person types or picks: the server fills some properties, a
 * relation changes one row at a time, and the files of a row are the ones uploaded to that row's page.
 */
export const isPropertyBulkAssignable = (property: PageSchemaProperty): boolean =>
  !isPagePropertySystemManaged(property.type) &&
  property.type !== PAGE_PROPERTY_TYPE.RELATION &&
  property.type !== PAGE_PROPERTY_TYPE.FILES;

/** People, rows and files are held as ids: a summary with no directory at hand would print the ids. */
export const isPropertyReadableWithoutLookups = (property: PageSchemaProperty): boolean =>
  !pagePropertyRequiresPersonDirectory(property.type) &&
  !isAuthorProperty(property.type) &&
  property.type !== PAGE_PROPERTY_TYPE.RELATION &&
  property.type !== PAGE_PROPERTY_TYPE.FILES;

export const getStringPropertyValue = (value: PagePropertyValue | undefined): string =>
  typeof value === 'string' ? value : '';

export const getNumberPropertyValue = (value: PagePropertyValue | undefined): number =>
  typeof value === 'number' ? value : 0;

export const getBooleanPropertyValue = (value: PagePropertyValue | undefined): boolean =>
  typeof value === 'boolean' && value;

/** Option ids, person ids, file ids or row ids: every list a cell can hold. */
export const getListPropertyValue = (value: PagePropertyValue | undefined): readonly string[] =>
  value === undefined ? [] : toValueList(value);

export const getDatePropertyValue = (
  value: PagePropertyValue | undefined,
): { readonly end?: string; readonly start: string } | null =>
  value !== undefined && isPageDateValue(value) ? value : null;

/** The text a cell shows for a value that needs no lookup; names of people, rows and files are resolved apart. */
export const formatPropertyValueForDisplay = (
  property: PageSchemaProperty,
  value: PagePropertyValue | undefined,
): string => {
  if (property.type === PAGE_PROPERTY_TYPE.UNIQUE_ID && typeof value === 'number') {
    return formatPageUniqueId(property.config.prefix, value);
  }
  const shown = readShownProperty(property);
  if (shown.type === PAGE_PROPERTY_TYPE.NUMBER && typeof value === 'number' && hasComputedDefinition(property)) {
    return formatPageComputedNumber(value, shown.config);
  }
  return formatPagePropertyValue(shown.type, value, toPropertyContext(shown));
};

const hasComputedDefinition = (property: PageSchemaProperty): boolean =>
  property.computed?.formula != null || property.computed?.rollup != null;

/**
 * A formula or rollup is shown the way a stored property of the type of its result is, so a number, a date or a
 * checkbox it gives reads exactly as it would in a column of that type.
 */
export const readShownProperty = (property: PageSchemaProperty): PageSchemaProperty =>
  isPageComputedPropertyType(property.type)
    ? { ...property, options: null, type: readPageEffectivePropertyType(property) }
    : property;

/** The original values a rollup shows are a list of any kind of value, read as words. */
export const isComputedListProperty = (property: PageSchemaProperty): boolean =>
  property.computed?.formula?.resultType === 'LIST' || property.computed?.rollup?.resultType === 'LIST';

export const hasPropertyValueToShow = (value: PagePropertyValue | undefined): boolean =>
  value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);

export const hasPersonProperty = (properties: readonly PageSchemaProperty[]): boolean =>
  properties.some((property) => pagePropertyRequiresPersonDirectory(property.type) || isAuthorProperty(property.type));

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

/** Null when the person is unknown to the directory; empty string while the directory has not loaded. */
export const readPagePersonDisplayName = (options: readonly PagePersonOption[], personId: string): string | null => {
  if (personId === '' || options.length === 0) return '';
  const person = findPagePersonOption(options, personId);
  return person === undefined ? null : getPagePersonOptionLabel(options, person);
};

/** Picked values are final at once; typed ones pass through half-written states, so they save on blur. */
export const pagePropertyAnswersOnPick = (type: PagePropertyType): boolean => {
  const logicalType = getPagePropertyLogicalType(type);
  return (
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.STATUS ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.RELATION ||
    logicalType === PAGE_PROPERTY_LOGICAL_TYPE.FILES
  );
};

export const readCheckboxLabelKey = (value: PagePropertyValue | undefined): string =>
  getBooleanPropertyValue(value) ? 'properties.yes' : 'properties.no';
