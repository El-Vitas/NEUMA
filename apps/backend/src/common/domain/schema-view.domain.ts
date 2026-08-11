import {
  canPagePropertyGroupBoard,
  pageViewConfigurationSchema,
  pageViewRequiresGrouping,
  Result,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';

export const validateSchemaView = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
): Result<SchemaViewDefinition, SchemaViewValidationError> => {
  if (!pageViewConfigurationSchema.safeParse(view.configuration).success) {
    return Result.fail(new SchemaViewValidationError('View configuration is not valid'));
  }
  if (!pageViewRequiresGrouping(view.type)) return Result.ok(view);
  const groupBy = view.configuration.groupBy;
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property !== undefined && canPagePropertyGroupBoard(property.type)
    ? Result.ok(view)
    : Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
};
