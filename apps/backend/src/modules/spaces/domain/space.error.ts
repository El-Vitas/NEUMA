import { DomainError } from '../../../common/domain/domain.error';

export class SpaceAccessDeniedError extends DomainError {
  public readonly code = 'SPACE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Space access denied');
  }
}

export class SpaceIconValidationError extends DomainError {
  public readonly code = 'SPACE_ICON_INVALID';
  public readonly httpStatus = 400;

  constructor(details: unknown) {
    super('Space icon is invalid', details);
  }
}

export class SpaceShareForbiddenError extends DomainError {
  public readonly code = 'SPACE_SHARE_FORBIDDEN';
  public readonly httpStatus = 403;

  constructor() {
    super('Only the owner of a private space can share it');
  }
}

export class SpaceMemberNotAssignableError extends DomainError {
  public readonly code = 'SPACE_MEMBER_NOT_ASSIGNABLE';
  public readonly httpStatus = 400;

  constructor() {
    super('The target user is not an active member of the workspace');
  }
}
