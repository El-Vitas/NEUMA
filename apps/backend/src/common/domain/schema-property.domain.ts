import { DatabasePropertyType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { PagePropertyContext } from '@company-brain/shared';
import {
  isTitlePageProperty,
  isValidPagePropertyValue,
  pagePropertyRequiresOptions,
  Result,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValue, SchemaPropertyValues } from './schema.domain.types';
import { SchemaPropertyDefinitionError, SchemaPropertyValueError } from './schema.error';

const propertyKeyPattern = /^[a-z][a-zA-Z0-9_]*$/;

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isPropertyValue = (value: unknown): value is SchemaPropertyValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isStringArray(value);

const toPropertyContext = (
  property: SchemaPropertyDefinition,
  personIds: ReadonlySet<string> | undefined,
): PagePropertyContext => ({ options: property.options, personIds });

const validatePropertyOptions = (property: SchemaPropertyDefinition): string | null => {
  if (!pagePropertyRequiresOptions(property.type)) {
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
  const titleProperties = properties.filter((property) => isTitlePageProperty(property.type));
  return titleProperties.length === 1
    ? Result.ok(properties)
    : Result.fail(new SchemaPropertyDefinitionError('Exactly one TITLE property is required'));
};

export const validateSchemaProperty = (
  property: SchemaPropertyDefinition,
): Result<SchemaPropertyDefinition, SchemaPropertyDefinitionError> => {
  const result = validateSchemaProperties(
    isTitlePageProperty(property.type)
      ? [property]
      : [{ key: 'title', label: 'Title', type: DatabasePropertyType.TITLE, required: true, options: null }, property],
  );
  return result.isFail() ? Result.fail(result.getError()) : Result.ok(property);
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

export const parseSchemaPropertyValues = (value: Prisma.JsonValue): SchemaPropertyValues | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const parsed: Record<string, SchemaPropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isPropertyValue(entry)) parsed[key] = entry;
  }
  return parsed;
};
