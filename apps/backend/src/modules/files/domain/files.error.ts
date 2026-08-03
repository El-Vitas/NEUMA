import { DomainError } from '../../../common/domain/domain.error';

export class FileValidationError extends DomainError {
  public readonly code = 'FILE_VALIDATION_FAILED';
  public readonly httpStatus = 400;

  constructor(message = 'File upload is invalid') {
    super(message);
  }
}

export class FileAccessDeniedError extends DomainError {
  public readonly code = 'FILE_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('File access denied');
  }
}

export class FileStorageError extends DomainError {
  public readonly code = 'FILE_STORAGE_FAILED';
  public readonly httpStatus = 500;

  constructor() {
    super('File storage operation failed');
  }
}
