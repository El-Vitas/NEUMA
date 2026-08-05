import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';

export const validateSchemaView = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
): Result<SchemaViewDefinition, SchemaViewValidationError> => {
  if (view.type !== DatabaseViewType.BOARD) return Result.ok(view);
  const groupBy = view.configuration.groupBy;
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property?.type === DatabasePropertyType.SELECT
    ? Result.ok(view)
    : Result.fail(new SchemaViewValidationError('Board groupBy must reference a SELECT property'));
};
