import type { PagePropertyContext } from '@neuma/shared';
import { isTitlePageProperty, isValidPagePropertyValue, pagePropertyRequiresOptions, Result } from '@neuma/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValue, SchemaPropertyValues } from './schema.domain.types';
import { SchemaPropertyDefinitionError, SchemaPropertyValueError } from './schema.error';
import { SCHEMA_PROPERTY_KEY_PATTERN } from './schema-property.constants';

export const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isPropertyValue = (value: unknown): value is SchemaPropertyValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isStringArray(value);

const toPropertyContext = (
  property: SchemaPropertyDefinition,
  personIds: ReadonlySet<string> | undefined,
): PagePropertyContext => ({ options: property.options?.map((option) => option.value) ?? null, personIds });

/** An empty option list is valid: a freshly created select has none yet. Duplicates and blank names are rejected. */
const validatePropertyOptions = (property: SchemaPropertyDefinition): string | null => {
  if (!pagePropertyRequiresOptions(property.type)) {
    return property.options === null || property.options.length === 0 ? null : `${property.key} cannot define options`;
  }
  if (property.options === null) return null;
  const values = property.options.map((option) => option.value);
  if (new Set(values).size !== values.length) return `${property.key} has duplicate options`;
  if (values.some((value) => value.trim().length === 0)) return `${property.key} has an empty option`;
  return null;
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
    const optionsError = validatePropertyOptions(property);
    if (optionsError !== null) return Result.fail(new SchemaPropertyDefinitionError(optionsError));
  }
  const titleProperties = properties.filter((property) => isTitlePageProperty(property.type));
  return titleProperties.length === 1
    ? Result.ok(properties)
    : Result.fail(new SchemaPropertyDefinitionError('Exactly one TITLE property is required'));
};

const findMissingRequiredProperty = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
): SchemaPropertyDefinition | undefined =>
  properties.find((property) => property.required && propertyValues[property.key] === undefined);

export const validateSchemaPropertyValues = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
  personIds?: ReadonlySet<string>,
): Result<SchemaPropertyValues, SchemaPropertyValueError> => {
  const propertyByKey = new Map(properties.map((property) => [property.key, property]));
  const validatedValues: Record<string, SchemaPropertyValue> = {};
  for (const [key, value] of Object.entries(propertyValues)) {
    const property = propertyByKey.get(key);
    if (property === undefined || !isPropertyValue(value)) {
      return Result.fail(new SchemaPropertyValueError(`Invalid value for ${key}`));
    }
    if (!isValidPagePropertyValue(property.type, value, toPropertyContext(property, personIds))) {
      return Result.fail(new SchemaPropertyValueError(`Invalid value for ${key}`));
    }
    validatedValues[key] = value;
  }
  const missingProperty = findMissingRequiredProperty(properties, propertyValues);
  return missingProperty === undefined
    ? Result.ok(validatedValues)
    : Result.fail(new SchemaPropertyValueError(`Missing required property ${missingProperty.key}`));
};
