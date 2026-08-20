import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { SpaceVisibility } from '@company-brain/db';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { loginUser, registerUser } from '../helpers/auth.helper';
import { bootstrapTestApp, type TestApp } from '../helpers/test-app.helper';

interface SpaceResponse {
  id: string;
}

interface MemberResponse {
  id: string;
  name: string;
  email: string;
}

const promoteToRole = async (testApp: TestApp, email: string, role: 'ADMIN' | 'WORKER'): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  await prisma.user.update({ data: { role }, where: { email } });
};

const addSpaceMember = async (testApp: TestApp, spaceId: string, email: string): Promise<void> => {
  const prisma = testApp.get(PrismaService);
  const user = await prisma.user.findUniqueOrThrow({ select: { id: true }, where: { email } });
  await prisma.spaceMember.create({ data: { spaceId, userId: user.id } });
};

const createSpace = async (
  testApp: TestApp,
  token: string,
  name: string,
  slug: string,
  visibility: SpaceVisibility,
): Promise<string> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, slug, visibility })
    .expect(201);
  return (response.body as SpaceResponse).id;
};

const listMembers = (testApp: TestApp, token: string, spaceId: string) =>
  request(testApp.getServer()).get(`/api/v1/spaces/${spaceId}/members`).set('Authorization', `Bearer ${token}`);

describe('Space Members (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let adminEmail: string;
  let editorToken: string;
  let editorEmail: string;
  let outsiderToken: string;
  let publicSpaceId: string;
  let restrictedSpaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    adminEmail = `space-members-admin-${String(timestamp)}@test.com`;
    editorEmail = `space-members-editor-${String(timestamp)}@test.com`;
    const outsiderEmail = `space-members-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await registerUser(testApp, { email: adminEmail, name: 'Space Admin', password });
    await registerUser(testApp, { email: editorEmail, name: 'Space Editor', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Space Outsider', password });
    await promoteToRole(testApp, adminEmail, 'ADMIN');
    await promoteToRole(testApp, editorEmail, 'WORKER');

    const adminSession = await loginUser(testApp, adminEmail, password);
    const editorSession = await loginUser(testApp, editorEmail, password);
    const outsiderSession = await loginUser(testApp, outsiderEmail, password);
    adminToken = adminSession.accessToken;
    editorToken = editorSession.accessToken;
    outsiderToken = outsiderSession.accessToken;

    publicSpaceId = await createSpace(
      testApp,
      adminToken,
      'Public Space',
      `public-space-${String(timestamp)}`,
      SpaceVisibility.PUBLIC_INTERNAL,
    );
    restrictedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Restricted Space',
      `restricted-space-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
    await addSpaceMember(testApp, restrictedSpaceId, editorEmail);

    await request(testApp.getServer()).get('/api/v1/spaces').set('Authorization', `Bearer ${editorToken}`).expect(200);
    await request(testApp.getServer())
      .get('/api/v1/spaces')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('lets a member of a restricted space read the assignable member list', async () => {
    const response = await listMembers(testApp, editorToken, restrictedSpaceId).expect(200);

    const emails = (response.body as MemberResponse[]).map((item) => item.email);
    expect(emails).toContain(editorEmail);
    expect(emails).toContain(adminEmail);
  });

  it('denies a user who cannot read the space', async () => {
    await listMembers(testApp, outsiderToken, restrictedSpaceId).expect(403);
  });

  it('lets a non-admin editor read a public space member list without needing admin rights', async () => {
    const response = await listMembers(testApp, editorToken, publicSpaceId).expect(200);

    const emails = (response.body as MemberResponse[]).map((item) => item.email);
    expect(emails).toContain(editorEmail);
  });

  it('returns only id, name and email per member — nothing an admin-only picker would need to hide', async () => {
    const response = await listMembers(testApp, adminToken, publicSpaceId).expect(200);

    const members = response.body as Record<string, unknown>[];
    expect(members.length).toBeGreaterThan(0);
    for (const member of members) {
      expect(Object.keys(member).sort()).toEqual(['email', 'id', 'name']);
    }
  });

  it('rejects unauthenticated requests', async () => {
    await request(testApp.getServer()).get(`/api/v1/spaces/${publicSpaceId}/members`).expect(401);
  });
});

interface AccessLossResponse {
  count: number;
}

const moveAccessLoss = (testApp: TestApp, token: string, sourceSpaceId: string, targetSpaceId: string) =>
  request(testApp.getServer())
    .get(`/api/v1/spaces/${sourceSpaceId}/move-access-loss`)
    .query({ targetSpaceId })
    .set('Authorization', `Bearer ${token}`);

describe('Space Move Access Loss (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let editorToken: string;
  let editorEmail: string;
  let outsiderToken: string;
  let publicSpaceId: string;
  let openRestrictedSpaceId: string;
  let closedRestrictedSpaceId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `move-access-admin-${String(timestamp)}@test.com`;
    editorEmail = `move-access-editor-${String(timestamp)}@test.com`;
    const outsiderEmail = `move-access-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await registerUser(testApp, { email: adminEmail, name: 'Move Access Admin', password });
    await registerUser(testApp, { email: editorEmail, name: 'Move Access Editor', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Move Access Outsider', password });
    await promoteToRole(testApp, adminEmail, 'ADMIN');
    await promoteToRole(testApp, editorEmail, 'WORKER');

    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    editorToken = (await loginUser(testApp, editorEmail, password)).accessToken;
    outsiderToken = (await loginUser(testApp, outsiderEmail, password)).accessToken;

    publicSpaceId = await createSpace(
      testApp,
      adminToken,
      'Move Access Public',
      `move-access-public-${String(timestamp)}`,
      SpaceVisibility.PUBLIC_INTERNAL,
    );
    /** The editor can read this one, since it is added as a member below. */
    openRestrictedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Move Access Open Restricted',
      `move-access-open-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
    /** The editor is never added here, so moving into it is what costs the editor its access. */
    closedRestrictedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Move Access Closed Restricted',
      `move-access-closed-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
    await addSpaceMember(testApp, openRestrictedSpaceId, editorEmail);

    /** Workspace membership is created lazily on first request, so the editor needs one before it can be counted. */
    await request(testApp.getServer()).get('/api/v1/spaces').set('Authorization', `Bearer ${editorToken}`).expect(200);
    await request(testApp.getServer())
      .get('/api/v1/spaces')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('counts the one member who reads the source but not a restricted destination', async () => {
    const response = await moveAccessLoss(testApp, adminToken, openRestrictedSpaceId, closedRestrictedSpaceId).expect(
      200,
    );

    expect((response.body as AccessLossResponse).count).toBe(1);
  });

  it('counts nobody when the destination is public, since everyone can already read it', async () => {
    const response = await moveAccessLoss(testApp, adminToken, openRestrictedSpaceId, publicSpaceId).expect(200);

    expect((response.body as AccessLossResponse).count).toBe(0);
  });

  it('counts nobody when the source and the destination are the same space', async () => {
    const response = await moveAccessLoss(testApp, adminToken, openRestrictedSpaceId, openRestrictedSpaceId).expect(
      200,
    );

    expect((response.body as AccessLossResponse).count).toBe(0);
  });

  it('denies a caller who cannot read the source space', async () => {
    await moveAccessLoss(testApp, outsiderToken, openRestrictedSpaceId, closedRestrictedSpaceId).expect(403);
  });

  it('denies a caller who cannot read the destination space', async () => {
    await moveAccessLoss(testApp, editorToken, openRestrictedSpaceId, closedRestrictedSpaceId).expect(403);
  });

  it('rejects unauthenticated requests', async () => {
    await request(testApp.getServer())
      .get(`/api/v1/spaces/${openRestrictedSpaceId}/move-access-loss`)
      .query({ targetSpaceId: closedRestrictedSpaceId })
      .expect(401);
  });
});
