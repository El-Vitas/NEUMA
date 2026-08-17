import { DomainError } from '../../../common/domain/domain.error';

export class FavoritePageAccessDeniedError extends DomainError {
  public readonly code = 'FAVORITE_PAGE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Page is not accessible');
  }
}

export class FavoriteNotFoundError extends DomainError {
  public readonly code = 'FAVORITE_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Favorite not found');
  }
}
