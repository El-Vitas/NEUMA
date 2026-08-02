import { describe, expect, test } from 'bun:test';
import { USER_ROLE } from '@company-brain/shared';
import { ConfigService } from '@nestjs/config';
import { MCP_ACCESS_TOKEN_KEY } from '../../../../src/common/constants/env.constants';
import { McpAuthenticatedPrincipalResolver } from '../../../../src/modules/mcp/mcp.principal.resolver';

const tokenPayload = { email: 'worker@example.com', name: 'Worker', role: USER_ROLE.WORKER, sub: 'user-1' };

describe('MCP authenticated principal resolver', () => {
  test('returns no principal when the MCP access token is absent', async () => {
    const resolver = new McpAuthenticatedPrincipalResolver(new ConfigService(), {
      verifyAccessToken: () => Promise.resolve(tokenPayload),
    });

    const principal = await resolver.resolve();

    expect(principal).toBeNull();
  });

  test('maps a valid configured access token to the authenticated principal', async () => {
    const resolver = new McpAuthenticatedPrincipalResolver(new ConfigService({ [MCP_ACCESS_TOKEN_KEY]: 'token' }), {
      verifyAccessToken: (token) => {
        expect(token).toBe('token');
        return Promise.resolve(tokenPayload);
      },
    });

    const principal = await resolver.resolve();

    expect(principal).toEqual({ role: USER_ROLE.WORKER, userId: 'user-1' });
  });

  test('returns no principal when token verification fails', async () => {
    const resolver = new McpAuthenticatedPrincipalResolver(new ConfigService({ [MCP_ACCESS_TOKEN_KEY]: 'invalid' }), {
      verifyAccessToken: () => Promise.reject(new Error('invalid token')),
    });

    const principal = await resolver.resolve();

    expect(principal).toBeNull();
  });
});
