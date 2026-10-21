import { DatabasePropertyType } from '@neuma/db';
import type { PagePropertyContext, PagePropertyOption } from '@neuma/shared';
import {
  canPagePropertyBeRequired,
  hasEveryStatusGroupAnOption,
  isPagePropertySystemManaged,
  isPagePropertyValueEmpty,
  isTitlePageProperty,
  isValidPagePropertyValue,
  PAGE_OPTION_ID_PATTERN,
  pagePropertyRequiresOptions,
  pickDefaultStatusOption,
  Result,
  validatePagePropertyConfig,
} from '@neuma/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaValuesCheck,
} from './schema.domain.types';
import { SchemaPropertyDefinitionError, SchemaPropertyValueError } from './schema.error';
import { SCHEMA_PROPERTY_KEY_PATTERN } from './schema-property.constants';

export const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isDateValue = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => key === 'start' || key === 'end');

export const isPropertyValue = (value: unknown): value is SchemaPropertyValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  isStringArray(value) ||
  isDateValue(value);

const toPropertyContext = (
  property: SchemaPropertyDefinition,
  personIds: ReadonlySet<string> | undefined,
): PagePropertyContext => ({ config: property.config, options: property.options, personIds });

const isOptionIdUnique = (options: readonly PagePropertyOption[]): boolean =>
  new Set(options.map((option) => option.id)).size === options.length;

const validateOptionShape = (
  property: SchemaPropertyDefinition,
  options: readonly PagePropertyOption[],
): string | null => {
  if (!isOptionIdUnique(options)) return `${property.key} has duplicate option ids`;
  if (options.some((option) => !PAGE_OPTION_ID_PATTERN.test(option.id)))
    return `${property.key} has an invalid option id`;
  const values = options.map((option) => option.value);
  if (new Set(values).size !== values.length) return `${property.key} has duplicate options`;
  if (values.some((value) => value.trim().length === 0)) return `${property.key} has an empty option`;
  return null;
};

const validateOptionGroups = (
  property: SchemaPropertyDefinition,
  options: readonly PagePropertyOption[],
): string | null => {
  if (property.type !== DatabasePropertyType.STATUS) {
    return options.some((option) => option.group !== null) ? `${property.key} cannot group its options` : null;
  }
  if (options.some((option) => option.group === null)) return `${property.key} needs a group on every option`;
  return hasEveryStatusGroupAnOption(options) ? null : `${property.key} needs an option in each group`;
};

/** An empty option list is valid: a freshly created select has none yet. Duplicates and blank names are rejected. */
const validatePropertyOptions = (property: SchemaPropertyDefinition): string | null => {
  if (!pagePropertyRequiresOptions(property.type)) {
    return property.options === null || property.options.length === 0 ? null : `${property.key} cannot define options`;
  }
  if (property.options === null) return null;
  const shape = validateOptionShape(property, property.options);
  if (shape !== null) return shape;
  return property.type === DatabasePropertyType.STATUS && property.options.length === 0
    ? `${property.key} needs an option in each group`
    : validateOptionGroups(property, property.options);
};

/** The title is always required; it is the one property that carries the flag without being offered it. */
const validateRequirement = (property: SchemaPropertyDefinition): string | null =>
  property.required && !isTitlePageProperty(property.type) && !canPagePropertyBeRequired(property.type)
    ? `${property.key} cannot be required: it is never left empty`
    : null;

const validatePropertyDefinition = (property: SchemaPropertyDefinition): string | null =>
  validatePropertyOptions(property) ??
  validatePagePropertyConfig(property.type, property.config) ??
  validateRequirement(property);

/** What the server filled in a row stays with the row it was filled for; it is not carried into another collection. */
export const withoutServerValues = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>> | null,
): Readonly<Record<string, unknown>> | null => {
  if (propertyValues === null) return null;
  const managed = new Set(
    properties.filter((property) => isPagePropertySystemManaged(property.type)).map((property) => property.key),
  );
  return Object.fromEntries(Object.entries(propertyValues).filter(([key]) => !managed.has(key)));
};

/** A `null` property is removed, not stored empty: dropping a card in the no-value column means absent. */
export const mergePropertyValues = (
  stored: Readonly<Record<string, unknown>> | null,
  arriving: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const cleared = new Set(
    Object.entries(arriving)
      .filter(([, value]) => value === null)
      .map(([key]) => key),
  );
  const merged = { ...stored, ...arriving };
  return Object.fromEntries(Object.entries(merged).filter(([key]) => !cleared.has(key)));
};

/** Drops values of removed properties on write; the schema rejects them, so keeping them would block saving. */
export const keepWhatTheSchemaKnows = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const known = new Set(properties.map((property) => property.key));
  return Object.fromEntries(Object.entries(propertyValues).filter(([key]) => known.has(key)));
};

export const validateSchemaProperties = (
  properties: readonly SchemaPropertyDefinition[],
): Result<readonly SchemaPropertyDefinition[], SchemaPropertyDefinitionError> => {
  const keys = new Set<string>();
  for (const property of properties) {
    if (!SCHEMA_PROPERTY_KEY_PATTERN.test(property.key) || property.label.trim().length === 0) {
      return Result.fail(new SchemaPropertyDefinitionError(`Invalid property ${property.key}`));
    }
    if (keys.has(property.key))
      return Result.fail(new SchemaPropertyDefinitionError(`Duplicate property ${property.key}`));
    keys.add(property.key);
    const definitionError = validatePropertyDefinition(property);
    if (definitionError !== null) return Result.fail(new SchemaPropertyDefinitionError(definitionError));
  }
  const titleProperties = properties.filter((property) => isTitlePageProperty(property.type));
  return titleProperties.length === 1
    ? Result.ok(properties)
    : Result.fail(new SchemaPropertyDefinitionError('Exactly one TITLE property is required'));
};

/** A status always has a value: a new row starts on the first option that has not begun. */
export const fillStatusDefaults = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const defaults = properties.flatMap((property) => {
    if (property.type !== DatabasePropertyType.STATUS || propertyValues[property.key] !== undefined) return [];
    const option = pickDefaultStatusOption(property.options ?? []);
    return option === null ? [] : [[property.key, option.id] as const];
  });
  return { ...propertyValues, ...Object.fromEntries(defaults) };
};

/** An empty text or an empty list answers nothing: it is as missing as a value that was never sent. */
const isUnanswered = (property: SchemaPropertyDefinition, value: unknown): boolean =>
  value === undefined || (isPropertyValue(value) && isPagePropertyValueEmpty(property.type, value));

/** On creation every required property must be there; later only those being written, so an old row stays editable. */
const findMissingRequiredProperty = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
  written: readonly string[] | undefined,
): SchemaPropertyDefinition | undefined =>
  properties.find(
    (property) =>
      property.required &&
      isUnanswered(property, propertyValues[property.key]) &&
      (written === undefined || written.includes(property.key)),
  );

const isWrittenNow = (key: string, written: readonly string[] | undefined): boolean =>
  written === undefined || written.includes(key);

export const validateSchemaPropertyValues = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
  check: SchemaValuesCheck = {},
): Result<SchemaPropertyValues, SchemaPropertyValueError> => {
  const propertyByKey = new Map(properties.map((property) => [property.key, property]));
  const validatedValues: Record<string, SchemaPropertyValue> = {};
  for (const [key, value] of Object.entries(propertyValues)) {
    const property = propertyByKey.get(key);
    if (property === undefined || !isPropertyValue(value)) {
      return Result.fail(new SchemaPropertyValueError(`Invalid value for ${key}`));
    }
    if (isPagePropertySystemManaged(property.type) && isWrittenNow(key, check.written)) {
      return Result.fail(new SchemaPropertyValueError(`${key} is filled by the server`));
    }
    if (!isValidPagePropertyValue(property.type, value, toPropertyContext(property, check.personIds))) {
      return Result.fail(new SchemaPropertyValueError(`Invalid value for ${key}`));
    }
    validatedValues[key] = value;
  }
  const clearedStatus = properties.find(
    (property) =>
      property.type === DatabasePropertyType.STATUS &&
      propertyValues[property.key] === undefined &&
      check.written?.includes(property.key) === true,
  );
  if (clearedStatus !== undefined) {
    return Result.fail(new SchemaPropertyValueError(`${clearedStatus.key} always has a value`));
  }
  const missingProperty = findMissingRequiredProperty(properties, propertyValues, check.written);
  return missingProperty === undefined
    ? Result.ok(validatedValues)
    : Result.fail(new SchemaPropertyValueError(`Missing required property ${missingProperty.key}`));
};
