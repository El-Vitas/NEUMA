import { Injectable } from '@nestjs/common';
import { type AuthSession, Result, type User } from '@neuma/shared';
import { toUser } from '../../common/utils/auth.utils';
import { assertUserIsActive } from './domain/auth.domain';
import { type InactiveUserError, InvalidCredentialsError } from './domain/auth.error';
import { LoginDto } from './dto/login.dto';
import { PasswordAdapter } from './infrastructure/adapters/password.adapter';
import { TokenAdapter } from './infrastructure/adapters/token.adapter';
import { AuthRepository } from './infrastructure/persistence/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordAdapter: PasswordAdapter,
    private readonly tokenAdapter: TokenAdapter,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return this.passwordAdapter.hash(password);
  }

  async loginUser(input: LoginDto): Promise<Result<AuthSession, InactiveUserError | InvalidCredentialsError>> {
    const user = await this.authRepository.findByEmail(input.email);
    if (user === null) {
      return Result.fail(new InvalidCredentialsError());
    }

    const inactiveError = assertUserIsActive(user);
    if (inactiveError !== null) {
      return Result.fail(inactiveError);
    }

    const matches = await this.passwordAdapter.compare(input.password, user.password);
    if (!matches) {
      return Result.fail(new InvalidCredentialsError());
    }

    return Result.ok(await this.tokenAdapter.issueSession(toUser(user)));
  }

  /** Re-reads the user on every renewal so a deactivated user stops being renewed. */
  async refreshSession(
    refreshToken: string,
  ): Promise<Result<AuthSession, InactiveUserError | InvalidCredentialsError>> {
    const payload = await this.tokenAdapter.verifyRefreshToken(refreshToken).catch(() => null);
    if (payload === null) {
      return Result.fail(new InvalidCredentialsError());
    }

    const user = await this.authRepository.findByEmail(payload.email);
    if (user === null) {
      return Result.fail(new InvalidCredentialsError());
    }

    const inactiveError = assertUserIsActive(user);
    if (inactiveError !== null) {
      return Result.fail(inactiveError);
    }

    return Result.ok(await this.tokenAdapter.issueSession(toUser(user)));
  }

  logoutUser(): void {
    return;
  }

  async signAccessToken(user: User): Promise<string> {
    return this.tokenAdapter.signAccessToken(user);
  }
}
