import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ACCESS_TOKEN_PRINCIPAL_RESOLVER } from '../../common/constants/access-token.constants';
import { MCP_ACCESS_TOKEN_KEY } from '../../common/constants/env.constants';
import type { AccessTokenPrincipalResolver } from '../../common/types/access-token.types';
import type { McpPrincipal, McpPrincipalResolver } from './types/mcp.types';

/**
 * Quién es el agente que entra por la terminal.
 *
 * Por la terminal no hay cabeceras donde traer una llave, así que la llave es un
 * token personal puesto en el entorno del proceso. Se pregunta por él en cada
 * llamada y no una sola vez al arrancar: revocarlo en el portal tiene que cortar
 * al agente en su siguiente llamada.
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
