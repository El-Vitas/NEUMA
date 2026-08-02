import { DomainError } from '../../../common/domain/domain.error';

export class InactiveUserError extends DomainError {
  public readonly code = 'AUTH_INACTIVE_USER';
  public readonly httpStatus = 403;

  constructor() {
    super('La cuenta de usuario está inactiva');
  }
}

export class InvalidCredentialsError extends DomainError {
  public readonly code = 'AUTH_INVALID_CREDENTIALS';
  public readonly httpStatus = 401;

  constructor() {
    super('Correo o contraseña incorrectos');
  }
}
