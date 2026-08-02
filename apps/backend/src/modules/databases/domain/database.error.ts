import { DomainError } from '../../../common/domain/domain.error';

export class DatabaseAccessDeniedError extends DomainError {
  public readonly code = 'DATABASE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Database access denied');
  }
}

export class DatabasePropertyValidationError extends DomainError {
  public readonly code = 'DATABASE_PROPERTY_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Database property definition is invalid', details);
  }
}

export class DatabaseRecordValidationError extends DomainError {
  public readonly code = 'DATABASE_RECORD_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Database record is invalid', details);
  }
}

export class DatabaseViewValidationError extends DomainError {
  public readonly code = 'DATABASE_VIEW_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Database view is invalid', details);
  }
}
