import { Result } from '@company-brain/shared';
import {
  validateSchemaProperties,
  validateSchemaProperty,
  validateSchemaPropertyValues,
} from '../../../common/domain/schema-property.domain';
import type { DatabasePropertyDefinition, DatabasePropertyValues } from './database.domain.types';
import { DatabasePropertyValidationError, DatabaseRecordValidationError } from './database.error';

export const validateDatabaseProperties = (
  properties: readonly DatabasePropertyDefinition[],
): Result<readonly DatabasePropertyDefinition[], DatabasePropertyValidationError> => {
  const result = validateSchemaProperties(properties);
  return result.isFail()
    ? Result.fail(new DatabasePropertyValidationError(result.getError().message))
    : Result.ok(properties);
};

export const validateDatabaseProperty = (
  property: DatabasePropertyDefinition,
): Result<DatabasePropertyDefinition, DatabasePropertyValidationError> => {
  const result = validateSchemaProperty(property);
  return result.isFail()
    ? Result.fail(new DatabasePropertyValidationError(result.getError().message))
    : Result.ok(property);
};

export const validateRecordValues = (
  properties: readonly DatabasePropertyDefinition[],
  propertyValues: Readonly<Record<string, unknown>>,
  personIds?: ReadonlySet<string>,
): Result<DatabasePropertyValues, DatabaseRecordValidationError> => {
  const result = validateSchemaPropertyValues(properties, propertyValues, personIds);
  return result.isFail()
    ? Result.fail(new DatabaseRecordValidationError(result.getError().message))
    : Result.ok(result.getValue());
};
