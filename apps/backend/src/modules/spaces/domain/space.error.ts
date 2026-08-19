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
