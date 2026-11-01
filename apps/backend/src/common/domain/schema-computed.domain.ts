import { DEFAULT_PAGE_PROPERTY_CONFIG, isPageComputedPropertyType, readPageEffectivePropertyType } from '@neuma/shared';
import type { SchemaPropertyDefinition } from './schema.domain.types';

/**
 * The properties as the filter, sort and group engines read them: a formula or a rollup is a property of the type of
 * its result, so each operator, order and grouping a stored property of that type has works on it too (ADR 028).
 */
export const toEffectiveSchemaProperties = (
  properties: readonly SchemaPropertyDefinition[],
): readonly SchemaPropertyDefinition[] =>
  properties.map((property) =>
    isPageComputedPropertyType(property.type)
      ? {
          ...property,
          config: DEFAULT_PAGE_PROPERTY_CONFIG,
          options: null,
          type: readPageEffectivePropertyType(property),
        }
      : property,
  );
