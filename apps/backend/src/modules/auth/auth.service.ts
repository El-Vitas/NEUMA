import { Injectable } from '@nestjs/common';
import { type AuthSession, Result } from '@neuma/shared';
import type { TokenPayload } from '../../common/types/auth.types';
import { toUser } from '../../common/utils/auth.utils';
import { assertUserIsActive, isRefreshTokenCurrent } from './domain/auth.domain';
import { type InactiveUserError, InvalidCredentialsError } from './domain/auth.error';
import { LoginDto } from './dto/login.dto';
import { PasswordAdapter } from './infrastructure/adapters/password.adapter';
import { TokenAdapter } from './infrastructure/adapters/token.adapter';
import { AuthRepository } from './infrastructure/persistence/auth.repository';
import { RefreshSessionRepository } from './infrastructure/persistence/refresh-session.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly passwordAdapter: PasswordAdapter,
    private readonly tokenAdapter: TokenAdapter,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return this.passwordAdapter.hash(password);
  }

  async loginUser(input: LoginDto): Promise<Result<AuthSession, InvalidCredentialsError>> {
    const user = await this.authRepository.findByEmail(input.email);
    const matches =
      user === null
        ? await this.passwordAdapter.compareAgainstNobody(input.password)
        : await this.passwordAdapter.compare(input.password, user.password);
    if (user === null || !matches || assertUserIsActive(user) !== null) {
      return Result.fail(new InvalidCredentialsError());
    }

    const record = await this.refreshSessionRepository.startFamily(
      user.id,
      this.tokenAdapter.computeRefreshExpiry(new Date()),
    );
    return Result.ok(await this.tokenAdapter.issueSession(toUser(user), user.tokenVersion, record));
  }

  /**
   * Re-reads the user on every renewal so a deactivated user or a revoked token stops being renewed. Each renewal
   * spends the presented token and issues its successor; a spent token that comes back late revokes its family.
   */
  async refreshSession(
    refreshToken: string,
  ): Promise<Result<AuthSession, InactiveUserError | InvalidCredentialsError>> {
    const payload = await this.tokenAdapter.verifyRefreshToken(refreshToken).catch(() => null);
    if (payload === null) {
      return Result.fail(new InvalidCredentialsError());
    }

    const user = await this.authRepository.findByEmail(payload.email);
    if (user === null || !isRefreshTokenCurrent(payload.ver, user.tokenVersion)) {
      return Result.fail(new InvalidCredentialsError());
    }

    const inactiveError = assertUserIsActive(user);
    if (inactiveError !== null) {
      return Result.fail(inactiveError);
    }

    const now = new Date();
    const outcome = await this.refreshSessionRepository.rotate({
      now,
      successorExpiresAt: this.tokenAdapter.computeRefreshExpiry(now),
      tokenId: payload.jti,
      userId: user.id,
    });
    if (outcome.status === 'reused' || outcome.status === 'unknown') {
      return Result.fail(new InvalidCredentialsError());
    }

    return Result.ok(await this.tokenAdapter.issueSession(toUser(user), user.tokenVersion, outcome.session));
  }

  /**
   * Ends the session this access token came from; other devices stay signed in. An open access token still
   * works until it expires, minutes later.
   */
  async logoutUser(payload: TokenPayload): Promise<void> {
    await this.refreshSessionRepository.revokeFamily(payload.sub, payload.sid);
  }

  async purgeExpiredRefreshSessions(now: Date): Promise<number> {
    return this.refreshSessionRepository.deleteExpired(now);
  }
}
