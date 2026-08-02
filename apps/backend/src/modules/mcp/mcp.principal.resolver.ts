import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MCP_ACCESS_TOKEN_KEY } from '../../common/constants/env.constants';
import { MCP_TOKEN_VERIFIER } from './constants/mcp.constants';
import type { McpPrincipal, McpPrincipalResolver, McpTokenVerifier } from './types/mcp.types';

@Injectable()
export class McpAuthenticatedPrincipalResolver implements McpPrincipalResolver {
  constructor(
    private readonly configService: ConfigService,
    @Inject(MCP_TOKEN_VERIFIER) private readonly tokenVerifier: McpTokenVerifier,
  ) {}

  async resolve(): Promise<McpPrincipal | null> {
    const accessToken = this.configService.get<string>(MCP_ACCESS_TOKEN_KEY);
    if (accessToken === undefined) return null;
    try {
      const payload = await this.tokenVerifier.verifyAccessToken(accessToken);
      return { role: payload.role, userId: payload.sub };
    } catch {
      return null;
    }
  }
}
