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
 * HTTP entry point of the MCP for remote agents. Each request builds its own
 * server from the guard's identity, so revoking a token cuts the next call and
 * agents never share state. Building takes about a millisecond; caching it
 * would save little and require invalidation whenever the token's grants change.
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
    /* Fastify sends a web Response as is (status, headers, stream) without buffering it. */
    await reply.send(response);
  }

  async onModuleDestroy(): Promise<void> {
    await this.handler.close();
  }
}
