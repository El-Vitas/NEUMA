import { Result } from '@company-brain/shared';
import { validateSchemaView } from '../../../common/domain/schema-view.domain';
import type { DatabasePropertyDefinition, DatabaseViewDefinition } from './database.domain.types';
import { DatabaseViewValidationError } from './database.error';

export const validateDatabaseView = (
  view: DatabaseViewDefinition,
  properties: readonly DatabasePropertyDefinition[],
): Result<DatabaseViewDefinition, DatabaseViewValidationError> => {
  const result = validateSchemaView(view, properties);
  return result.isFail() ? Result.fail(new DatabaseViewValidationError(result.getError().message)) : Result.ok(view);
};
