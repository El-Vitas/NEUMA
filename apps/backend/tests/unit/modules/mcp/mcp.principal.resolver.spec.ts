import { describe, expect, test } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS, USER_ROLE } from '@company-brain/shared';
import { ConfigService } from '@nestjs/config';
import { MCP_ACCESS_TOKEN_KEY } from '../../../../src/common/constants/env.constants';
import type { AccessTokenPrincipal } from '../../../../src/common/types/access-token.types';
import { McpEnvironmentPrincipalResolver } from '../../../../src/modules/mcp/mcp.principal.resolver';

const principal: AccessTokenPrincipal = {
  access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], pages: [], spaces: [] },
  role: USER_ROLE.WORKER,
  tokenId: 'token-1',
  userId: 'user-1',
  workspaceId: 'workspace-1',
};

describe('quién es el agente conectado por la terminal', () => {
  test('is nobody when no access token was configured', async () => {
    const resolver = new McpEnvironmentPrincipalResolver(new ConfigService(), {
      resolvePrincipal: () => Promise.resolve(principal),
    });

    expect(await resolver.resolve()).toBeNull();
  });

  test('is whoever owns the configured access token, with what the token holds', async () => {
    const resolver = new McpEnvironmentPrincipalResolver(new ConfigService({ [MCP_ACCESS_TOKEN_KEY]: 'cbk_secret' }), {
      resolvePrincipal: (secret) => {
        expect(secret).toBe('cbk_secret');
        return Promise.resolve(principal);
      },
    });

    expect(await resolver.resolve()).toEqual(principal);
  });

  /**
   * Se pregunta en cada llamada y no una vez al arrancar: revocar el token en el
   * portal tiene que cortar al agente en la siguiente llamada, no cuando alguien
   * reinicie el proceso.
   */
  test('asks again on every call, so a revoked token stops working at once', async () => {
    let calls = 0;
    const resolver = new McpEnvironmentPrincipalResolver(new ConfigService({ [MCP_ACCESS_TOKEN_KEY]: 'cbk_secret' }), {
      resolvePrincipal: () => {
        calls += 1;
        return Promise.resolve(calls === 1 ? principal : null);
      },
    });

    expect(await resolver.resolve()).toEqual(principal);
    expect(await resolver.resolve()).toBeNull();
  });
});
