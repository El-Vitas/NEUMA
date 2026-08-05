import type { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../domain/schema.domain.types';

const getStringOptions = (value: Prisma.JsonValue | null): readonly string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.filter((item): item is string => typeof item === 'string')
    : null;

const toInputJsonValue = (value: Prisma.JsonValue): Prisma.InputJsonValue | null => {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => toInputJsonValue(item));
  const object: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) continue;
    const converted = toInputJsonValue(nestedValue);
    if (converted !== null) object[key] = converted;
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
  options: getStringOptions(property.options),
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
  const configuration: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(view.configuration)) {
    if (value === undefined) continue;
    const converted = toInputJsonValue(value);
    if (converted !== null) configuration[key] = converted;
  }
  return { configuration, isDefault: view.isDefault, name: view.name, type: view.type };
};
