import { DomainError } from '../../../common/domain/domain.error';

/** Why one operation cannot be read: wrong path, wrong arguments or an unknown command. */
export class BlockOperationInvalidError extends DomainError {
  public readonly code = 'BLOCK_OPERATION_INVALID';
  public readonly httpStatus = 400;
}

export class BlockFieldNotWritableError extends DomainError {
  public readonly code = 'BLOCK_FIELD_NOT_WRITABLE';
  public readonly httpStatus = 400;

  constructor(field: string) {
    super('The field cannot be written by an operation', { field });
  }
}

/** The viewer can read the block but not change it. A block they cannot read answers as access denied instead. */
export class BlockEditForbiddenError extends DomainError {
  public readonly code = 'BLOCK_EDIT_FORBIDDEN';
  public readonly httpStatus = 403;

  constructor() {
    super('You cannot edit this block');
  }
}

export class BlockAlreadyExistsError extends DomainError {
  public readonly code = 'BLOCK_ALREADY_EXISTS';
  public readonly httpStatus = 409;

  constructor() {
    super('A block with this id already exists');
  }
}

/** Same code as the page lock, so clients handle one refusal (BR-80536e4). */
export class BlockLockedError extends DomainError {
  public readonly code = 'PAGE_LOCKED';
  public readonly httpStatus = 409;

  constructor() {
    super('This page is locked against edits.');
  }
}

/** Same code as the page lifecycle refusal, so clients handle one refusal (BR-c9aaeaa). */
export class BlockTrashedError extends DomainError {
  public readonly code = 'PAGE_INVALID_LIFECYCLE';
  public readonly httpStatus = 409;

  constructor() {
    super('This page is in the trash. Restore it before changing it.');
  }
}

/** Same code as the page lifecycle refusal: only a page in the trash can be restored. */
export class BlockNotTrashedError extends DomainError {
  public readonly code = 'PAGE_INVALID_LIFECYCLE';
  public readonly httpStatus = 409;

  constructor() {
    super('This page is not in the trash.');
  }
}

export class BlockContentInvalidError extends DomainError {
  public readonly code = 'BLOCK_CONTENT_INVALID';
  public readonly httpStatus = 400;

  constructor(blockId: string, issues: unknown) {
    super('The block content does not match its type', { blockId, issues });
  }
}

export class BlockTreeInvalidError extends DomainError {
  public readonly code = 'BLOCK_TREE_INVALID';
  public readonly httpStatus = 409;

  constructor(message: string, blockId: string) {
    super(message, { blockId });
  }
}

export class BlockCycleError extends DomainError {
  public readonly code = 'BLOCK_CYCLE';
  public readonly httpStatus = 409;

  constructor(blockId: string) {
    super('A block cannot be moved under itself or one of its descendants', { blockId });
  }
}

export class BlockTextUpdateInvalidError extends DomainError {
  public readonly code = 'BLOCK_TEXT_UPDATE_INVALID';
  public readonly httpStatus = 400;

  constructor(reason: string) {
    super(`The text update cannot be applied: ${reason}`);
  }
}

/** The update was built on a history this block does not have; the client must read the block again and redo it. */
export class BlockTextOutOfSyncError extends DomainError {
  public readonly code = 'BLOCK_TEXT_OUT_OF_SYNC';
  public readonly httpStatus = 409;

  constructor() {
    super('The text update was built on a version of the block this server does not have. Sync the block and retry.');
  }
}

export class BlockTextStateTooLargeError extends DomainError {
  public readonly code = 'BLOCK_TEXT_STATE_TOO_LARGE';
  public readonly httpStatus = 413;

  constructor(limitBytes: number) {
    super('The text of the block grew past what it can hold', { limitBytes });
  }
}

export class BlockPermissionsForbiddenError extends DomainError {
  public readonly code = 'BLOCK_PERMISSIONS_FORBIDDEN';
  public readonly httpStatus = 403;

  constructor() {
    super('You cannot change the permissions of this block');
  }
}

/** The id was already used by another user; the stored result is not theirs to read. */
export class BlockTransactionIdTakenError extends DomainError {
  public readonly code = 'BLOCK_TRANSACTION_ID_TAKEN';
  public readonly httpStatus = 409;

  constructor() {
    super('This transaction id belongs to another user');
  }
}
