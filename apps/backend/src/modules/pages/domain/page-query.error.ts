import { PAGE_QUERY_ERROR_CODE } from '@neuma/shared';
import { DomainError } from '../../../common/domain/domain.error';

export class PageQueryInvalidError extends DomainError {
  public readonly code = PAGE_QUERY_ERROR_CODE.invalid;
  public readonly httpStatus = 400;
}

export class PageQueryViewNotFoundError extends DomainError {
  public readonly code = PAGE_QUERY_ERROR_CODE.notFound;
  public readonly httpStatus = 404;

  constructor() {
    super('The view does not exist');
  }
}

/** The order or the view changed since the cursor was given, so it no longer says where to continue. */
export class PageQueryCursorStaleError extends DomainError {
  public readonly code = PAGE_QUERY_ERROR_CODE.cursorStale;
  public readonly httpStatus = 409;

  constructor() {
    super('The cursor belongs to an earlier order of this view; start again from the first page');
  }
}

export class PageQueryTimeoutError extends DomainError {
  public readonly code = PAGE_QUERY_ERROR_CODE.timeout;
  public readonly httpStatus = 503;

  constructor() {
    super('The query took too long; narrow it with a filter');
  }
}

/** More rows than the cap are closed to this reader, so the counts cannot be made exact without a different plan. */
export class PageQueryTooManyRestrictedRowsError extends DomainError {
  public readonly code = PAGE_QUERY_ERROR_CODE.tooManyRestrictedRows;
  public readonly httpStatus = 422;

  constructor(collectionId: string) {
    super('Too many rows of this collection are closed to the reader to count them exactly', { collectionId });
  }
}
