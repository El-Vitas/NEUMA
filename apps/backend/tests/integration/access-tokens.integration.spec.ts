import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import request from 'supertest';
import { AccessTokensService } from '@/modules/access-tokens/access-tokens.service';
import { ACCESS_TOKEN_LIMIT_PER_USER } from '@/modules/access-tokens/constants/access-tokens.constants';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface CreatedTokenResponse {
  secret: string;
  token: { displayPrefix: string; id: string; name: string };
}

interface ListedTokenResponse {
  displayPrefix: string;
  id: string;
  name: string;
  secret?: string;
  secretHash?: string;
}

describe('Access tokens (Integration)', () => {
  let testApp: TestApp;
  let ownerToken: string;
  let ownerId: string;
  let strangerToken: string;

  const createToken = (sessionToken: string, name: string) =>
    request(testApp.getServer())
      .post('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ access: { allSpaces: [ACCESS_TOKEN_PERMISSIONS.pagesRead], pages: [], spaces: [] }, name });

  beforeAll(async () => {
    testApp = await bootstrapTestApp();
    const timestamp = String(Date.now());
    const password = 'plainPassword123';
    await createAccount(testApp, { email: `token-owner-${timestamp}@test.com`, name: 'Owner', password });
    await createAccount(testApp, { email: `token-stranger-${timestamp}@test.com`, name: 'Stranger', password });
    const owner = await loginUser(testApp, `token-owner-${timestamp}@test.com`, password);
    ownerToken = owner.accessToken;
    ownerId = owner.user.id;
    strangerToken = (await loginUser(testApp, `token-stranger-${timestamp}@test.com`, password)).accessToken;
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('hands back the secret once, and never again when listing', async () => {
    const created = await createToken(ownerToken, 'Claude en mi portátil').expect(201);
    const body = created.body as CreatedTokenResponse;
    expect(body.secret.startsWith('cbk_')).toBe(true);
    expect(created.headers['cache-control']).toBe('no-store');

    const listed = await request(testApp.getServer())
      .get('/api/v1/access-tokens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const found = (listed.body as ListedTokenResponse[]).find((token) => token.id === body.token.id);
    expect(found?.name).toBe('Claude en mi portátil');
    expect(found?.secret).toBeUndefined();
    expect(found?.secretHash).toBeUndefined();
  });

  it('lets the secret stand for its owner until it is revoked', async () => {
    const body = (await createToken(ownerToken, 'Para revocar').expect(201)).body as CreatedTokenResponse;
    const tokens = testApp.get(AccessTokensService);

    expect((await tokens.resolvePrincipal(body.secret))?.userId).toBe(ownerId);

    await request(testApp.getServer())
      .delete(`/api/v1/access-tokens/${body.token.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(await tokens.resolvePrincipal(body.secret)).toBeNull();
  });

  it('does not let one person revoke another person token', async () => {
    const body = (await createToken(ownerToken, 'Ajeno').expect(201)).body as CreatedTokenResponse;

    await request(testApp.getServer())
      .delete(`/api/v1/access-tokens/${body.token.id}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    expect((await testApp.get(AccessTokensService).resolvePrincipal(body.secret))?.userId).toBe(ownerId);
  });

  it('stops standing for a person who was deactivated', async () => {
    const body = (await createToken(ownerToken, 'Hasta desactivar').expect(201)).body as CreatedTokenResponse;
    const prisma = testApp.get(PrismaService);

    await prisma.models.User.where({ id: ownerId }).update({ isActive: false });
    const principal = await testApp.get(AccessTokensService).resolvePrincipal(body.secret);
    await prisma.models.User.where({ id: ownerId }).update({ isActive: true });

    expect(principal).toBeNull();
  });

  it('refuses a new token once the person holds as many as allowed', async () => {
    const prisma = testApp.get(PrismaService);
    const { total: live } = await prisma.models.AccessToken.where({ revokedAt: null, userId: ownerId }).aggregate(
      (aggregate) => ({ total: aggregate.count() }),
    );
    for (let made = live; made < ACCESS_TOKEN_LIMIT_PER_USER; made += 1) {
      await createToken(ownerToken, `Relleno ${String(made)}`).expect(201);
    }

    const refused = await createToken(ownerToken, 'Uno de más').expect(409);

    expect((refused.body as { error: { code: string } }).error.code).toBe('ACCESS_TOKEN_LIMIT_REACHED');
  });

  it('refuses a name made only of spaces', async () => {
    await createToken(ownerToken, '   ').expect(400);
  });
});
