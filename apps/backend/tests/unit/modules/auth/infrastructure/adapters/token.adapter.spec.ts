import { describe, expect, test } from 'bun:test';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { USER_ROLE } from '@neuma/shared';
import { JWT_SECRET_KEY } from '@/common/constants/auth.constants';
import { TokenAdapter } from '@/modules/auth/infrastructure/adapters/token.adapter';

const secret = 'a-secure-test-secret-that-is-long-enough';
const user = { id: 'user-1', role: USER_ROLE.WORKER };
const accessUser = { email: 'editor@example.com', id: 'user-1', name: 'Editor', role: USER_ROLE.WORKER };
const pageId = '22222222-2222-4222-8222-222222222222';

const createAdapter = (): TokenAdapter =>
  new TokenAdapter(new JwtService(), new ConfigService({ [JWT_SECRET_KEY]: secret }));

const refusalOf = async (verification: Promise<unknown>): Promise<string | null> => {
  try {
    await verification;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

describe('TokenAdapter collaboration tokens', () => {
  test('mints and verifies a page-scoped collaboration token', async () => {
    const adapter = createAdapter();

    const token = await adapter.signCollaborationToken(user, 'workspace-1', pageId, 'write');
    const payload = await adapter.verifyCollaborationToken(token);

    expect(payload).toMatchObject({
      aud: 'collaboration',
      mode: 'write',
      pageId,
      purpose: 'collaboration',
      role: USER_ROLE.WORKER,
      sub: 'user-1',
      workspaceId: 'workspace-1',
    });
  });

  test('verifies the collaboration token of a page whose id is a version 7 uuid', async () => {
    const adapter = createAdapter();
    const versionSevenPageId = '019ffc24-f641-739d-bc50-284c896476fc';

    const token = await adapter.signCollaborationToken(user, 'workspace-1', versionSevenPageId, 'write');

    expect((await adapter.verifyCollaborationToken(token)).pageId).toBe(versionSevenPageId);
  });

  test('rejects a normal access token as a collaboration token', async () => {
    const adapter = createAdapter();
    const accessToken = await adapter.signAccessToken(accessUser);

    expect(await refusalOf(adapter.verifyCollaborationToken(accessToken))).toBe('invalid-collaboration-token');
  });

  // Signed already expired instead of waiting for it to expire, so the test does not depend on the clock.
  test('rejects an expired collaboration token', async () => {
    const adapter = createAdapter();
    const expiredToken = await new JwtService().signAsync(
      {
        aud: 'collaboration',
        exp: Math.floor(Date.now() / 1000) - 60,
        mode: 'read',
        pageId,
        purpose: 'collaboration',
        role: USER_ROLE.CLIENT,
        sub: 'user-1',
        workspaceId: 'workspace-1',
      },
      { secret },
    );

    expect(await refusalOf(adapter.verifyCollaborationToken(expiredToken))).toBe('invalid-collaboration-token');
  });
});
