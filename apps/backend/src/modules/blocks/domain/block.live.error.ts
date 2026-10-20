import { DomainError } from '../../../common/domain/domain.error';

export class BlockLiveInvalidMessageError extends DomainError {
  public readonly code = 'BLOCK_LIVE_INVALID_MESSAGE';
  public readonly httpStatus = 400;

  constructor() {
    super('The message does not follow the live channel protocol');
  }
}

/** The same answer for a forged, expired or foreign token, so a probe learns nothing. */
export class BlockLiveUnauthorizedError extends DomainError {
  public readonly code = 'BLOCK_LIVE_UNAUTHORIZED';
  public readonly httpStatus = 401;

  constructor() {
    super('The live channel token is not valid');
  }
}
