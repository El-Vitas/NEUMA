import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY, JWT_SECRET_KEY } from '../../constants/auth.constants';
import type { RequestUser, TokenPayload } from '../../types/auth.types';

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
    const token = this.extractTokenFromHeader(request);
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

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader !== undefined && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') return token;
    }

    const queryToken = (request.query as Record<string, string | undefined>).token;
    return queryToken !== undefined && queryToken.length > 0 ? queryToken : undefined;
  }

  private async getPayloadFromToken(token: string): Promise<TokenPayload> {
    const secret = this.configService.getOrThrow<string>(JWT_SECRET_KEY);
    return this.jwtService.verifyAsync<TokenPayload>(token, { secret });
  }
}
