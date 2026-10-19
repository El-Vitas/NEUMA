import { DomainError } from '../../../common/domain/domain.error';

/** Same answer for a missing block and one the viewer cannot read, so existence is not revealed. */
export class BlockAccessDeniedError extends DomainError {
  public readonly code = 'BLOCK_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Block access denied');
  }
}

export class BlockTreeTooDeepError extends DomainError {
  public readonly code = 'BLOCK_TREE_TOO_DEEP';
  public readonly httpStatus = 413;

  constructor(limit: number) {
    super('The blocks are nested deeper than a single read can follow', { limit });
  }
}

export class BlockSubtreeTooLargeError extends DomainError {
  public readonly code = 'BLOCK_SUBTREE_TOO_LARGE';
  public readonly httpStatus = 413;

  constructor(limit: number) {
    super('The page has more blocks than a single read can return', { limit });
  }
}

export class BlockSyncTextTooLargeError extends DomainError {
  public readonly code = 'BLOCK_SYNC_TEXT_TOO_LARGE';
  public readonly httpStatus = 413;

  constructor(limitBytes: number) {
    super('The text states of the blocks are larger than a single read can return', { limitBytes });
  }
}
