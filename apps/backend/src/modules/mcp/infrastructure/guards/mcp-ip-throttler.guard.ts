import { Injectable } from '@nestjs/common';
import { THROTTLER_NAMES } from '../../../../common/constants/throttler.constants';
import { ScopedThrottlerGuard } from '../../../../common/infrastructure/guards/scoped-throttler.guard';

/**
 * El tope de llamadas al MCP por dirección, antes de mirar el token. Va
 * primero para que una llave que no sirve también se cuente: sin él, probar
 * llaves no tiene tope y cada intento consulta la base.
 */
@Injectable()
export class McpIpThrottlerGuard extends ScopedThrottlerGuard {
  protected readonly enforcedThrottlers = [THROTTLER_NAMES.mcpPerIp];
}
