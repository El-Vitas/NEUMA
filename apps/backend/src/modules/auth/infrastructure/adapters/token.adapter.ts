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
import { parseTokenLifetimeSeconds } from '../../utils/auth.token.utils';

@Injectable()
export class TokenAdapter {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Carries its own audience so no other token type is accepted as an access token. */
  async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { ...this.toTokenPayload(user), aud: ACCESS_TOKEN_AUDIENCE },
      {
        expiresIn: this.resolveExpiration() as `${number}${'d' | 'h' | 'm' | 's'}`,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      },
    );
  }

  /** Its own audience keeps an access token from renewing a session and a refresh token from reaching the API. */
  async signRefreshToken(user: User, tokenVersion: number): Promise<string> {
    return this.jwtService.signAsync(
      { ...this.toTokenPayload(user), aud: REFRESH_TOKEN_AUDIENCE, ver: tokenVersion },
      {
        expiresIn: this.resolveRefreshExpiration() as `${number}${'d' | 'h' | 'm' | 's'}`,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      },
    );
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      audience: REFRESH_TOKEN_AUDIENCE,
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
  }

  /** Single place that builds a session, shared by sign-in, sign-up and renewal. */
  async issueSession(user: User, tokenVersion: number): Promise<AuthSession> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user, tokenVersion),
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

  private toTokenPayload(user: User): TokenPayload {
    return { email: user.email, name: user.name, role: user.role, sub: user.id };
  }

  private resolveRefreshExpiration(): string {
    return this.configService.getOrThrow<string>(JWT_REFRESH_TOKEN_EXPIRES_IN_KEY);
  }

  private resolveExpiration(): string {
    return this.configService.getOrThrow<string>(JWT_ACCESS_TOKEN_EXPIRES_IN_KEY);
  }
}
