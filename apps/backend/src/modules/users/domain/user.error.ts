import { DomainError } from '../../../common/domain/domain.error';

export class EmailAlreadyInUseError extends DomainError {
  public readonly code = 'USER_EMAIL_ALREADY_IN_USE';
  public readonly httpStatus = 409;

  constructor(_email: string) {
    super('El correo ya está registrado', { email: _email });
  }
}
