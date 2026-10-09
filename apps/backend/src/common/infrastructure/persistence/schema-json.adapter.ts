import type { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import { readPagePropertyOptions } from '@company-brain/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../domain/schema.domain.types';
import { isPropertyValue } from '../../domain/schema-property.domain';

/** Keeps `null`: a filter condition without a comparand stores `value: null`, and dropping it breaks the filter. */
const toInputJsonValue = (value: Prisma.JsonValue): Prisma.InputJsonValue | null => {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => toInputJsonValue(item));
  const object: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) continue;
    object[key] = toInputJsonValue(nestedValue);
  }
  return object;
};

export const toSchemaPropertyDefinition = (property: {
  key: string;
  label: string;
  type: DatabasePropertyType;
  required: boolean;
  options: Prisma.JsonValue | null;
}): SchemaPropertyDefinition => ({
  key: property.key,
  label: property.label,
  options: readPagePropertyOptions(property.options),
  required: property.required,
  type: property.type,
});

export const toSchemaViewDefinition = (view: {
  name: string;
  type: DatabaseViewType;
  configuration: Prisma.JsonValue;
  isDefault: boolean;
}): SchemaViewDefinition | null => {
  if (typeof view.configuration !== 'object' || view.configuration === null || Array.isArray(view.configuration))
    return null;
  const configuration: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, value] of Object.entries(view.configuration)) {
    if (value === undefined) continue;
    configuration[key] = toInputJsonValue(value);
  }
  return { configuration, isDefault: view.isDefault, name: view.name, type: view.type };
};

export const parseSchemaPropertyValues = (value: Prisma.JsonValue): SchemaPropertyValues | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const parsed: Record<string, SchemaPropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isPropertyValue(entry)) parsed[key] = entry;
  }
  return parsed;
};
