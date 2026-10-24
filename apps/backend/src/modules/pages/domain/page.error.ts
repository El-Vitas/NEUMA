import { DomainError } from '../../../common/domain/domain.error';

export class PageAccessDeniedError extends DomainError {
  public readonly code = 'PAGE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Page access denied');
  }
}

export class PageSchemaChangedError extends DomainError {
  public readonly code = 'PAGE_SCHEMA_CHANGED';
  public readonly httpStatus = 409;

  constructor() {
    super('The collection changed since it was read');
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

export class PageBlockEditError extends DomainError {
  public readonly code = 'PAGE_BLOCK_EDIT_INVALID';
  public readonly httpStatus = 409;

  constructor(details: string) {
    super('The blocks cannot be changed that way', details);
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

export class PageIconValidationError extends DomainError {
  public readonly code = 'PAGE_ICON_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Page icon is invalid', details);
  }
}

export class PageCoverValidationError extends DomainError {
  public readonly code = 'PAGE_COVER_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Page cover is invalid', details);
  }
}

export class PageVersionNotFoundError extends DomainError {
  public readonly code = 'PAGE_VERSION_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Page version not found');
  }
}

export class PageExportTooLargeError extends DomainError {
  public readonly code = 'PAGE_EXPORT_TOO_LARGE';
  public readonly httpStatus = 413;

  constructor(limitMegabytes: number) {
    super(`The export carries more than ${String(limitMegabytes)} MB of attachments. Export fewer pages at a time.`);
  }
}

export class PageVersionConflictError extends DomainError {
  public readonly code = 'PAGE_VERSION_CONFLICT';
  public readonly httpStatus = 409;

  constructor() {
    super('The page changed since it was read. Read it again before changing it.');
  }
}

export class PageLockedError extends DomainError {
  public readonly code = 'PAGE_LOCKED';
  public readonly httpStatus = 409;

  constructor() {
    super('This page is locked against edits.');
  }
}

export class PageTemplateNotFoundError extends DomainError {
  public readonly code = 'PAGE_TEMPLATE_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('The collection has no template with that id');
  }
}

export class PageTemplateInvalidError extends DomainError {
  public readonly code = 'PAGE_TEMPLATE_INVALID';
  public readonly httpStatus = 400;

  constructor(details: string) {
    super(`The template cannot be saved that way: ${details}`, details);
  }
}

export class PageTemplateLimitError extends DomainError {
  public readonly code = 'PAGE_TEMPLATE_LIMIT';
  public readonly httpStatus = 409;

  constructor(limit: number) {
    super(`A collection keeps at most ${String(limit)} templates`);
  }
}

export class PageOwnerInvalidError extends DomainError {
  public readonly code = 'PAGE_OWNER_INVALID';
  public readonly httpStatus = 400;

  constructor() {
    super('Page owner must be an active member of the workspace');
  }
}
