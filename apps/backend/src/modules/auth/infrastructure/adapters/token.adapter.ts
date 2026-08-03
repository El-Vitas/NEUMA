import { USER_ROLE_VALUES, type User } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  COLLABORATION_TOKEN_AUDIENCE,
  COLLABORATION_TOKEN_EXPIRES_IN,
  COLLABORATION_TOKEN_PURPOSE,
  JWT_ACCESS_TOKEN_EXPIRES_IN_KEY,
  JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_SECRET_KEY,
} from '../../../../common/constants/auth.constants';
import type { CollaborationTokenPayload, TokenPayload } from '../../../../common/types/auth.types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TokenAdapter {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      email: user.email,
      name: user.name,
      role: user.role,
      sub: user.id,
    };
    return this.jwtService.signAsync(payload, {
      expiresIn: this.resolveExpiration() as `${number}${'d' | 'h' | 'm' | 's'}`,
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token, {
      secret: this.configService.getOrThrow<string>(JWT_SECRET_KEY),
    });
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

  private resolveExpiration(): string {
    const raw = this.configService.get<string>(JWT_ACCESS_TOKEN_EXPIRES_IN_KEY) ?? JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
    return raw;
  }

  private isCollaborationTokenPayload(payload: Record<string, unknown>): payload is CollaborationTokenPayload {
    return (
      payload.aud === COLLABORATION_TOKEN_AUDIENCE &&
      (payload.mode === 'read' || payload.mode === 'write') &&
      typeof payload.pageId === 'string' &&
      this.isUuid(payload.pageId) &&
      payload.purpose === COLLABORATION_TOKEN_PURPOSE &&
      typeof payload.role === 'string' &&
      USER_ROLE_VALUES.some((role) => role === payload.role) &&
      typeof payload.sub === 'string' &&
      typeof payload.workspaceId === 'string'
    );
  }

  private isUuid(value: string): boolean {
    return uuidPattern.test(value);
  }
}
