import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ACCESS_TOKEN_PRINCIPAL_RESOLVER } from '../../constants/access-token.constants';
import type {
  AccessTokenPrincipalResolver,
  AccessTokenRefusalLogger,
  AccessTokenRequest,
} from '../../types/access-token.types';
import { readBearerToken } from '../../utils/auth.utils';

/**
 * Agent entry point only: portal sessions are not accepted here, and personal tokens are not accepted by portal guards.
 * The refusal reason is never disclosed, so unknown, revoked and expired tokens look the same.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_PRINCIPAL_RESOLVER) private readonly principalResolver: AccessTokenPrincipalResolver,
    @Inject(PinoLogger) private readonly logger: AccessTokenRefusalLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccessTokenRequest>();
    const secret = readBearerToken(request.headers.authorization);
    const principal = secret === undefined ? null : await this.principalResolver.resolvePrincipal(secret);
    if (principal === null) {
      this.logger.warn({ offeredToken: secret !== undefined }, 'access token refused');
      throw new UnauthorizedException('Token de acceso inválido');
    }
    request.accessTokenPrincipal = principal;
    return true;
  }
}
