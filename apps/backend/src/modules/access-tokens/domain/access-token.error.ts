import { DomainError } from '../../../common/domain/domain.error';

export class AccessTokenLimitReachedError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_LIMIT_REACHED';
  public readonly httpStatus = 409;

  constructor() {
    super('The limit of live access tokens for this person was reached');
  }
}

export class AccessTokenExpiryInPastError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_EXPIRY_IN_PAST';
  public readonly httpStatus = 400;

  constructor() {
    super('An access token cannot expire before it is created');
  }
}

export class AccessTokenNotFoundError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Access token not found');
  }
}

export class AccessTokenAccessValidationError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_ACCESS_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('The access asked for is not valid', details);
  }
}

/** Se pidió dar algo que su dueño no puede hacer él mismo. Dice qué, para que se pueda corregir. */
export class AccessTokenPermissionBeyondOwnerError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_PERMISSION_BEYOND_OWNER';
  public readonly httpStatus = 403;

  constructor(permissions: readonly string[]) {
    super('The access asked for goes beyond what its owner can do', { permissions });
  }
}

/**
 * Se nombró un espacio que su dueño no ve. No dice cuál: decir cuál confirmaría
 * que existe, y un espacio que no se ve tampoco se tiene que poder adivinar.
 */
export class AccessTokenSpaceNotAccessibleError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_SPACE_NOT_ACCESSIBLE';
  public readonly httpStatus = 403;

  constructor() {
    super('One of the spaces asked for is not accessible to the owner');
  }
}

/** Solo quien administra el espacio de trabajo ve y revoca los tokens de los demás. */
export class AccessTokenAdminOnlyError extends DomainError {
  public readonly code = 'ACCESS_TOKEN_ADMIN_ONLY';
  public readonly httpStatus = 403;

  constructor() {
    super('Only a workspace admin can see or revoke other people’s tokens');
  }
}
