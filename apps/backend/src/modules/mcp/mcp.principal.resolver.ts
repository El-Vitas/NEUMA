import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ACCESS_TOKEN_PRINCIPAL_RESOLVER } from '../../common/constants/access-token.constants';
import { MCP_ACCESS_TOKEN_KEY } from '../../common/constants/env.constants';
import type { AccessTokenPrincipalResolver } from '../../common/types/access-token.types';
import type { McpPrincipal, McpPrincipalResolver } from './types/mcp.types';

/**
 * Identifies the stdio agent by a personal token from the process environment
 * (no headers there). Resolved on every call, not once at startup, so revoking
 * it in the portal cuts the agent off at its next call.
 */
@Injectable()
export class McpEnvironmentPrincipalResolver implements McpPrincipalResolver {
  constructor(
    private readonly configService: ConfigService,
    @Inject(ACCESS_TOKEN_PRINCIPAL_RESOLVER) private readonly accessTokens: AccessTokenPrincipalResolver,
  ) {}

  async resolve(): Promise<McpPrincipal | null> {
    const secret = this.configService.get<string>(MCP_ACCESS_TOKEN_KEY);
    if (secret === undefined) return null;
    return this.accessTokens.resolvePrincipal(secret);
  }
}
