import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';
import type { AccessTokenRequest } from '../../../../common/types/access-token.types';

/**
 * El tope de llamadas de un agente, contado por el token con el que entró.
 *
 * Va después del guardia del token, que es quien deja anotado cuál es. Sin
 * token anotado la petición ya fue rechazada antes de llegar aquí, pero si
 * llegara, cuenta por dirección, que es lo único que queda.
 */
@Injectable()
export class McpThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.mcp];

  protected override getTracker(request: AccessTokenRequest): Promise<string> {
    return Promise.resolve(request.accessTokenPrincipal?.tokenId ?? request.ip);
  }
}
