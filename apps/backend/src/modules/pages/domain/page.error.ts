import { DomainError } from '../../../common/domain/domain.error';

export class PageAccessDeniedError extends DomainError {
  public readonly code = 'PAGE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Page access denied');
  }
}

export class PageCycleError extends DomainError {
  public readonly code = 'PAGE_CYCLE';
  public readonly httpStatus = 409;

  constructor() {
    super('Page hierarchy cycle is not allowed');
  }
}

export class PageParentError extends DomainError {
  public readonly code = 'PAGE_PARENT_INVALID';
  public readonly httpStatus = 409;

  constructor() {
    super('Page parent is missing or belongs to another space');
  }
}

export class PageLifecycleError extends DomainError {
  public readonly code = 'PAGE_INVALID_LIFECYCLE';
  public readonly httpStatus = 409;

  constructor() {
    super('Page lifecycle transition is not allowed');
  }
}

export class PageContentValidationError extends DomainError {
  public readonly code = 'PAGE_CONTENT_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Page content is invalid', details);
  }
}

export class PageSchemaDefinitionError extends DomainError {
  public readonly code = 'PAGE_SCHEMA_DEFINITION_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Page schema definition is invalid', details);
  }
}

export class PageSchemaNotFoundError extends DomainError {
  public readonly code = 'PAGE_SCHEMA_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Page does not carry a schema');
  }
}

export class PagePropertyValidationError extends DomainError {
  public readonly code = 'PAGE_PROPERTY_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Page property values are invalid', details);
  }
}

export class PageViewNotFoundError extends DomainError {
  public readonly code = 'PAGE_VIEW_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Page view not found');
  }
}

export class PagePropertyConformanceError extends DomainError {
  public readonly code = 'PAGE_PROPERTY_CONFORMANCE';
  public readonly httpStatus = 409;

  constructor(details: unknown) {
    super('Moving this page would leave its property values non-conforming with the destination schema', details);
  }
}
