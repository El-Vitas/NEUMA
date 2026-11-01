import type { DatabasePropertyType, DatabaseViewType, JsonObject, JsonValue } from '@neuma/db';
import { readPageComputedConfig, readPagePropertyConfig, readPagePropertyOptions } from '@neuma/shared';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../domain/schema.domain.types';
import { isPropertyValue } from '../../domain/schema-property.domain';

const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toSchemaPropertyDefinition = (property: {
  config: JsonValue | null;
  key: string;
  label: string;
  type: DatabasePropertyType;
  required: boolean;
  options: JsonValue | null;
}): SchemaPropertyDefinition => ({
  computed: readPageComputedConfig(property.config),
  config: readPagePropertyConfig(property.config),
  key: property.key,
  label: property.label,
  options: readPagePropertyOptions(property.options),
  required: property.required,
  type: property.type,
});

export const toSchemaViewDefinition = (view: {
  id: string;
  name: string;
  type: DatabaseViewType;
  configuration: JsonValue;
  isDefault: boolean;
  version: number;
}): SchemaViewDefinition | null => {
  if (!isJsonObject(view.configuration)) return null;
  return {
    configuration: view.configuration,
    id: view.id,
    isDefault: view.isDefault,
    name: view.name,
    type: view.type,
    version: view.version,
  };
};

export const parseSchemaPropertyValues = (value: JsonValue): SchemaPropertyValues | null => {
  if (!isJsonObject(value)) return null;
  const parsed: Record<string, SchemaPropertyValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isPropertyValue(entry)) parsed[key] = entry;
  }
  return parsed;
};
