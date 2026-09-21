import { DatabasePropertyType } from '@company-brain/db';
import type { PagePropertyContext } from '@company-brain/shared';
import {
  isTitlePageProperty,
  isValidPagePropertyValue,
  pagePropertyRequiresOptions,
  Result,
} from '@company-brain/shared';
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

/**
 * Lo que una lista de opciones tiene que cumplir, si la propiedad las admite.
 *
 * Puede no ofrecer ninguna: una selección recién creada todavía no dice de
 * dónde elegir, y llenarla es el paso siguiente. Exigirle una opción para
 * poder guardarla obliga a inventar una o a perder lo hecho hasta ahí. Lo que
 * sí se rechaza es una lista que se contradice: dos opciones iguales, o una
 * sin nombre, que nadie sabría distinguir al elegir.
 */
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

/**
 * Lo que una fila queda teniendo tras un cambio parcial.
 *
 * Una propiedad que llega valiendo nada se quita en vez de guardarse vacía: es
 * lo que significa soltar una tarjeta en la columna de las filas sin valor, y
 * una propiedad presente pero vacía no es lo mismo que una ausente.
 */
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

/**
 * Lo que la forma todavía reconoce, de todo lo que una fila trae.
 *
 * Una propiedad quitada de la forma deja atrás lo que las filas escribieron bajo
 * ella. Ese resto ya no significa nada y la forma lo rechaza, así que arrastrarlo
 * al escribir dejaría la fila sin poder volver a guardarse nunca. Se descarta al
 * escribir, no antes: mientras nadie toque la fila, sigue ahí por si la propiedad
 * vuelve.
 */
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
