import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ACCESS_TOKEN_PRINCIPAL_RESOLVER } from '../../constants/access-token.constants';
import type { AccessTokenPrincipalResolver, AccessTokenRequest } from '../../types/access-token.types';
import { readBearerToken } from '../../utils/auth.utils';

/**
 * Deja pasar a quien trae un token personal válido, y anota en nombre de quién actúa.
 *
 * Es la puerta de los agentes, no la de las personas: una sesión del portal no
 * entra por aquí, y un token personal no entra por las puertas del portal. Así
 * una llave de agente que se filtre no sirve para hacerse pasar por el portal.
 *
 * El motivo del rechazo no se dice: «no existe», «revocado» y «vencido» suenan
 * igual para quien está probando llaves.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_PRINCIPAL_RESOLVER) private readonly principalResolver: AccessTokenPrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccessTokenRequest>();
    const secret = readBearerToken(request.headers.authorization);
    const principal = secret === undefined ? null : await this.principalResolver.resolvePrincipal(secret);
    if (principal === null) throw new UnauthorizedException('Token de acceso inválido');
    request.accessTokenPrincipal = principal;
    return true;
  }
}
