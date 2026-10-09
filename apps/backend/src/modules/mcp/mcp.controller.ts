import { createMcpHandler, type McpHttpHandler } from '@modelcontextprotocol/server';
import {
  All,
  BadRequestException,
  Controller,
  Inject,
  type OnModuleDestroy,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AccessTokenGuard } from '../../common/infrastructure/guards/access-token.guard';
import type { AccessTokenRequest } from '../../common/types/access-token.types';
import { MCP_BATCH_REFUSED_MESSAGE, MCP_ROUTE, MCP_SERVER_DEPENDENCIES } from './constants/mcp.constants';
import { McpIpThrottlerGuard } from './infrastructure/guards/mcp-ip-throttler.guard';
import { McpThrottlerGuard } from './infrastructure/guards/mcp-throttler.guard';
import { readMcpPrincipal, toMcpAuthInfo, toWebRequest } from './lib/mcp.http.lib';
import { createMcpServer } from './mcp.server';
import type { McpServerDependencies } from './types/mcp.types';

/**
 * La puerta HTTP del MCP, para agentes que no corren en la misma máquina.
 *
 * Entra solo quien trae un token personal, y el guardia ya dejó anotado en
 * nombre de quién. Cada petición arma su propio servidor con esa identidad: no
 * hay sesión que quede viva entre llamadas, así que revocar el token corta la
 * siguiente llamada y dos agentes nunca comparten estado. Armarlo cuesta cerca
 * de un milisegundo, menos que cualquier consulta de la llamada: guardarlo para
 * reusarlo ahorraría poco y obligaría a invalidarlo cuando cambia lo que el
 * token tiene dado.
 */
@Controller(MCP_ROUTE)
@UseGuards(McpIpThrottlerGuard, AccessTokenGuard, McpThrottlerGuard)
export class McpController implements OnModuleDestroy {
  private readonly handler: McpHttpHandler;

  constructor(@Inject(MCP_SERVER_DEPENDENCIES) dependencies: McpServerDependencies) {
    this.handler = createMcpHandler(({ authInfo }) => {
      const principal = readMcpPrincipal(authInfo);
      return createMcpServer(
        { ...dependencies, principalResolver: { resolve: () => Promise.resolve(principal) } },
        principal,
      );
    });
  }

  @All()
  async handle(@Req() request: AccessTokenRequest, @Res() reply: FastifyReply): Promise<void> {
    const principal = request.accessTokenPrincipal;
    if (principal === undefined) throw new Error('The MCP route was reached without the access token guard');
    if (Array.isArray(request.body)) throw new BadRequestException(MCP_BATCH_REFUSED_MESSAGE);
    const response = await this.handler.fetch(toWebRequest(request), {
      authInfo: toMcpAuthInfo(principal),
      parsedBody: request.body,
    });
    /* Fastify manda un Response web tal cual —estado, cabeceras y flujo—, sin juntarlo en memoria. */
    await reply.send(response);
  }

  async onModuleDestroy(): Promise<void> {
    await this.handler.close();
  }
}
