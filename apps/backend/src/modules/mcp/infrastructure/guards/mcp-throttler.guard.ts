import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';
import type { AccessTokenRequest } from '../../../../common/types/access-token.types';

/**
 * El tope de llamadas de un agente, contado por el token con el que entró.
 *
 * Va después del guardia del token, que es quien deja anotado cuál es: sin
 * token anotado la petición ya fue rechazada, y lo que cuenta por dirección
 * es el limitador que va antes.
 */
@Injectable()
export class McpThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.mcp];

  protected override getTracker(request: AccessTokenRequest): Promise<string> {
    const tokenId = request.accessTokenPrincipal?.tokenId;
    if (tokenId === undefined) throw new Error('The MCP throttler ran before the access token guard');
    return Promise.resolve(tokenId);
  }
}
