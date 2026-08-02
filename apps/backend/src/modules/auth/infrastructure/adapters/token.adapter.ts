import type { User } from '@company-brain/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  JWT_ACCESS_TOKEN_EXPIRES_IN_KEY,
  JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_SECRET_KEY,
} from '../../../../common/constants/auth.constants';
import type { TokenPayload } from '../../../../common/types/auth.types';

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

  private resolveExpiration(): string {
    const raw = this.configService.get<string>(JWT_ACCESS_TOKEN_EXPIRES_IN_KEY) ?? JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
    return raw;
  }
}
