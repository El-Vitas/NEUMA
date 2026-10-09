import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type AuthSession, isOneOf, USER_ROLE_VALUES, type User } from '@neuma/shared';
import {
  ACCESS_TOKEN_AUDIENCE,
  COLLABORATION_TOKEN_AUDIENCE,
  COLLABORATION_TOKEN_EXPIRES_IN,
  COLLABORATION_TOKEN_PURPOSE,
  DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS,
  DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS,
  JWT_ACCESS_TOKEN_EXPIRES_IN_KEY,
  JWT_REFRESH_TOKEN_EXPIRES_IN_KEY,
  JWT_SECRET_KEY,
  REFRESH_TOKEN_AUDIENCE,
} from '../../../../common/constants/auth.constants';
import { UUID_PATTERN } from '../../../../common/constants/validation.constants';
import type { CollaborationTokenPayload, TokenPayload } from '../../../../common/types/auth.types';
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
  async signRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { ...this.toTokenPayload(user), aud: REFRESH_TOKEN_AUDIENCE },
      {
        expiresIn: this.resolveRefreshExpiration() as `${number}${'d' | 'h' | 'm' | 's'}`,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      },
    );
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token, {
      audience: REFRESH_TOKEN_AUDIENCE,
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
  }

  /** Single place that builds a session, shared by sign-in, sign-up and renewal. */
  async issueSession(user: User): Promise<AuthSession> {
    const [accessToken, refreshToken] = await Promise.all([this.signAccessToken(user), this.signRefreshToken(user)]);
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

  async signCollaborationToken(
    user: Pick<User, 'id' | 'role'>,
    workspaceId: string,
    pageId: string,
    mode: 'read' | 'write',
  ): Promise<string> {
    const payload: CollaborationTokenPayload = {
      aud: COLLABORATION_TOKEN_AUDIENCE,
      mode,
      pageId,
      purpose: COLLABORATION_TOKEN_PURPOSE,
      role: user.role,
      sub: user.id,
      workspaceId,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: COLLABORATION_TOKEN_EXPIRES_IN,
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
  }

  async verifyCollaborationToken(token: string): Promise<CollaborationTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<Record<string, unknown>>(token, {
        audience: COLLABORATION_TOKEN_AUDIENCE,
        secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
      });
      if (!this.isCollaborationTokenPayload(payload)) throw new Error('invalid-collaboration-token');
      return payload;
    } catch {
      throw new Error('invalid-collaboration-token');
    }
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

  private isCollaborationTokenPayload(payload: Record<string, unknown>): payload is CollaborationTokenPayload {
    return (
      payload.aud === COLLABORATION_TOKEN_AUDIENCE &&
      (payload.mode === 'read' || payload.mode === 'write') &&
      typeof payload.pageId === 'string' &&
      this.isUuid(payload.pageId) &&
      payload.purpose === COLLABORATION_TOKEN_PURPOSE &&
      typeof payload.role === 'string' &&
      isOneOf(USER_ROLE_VALUES, payload.role) &&
      typeof payload.sub === 'string' &&
      typeof payload.workspaceId === 'string'
    );
  }

  private isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
  }
}
