import { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
import type { DatabasePropertyDefinition, DatabaseViewDefinition } from './database.domain.types';
import { DatabaseViewValidationError } from './database.error';

export const validateDatabaseView = (
  view: DatabaseViewDefinition,
  properties: readonly DatabasePropertyDefinition[],
): Result<DatabaseViewDefinition, DatabaseViewValidationError> => {
  if (view.type !== DatabaseViewType.BOARD) return Result.ok(view);
  const groupBy = view.configuration.groupBy;
  const property = properties.find((candidate) => candidate.key === groupBy);
  return property?.type === DatabasePropertyType.SELECT
    ? Result.ok(view)
    : Result.fail(new DatabaseViewValidationError('Board groupBy must reference a SELECT property'));
};
