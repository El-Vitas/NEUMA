import { DomainError } from '../../../common/domain/domain.error';

/** The same answer for a missing discussion and one on a block the viewer cannot read, so existence is not revealed. */
export class DiscussionNotFoundError extends DomainError {
  public readonly code = 'DISCUSSION_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Discussion not found');
  }
}

export class CommentNotFoundError extends DomainError {
  public readonly code = 'COMMENT_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Comment not found');
  }
}

export class CommentNotAllowedError extends DomainError {
  public readonly code = 'COMMENT_NOT_ALLOWED';
  public readonly httpStatus = 403;

  constructor() {
    super('You cannot comment on this block');
  }
}

export class CommentForbiddenError extends DomainError {
  public readonly code = 'COMMENT_FORBIDDEN';
  public readonly httpStatus = 403;

  constructor() {
    super('Only the author can change this comment');
  }
}

export class CommentBodyInvalidError extends DomainError {
  public readonly code = 'COMMENT_BODY_INVALID';
  public readonly httpStatus = 400;

  constructor(reason: string) {
    super(`The comment is not valid: ${reason}`, { reason });
  }
}
