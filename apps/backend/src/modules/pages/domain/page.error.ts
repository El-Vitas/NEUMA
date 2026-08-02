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
