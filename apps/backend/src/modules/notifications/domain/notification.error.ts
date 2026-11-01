import { DomainError } from '../../../common/domain/domain.error';

/** The same answer for a notification that does not exist and one that belongs to someone else. */
export class NotificationNotFoundError extends DomainError {
  public readonly code = 'NOTIFICATION_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor() {
    super('Notification not found');
  }
}
