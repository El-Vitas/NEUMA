import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { ACCESS_TOKEN_AUDIENCE, IS_PUBLIC_KEY, JWT_SECRET_KEY } from '../../constants/auth.constants';
import type { RequestUser, TokenPayload } from '../../types/auth.types';
import { readBearerToken } from '../../utils/auth.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = readBearerToken(request.headers.authorization);
    if (token === undefined) {
      throw new UnauthorizedException('Autenticación requerida');
    }

    let payload: TokenPayload;
    try {
      payload = await this.getPayloadFromToken(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    this.attachUserToRequest(request, payload);
    return true;
  }

  private attachUserToRequest(request: FastifyRequest, payload: TokenPayload): void {
    const user: RequestUser = { data: null, payload };
    (request as FastifyRequest & { user?: RequestUser }).user = user;
  }

  /** Refresh and collaboration tokens carry other audiences and must not open the API. */
  private async getPayloadFromToken(token: string): Promise<TokenPayload> {
    const secret = this.configService.getOrThrow<string>(JWT_SECRET_KEY);
    return this.jwtService.verifyAsync<TokenPayload>(token, { audience: ACCESS_TOKEN_AUDIENCE, secret });
  }
}
