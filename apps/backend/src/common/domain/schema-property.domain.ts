import { DatabasePropertyType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { Result } from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValue, SchemaPropertyValues } from './schema.domain.types';
import { SchemaPropertyDefinitionError, SchemaPropertyValueError } from './schema.error';

const propertyKeyPattern = /^[a-z][a-zA-Z0-9_]*$/;
const titleMaximumLength = 200;

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isPropertyValue = (value: unknown): value is SchemaPropertyValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isStringArray(value);

const validatePropertyOptions = (property: SchemaPropertyDefinition): string | null => {
  if (property.type !== DatabasePropertyType.SELECT && property.type !== DatabasePropertyType.MULTI_SELECT) {
    return property.options === null || property.options.length === 0 ? null : `${property.key} cannot define options`;
  }
  if (property.options === null || property.options.length === 0) return `${property.key} requires options`;
  if (new Set(property.options).size !== property.options.length) return `${property.key} has duplicate options`;
  if (property.options.some((option) => option.trim().length === 0)) return `${property.key} has an empty option`;
  return null;
};

export const validateSchemaProperties = (
  properties: readonly SchemaPropertyDefinition[],
): Result<readonly SchemaPropertyDefinition[], SchemaPropertyDefinitionError> => {
  const keys = new Set<string>();
  for (const property of properties) {
    if (!propertyKeyPattern.test(property.key) || property.label.trim().length === 0) {
      return Result.fail(new SchemaPropertyDefinitionError(`Invalid property ${property.key}`));
    }
    if (keys.has(property.key))
      return Result.fail(new SchemaPropertyDefinitionError(`Duplicate property ${property.key}`));
    keys.add(property.key);
    const optionsError = validatePropertyOptions(property);
    if (optionsError !== null) return Result.fail(new SchemaPropertyDefinitionError(optionsError));
  }
  const titleProperties = properties.filter((property) => property.type === DatabasePropertyType.TITLE);
  return titleProperties.length === 1
    ? Result.ok(properties)
    : Result.fail(new SchemaPropertyDefinitionError('Exactly one TITLE property is required'));
};

export const validateSchemaProperty = (
  property: SchemaPropertyDefinition,
): Result<SchemaPropertyDefinition, SchemaPropertyDefinitionError> => {
  const result = validateSchemaProperties(
    property.type === DatabasePropertyType.TITLE
      ? [property]
      : [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }, property],
  );
  return result.isFail() ? Result.fail(result.getError()) : Result.ok(property);
};

const validatePropertyValue = (
  property: SchemaPropertyDefinition,
  value: unknown,
  personIds: ReadonlySet<string> | undefined,
): boolean => {
  if (property.type === DatabasePropertyType.TITLE)
    return typeof value === 'string' && value.trim().length > 0 && value.length <= titleMaximumLength;
  if (property.type === DatabasePropertyType.RICH_TEXT) return typeof value === 'string';
  if (property.type === DatabasePropertyType.SELECT)
    return typeof value === 'string' && property.options?.includes(value) === true;
  if (property.type === DatabasePropertyType.MULTI_SELECT) {
    return (
      isStringArray(value) &&
      new Set(value).size === value.length &&
      value.every((item) => property.options?.includes(item) === true)
    );
  }
  if (property.type === DatabasePropertyType.PERSON) return typeof value === 'string' && personIds?.has(value) === true;
  if (property.type === DatabasePropertyType.DATE) return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  if (property.type === DatabasePropertyType.CHECKBOX) return typeof value === 'boolean';
  return typeof value === 'number' && Number.isFinite(value);
};

export const validateSchemaPropertyValues = (
  properties: readonly SchemaPropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
  personIds?: ReadonlySet<string>,
): Result<SchemaPropertyValues, SchemaPropertyValueError> => {
  const propertyByKey = new Map(properties.map((property) => [property.key, property]));
  for (const key of Object.keys(propertyValues)) {
    const property = propertyByKey.get(key);
    if (
      property === undefined ||
      !isPropertyValue(propertyValues[key]) ||
      !validatePropertyValue(property, propertyValues[key], personIds)
    ) {
      return Result.fail(new SchemaPropertyValueError(`Invalid value for ${key}`));
    }
  }
  for (const property of properties) {
    if (property.required && propertyValues[property.key] === undefined) {
      return Result.fail(new SchemaPropertyValueError(`Missing required property ${property.key}`));
    }
  }
  const validatedValues: Record<string, SchemaPropertyValue> = {};
  for (const [key, value] of Object.entries(propertyValues)) {
    if (isPropertyValue(value)) validatedValues[key] = value;
  }
  return Result.ok(validatedValues);
};

export const parseSchemaPropertyValues = (value: Prisma.JsonValue): SchemaPropertyValues | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const parsed: Record<string, SchemaPropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isPropertyValue(entry)) parsed[key] = entry;
  }
  return parsed;
};
