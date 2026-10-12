import { describe, expect, it } from 'bun:test';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { USER_ROLE } from '@neuma/shared';
import { AccessTokenGuard } from '@/common/infrastructure/guards/access-token.guard';
import type { AccessTokenPrincipal } from '@/common/types/access-token.types';

const principal: AccessTokenPrincipal = {
  access: { allSpaces: [], pages: [], spaces: [] },
  role: USER_ROLE.WORKER,
  tokenId: 'token-a',
  userId: 'user-a',
  workspaceId: 'workspace-a',
};

interface GuardedRequest {
  accessTokenPrincipal?: AccessTokenPrincipal;
  readonly headers: { readonly authorization?: string };
}

const createGuard = (known: string) => {
  const warnings: Record<string, unknown>[] = [];
  const guard = new AccessTokenGuard(
    { resolvePrincipal: (secret) => Promise.resolve(secret === known ? principal : null) },
    { warn: (fields) => warnings.push(fields) },
  );
  return { guard, warnings };
};

const contextFor = (request: GuardedRequest) => new ExecutionContextHost([request]);

const refusalOf = async (attempt: Promise<boolean>): Promise<unknown> => {
  try {
    await attempt;
    return null;
  } catch (error) {
    return error;
  }
};

describe('AccessTokenGuard', () => {
  it('lets in whoever brings a token that stands for someone, and notes who', async () => {
    const { guard } = createGuard('cbk_known');
    const request: GuardedRequest = { headers: { authorization: 'Bearer cbk_known' } };

    expect(await guard.canActivate(contextFor(request))).toBe(true);
    expect(request.accessTokenPrincipal).toEqual(principal);
  });

  it('refuses a token that stands for nobody, and tells the log without the key', async () => {
    const { guard, warnings } = createGuard('cbk_known');

    const refusal = await refusalOf(guard.canActivate(contextFor({ headers: { authorization: 'Bearer cbk_guess' } })));

    expect(refusal).toBeInstanceOf(UnauthorizedException);
    expect(warnings).toEqual([{ offeredToken: true }]);
    expect(JSON.stringify(warnings)).not.toContain('cbk_guess');
  });

  it('refuses a request that brings no token at all', async () => {
    const { guard, warnings } = createGuard('cbk_known');

    expect(await refusalOf(guard.canActivate(contextFor({ headers: {} })))).toBeInstanceOf(UnauthorizedException);
    expect(warnings).toEqual([{ offeredToken: false }]);
  });
});
