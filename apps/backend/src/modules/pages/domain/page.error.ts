import { DomainError } from '../../../common/domain/domain.error';

export class PageAccessDeniedError extends DomainError {
  public readonly code = 'PAGE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Page access denied');
  }
}

/** La forma de la colección ya no es la que se leyó antes de guardarla entera. */
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

/** Un cambio de bloques que no se puede hacer sobre lo que la página dice ahora: un bloque que ya no está, un lugar donde no cabe. */
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

/** El mantenimiento de las páginas de todo el espacio de trabajo lo corre solo quien lo administra. */
export class PageMaintenanceAdminOnlyError extends DomainError {
  public readonly code = 'PAGE_MAINTENANCE_ADMIN_ONLY';
  public readonly httpStatus = 403;

  constructor() {
    super('Only a workspace admin can run page maintenance.');
  }
}

/** El mantenimiento ya está corriendo en este espacio de trabajo: dos a la vez se pisarían los ids que dan. */
export class PageMaintenanceAlreadyRunningError extends DomainError {
  public readonly code = 'PAGE_MAINTENANCE_ALREADY_RUNNING';
  public readonly httpStatus = 409;

  constructor() {
    super('Page maintenance is already running in this workspace. Try again when it finishes.');
  }
}

/** A page somebody locked refuses the edit rather than quietly taking it. */
export class PageLockedError extends DomainError {
  public readonly code = 'PAGE_LOCKED';
  public readonly httpStatus = 409;

  constructor() {
    super('This page is locked against edits.');
  }
}

/** An owner has to be somebody who actually belongs to the workspace, not any string that arrives. */
export class PageOwnerInvalidError extends DomainError {
  public readonly code = 'PAGE_OWNER_INVALID';
  public readonly httpStatus = 400;

  constructor() {
    super('Page owner must be an active member of the workspace');
  }
}
