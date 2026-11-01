import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthSession, User } from '@neuma/shared';
import {
  ACCESS_TOKEN_AUDIENCE,
  DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS,
  DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS,
  JWT_ACCESS_TOKEN_EXPIRES_IN_KEY,
  JWT_REFRESH_TOKEN_EXPIRES_IN_KEY,
  JWT_SECRET_KEY,
  REFRESH_TOKEN_AUDIENCE,
} from '../../../../common/constants/auth.constants';
import type { RefreshTokenPayload, TokenPayload } from '../../../../common/types/auth.types';
import { MILLISECONDS_PER_SECOND } from '../../constants/auth.token.constants';
import type { RefreshSessionRecord } from '../../types/refresh.session.types';
import { parseTokenLifetimeSeconds } from '../../utils/auth.token.utils';

const toEpochSeconds = (moment: Date): number => Math.floor(moment.getTime() / MILLISECONDS_PER_SECOND);

@Injectable()
export class TokenAdapter {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Carries its own audience so no other token type is accepted as an access token. */
  async signAccessToken(user: User, familyId: string): Promise<string> {
    return this.jwtService.signAsync(
      { ...this.toTokenPayload(user), aud: ACCESS_TOKEN_AUDIENCE, sid: familyId },
      {
        expiresIn: this.resolveExpiration() as `${number}${'d' | 'h' | 'm' | 's'}`,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      },
    );
  }

  /** Its own audience keeps an access token from renewing a session and a refresh token from reaching the API. */
  async signRefreshToken(user: User, tokenVersion: number, session: RefreshSessionRecord): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...this.toTokenPayload(user),
        aud: REFRESH_TOKEN_AUDIENCE,
        exp: toEpochSeconds(session.expiresAt),
        iat: toEpochSeconds(session.createdAt),
        jti: session.id,
        ver: tokenVersion,
      },
      { secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY) },
    );
  }

  /** Whole seconds, so the expiry stored in the row is exactly the one the token carries. */
  computeRefreshExpiry(now: Date): Date {
    return new Date((toEpochSeconds(now) + this.getRefreshTokenLifetimeSeconds()) * MILLISECONDS_PER_SECOND);
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      audience: REFRESH_TOKEN_AUDIENCE,
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
  }

  /**
   * Single place that builds a session, shared by sign-in and renewal. The refresh token is a pure function of its
   * row, so signing the same row twice yields the same token.
   */
  async issueSession(user: User, tokenVersion: number, session: RefreshSessionRecord): Promise<AuthSession> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user, session.familyId),
      this.signRefreshToken(user, tokenVersion, session),
    ]);
    return {
      accessToken,
      accessTokenExpiresInSeconds: this.getAccessTokenLifetimeSeconds(),
      refreshToken,
      refreshTokenExpiresInSeconds: this.getRefreshTokenLifetimeSeconds(),
      user,
    };
  }

  getAccessTokenLifetimeSeconds(): number {
    return parseTokenLifetimeSeconds(this.resolveExpiration(), DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS);
  }

  getRefreshTokenLifetimeSeconds(): number {
    return parseTokenLifetimeSeconds(this.resolveRefreshExpiration(), DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS);
  }

  private toTokenPayload(user: User): Omit<TokenPayload, 'sid'> {
    return { email: user.email, name: user.name, role: user.role, sub: user.id };
  }

  private resolveRefreshExpiration(): string {
    return this.configService.getOrThrow<string>(JWT_REFRESH_TOKEN_EXPIRES_IN_KEY);
  }

  private resolveExpiration(): string {
    return this.configService.getOrThrow<string>(JWT_ACCESS_TOKEN_EXPIRES_IN_KEY);
  }
}
