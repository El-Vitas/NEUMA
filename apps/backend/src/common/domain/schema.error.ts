import { DomainError } from './domain.error';

export class SchemaPropertyDefinitionError extends DomainError {
  public readonly code = 'SCHEMA_PROPERTY_DEFINITION_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Schema property definition is invalid', details);
  }
}

export class SchemaPropertyValueError extends DomainError {
  public readonly code = 'SCHEMA_PROPERTY_VALUE_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Schema property value is invalid', details);
  }
}

export class SchemaViewValidationError extends DomainError {
  public readonly code = 'SCHEMA_VIEW_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Schema view is invalid', details);
  }
}
