import { DomainError } from '../../../common/domain/domain.error';

export class PageViewsAccessDeniedError extends DomainError {
  public readonly code = 'PAGE_VIEWS_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('Only a workspace administrator can see who viewed this page');
  }
}

export class PageViewsPageNotAccessibleError extends DomainError {
  public readonly code = 'PAGE_VIEWS_PAGE_NOT_ACCESSIBLE';
  public readonly httpStatus = 403;

  constructor() {
    super('Page is not accessible');
  }
}
