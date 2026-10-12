import { DomainError } from '../../../common/domain/domain.error';

export class UserAccessDeniedError extends DomainError {
  public readonly code = 'USER_ACCESS_DENIED';
  public readonly httpStatus = 403;

  constructor() {
    super('No tienes acceso a esta cuenta');
  }
}

export class AdminAlreadyExistsError extends DomainError {
  public readonly code = 'USER_ADMIN_ALREADY_EXISTS';
  public readonly httpStatus = 409;

  constructor() {
    super('Ya existe un administrador: las cuentas nuevas se crean desde la aplicación');
  }
}

export class EmailAlreadyInUseError extends DomainError {
  public readonly code = 'USER_EMAIL_ALREADY_IN_USE';
  public readonly httpStatus = 409;

  constructor(_email: string) {
    super('El correo ya está registrado', { email: _email });
  }
}
