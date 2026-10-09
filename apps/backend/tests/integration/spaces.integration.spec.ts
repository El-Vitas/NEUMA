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
    openRestrictedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Move Access Open Restricted',
      `move-access-open-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
    // The editor is never added here, so moving into it costs the editor its access.
    closedRestrictedSpaceId = await createSpace(
      testApp,
      adminToken,
      'Move Access Closed Restricted',
      `move-access-closed-${String(timestamp)}`,
      SpaceVisibility.RESTRICTED,
    );
    await addSpaceMember(testApp, openRestrictedSpaceId, editorEmail);

    // Workspace membership is created lazily on first request, so the editor needs one to be counted.
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

interface SpaceListItem {
  id: string;
  visibility: SpaceVisibility;
}

const listSpaces = (testApp: TestApp, token: string) =>
  request(testApp.getServer()).get('/api/v1/spaces').set('Authorization', `Bearer ${token}`);

const listSharedWithMe = (testApp: TestApp, token: string) =>
  request(testApp.getServer()).get('/api/v1/spaces/shared-with-me').set('Authorization', `Bearer ${token}`);

const renameSpace = (testApp: TestApp, token: string, spaceId: string, name: string) =>
  request(testApp.getServer())
    .patch(`/api/v1/spaces/${spaceId}/name`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name });

const shareSpace = (testApp: TestApp, token: string, spaceId: string, userId: string) =>
  request(testApp.getServer())
    .post(`/api/v1/spaces/${spaceId}/members`)
    .set('Authorization', `Bearer ${token}`)
    .send({ userId });

const findOwnPrivateSpace = (spaces: readonly SpaceListItem[]): SpaceListItem => {
  const privateSpace = spaces.find((space) => space.visibility === SpaceVisibility.PRIVATE);
  if (privateSpace === undefined) throw new Error('expected a private space to exist in the list');
  return privateSpace;
};

/** Every visibility lets an admin through `canReadSpace` except `PRIVATE`; that carve-out must not leak elsewhere. */
describe('Private Spaces (Integration)', () => {
  let testApp: TestApp;
  let adminToken: string;
  let ownerToken: string;
  let sharedMemberToken: string;
  let sharedMemberUserId: string;
  let outsiderToken: string;
  let outsiderUserId: string;

  beforeAll(async () => {
    testApp = await bootstrapTestApp();

    const timestamp = Date.now();
    const adminEmail = `private-spaces-admin-${String(timestamp)}@test.com`;
    const ownerEmail = `private-spaces-owner-${String(timestamp)}@test.com`;
    const sharedMemberEmail = `private-spaces-shared-${String(timestamp)}@test.com`;
    const outsiderEmail = `private-spaces-outsider-${String(timestamp)}@test.com`;
    const password = 'plainPassword123';

    await registerUser(testApp, { email: adminEmail, name: 'Private Spaces Admin', password });
    await registerUser(testApp, { email: ownerEmail, name: 'Private Spaces Owner', password });
    await registerUser(testApp, { email: sharedMemberEmail, name: 'Private Spaces Shared Member', password });
    await registerUser(testApp, { email: outsiderEmail, name: 'Private Spaces Outsider', password });
    await promoteToRole(testApp, adminEmail, 'ADMIN');

    adminToken = (await loginUser(testApp, adminEmail, password)).accessToken;
    ownerToken = (await loginUser(testApp, ownerEmail, password)).accessToken;
    sharedMemberToken = (await loginUser(testApp, sharedMemberEmail, password)).accessToken;
    outsiderToken = (await loginUser(testApp, outsiderEmail, password)).accessToken;

    const prisma = testApp.get(PrismaService);
    sharedMemberUserId = (
      await prisma.user.findUniqueOrThrow({ select: { id: true }, where: { email: sharedMemberEmail } })
    ).id;
    outsiderUserId = (await prisma.user.findUniqueOrThrow({ select: { id: true }, where: { email: outsiderEmail } }))
      .id;

    await listSpaces(testApp, adminToken).expect(200);
    await listSpaces(testApp, ownerToken).expect(200);
    await listSpaces(testApp, sharedMemberToken).expect(200);
    await listSpaces(testApp, outsiderToken).expect(200);
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('creates a private space for a person the first time they list spaces, without anyone asking for it', async () => {
    const response = await listSpaces(testApp, ownerToken).expect(200);
    const privateSpace = findOwnPrivateSpace(response.body as SpaceListItem[]);
    expect(privateSpace.visibility).toBe(SpaceVisibility.PRIVATE);
  });

  it('is idempotent: listing twice does not create a second private space', async () => {
    const first = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const second = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];

    const firstPrivateSpaces = first.filter((space) => space.visibility === SpaceVisibility.PRIVATE);
    const secondPrivateSpaces = second.filter((space) => space.visibility === SpaceVisibility.PRIVATE);
    expect(firstPrivateSpaces).toHaveLength(1);
    expect(secondPrivateSpaces).toHaveLength(1);
    expect(secondPrivateSpaces[0]?.id).toBe(firstPrivateSpaces[0]?.id);
  });

  it('never lists a private space to anyone but its owner — admin included', async () => {
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);

    const adminSpaces = (await listSpaces(testApp, adminToken).expect(200)).body as SpaceListItem[];
    const outsiderSpaces = (await listSpaces(testApp, outsiderToken).expect(200)).body as SpaceListItem[];

    expect(adminSpaces.some((space) => space.id === privateSpace.id)).toBe(false);
    expect(outsiderSpaces.some((space) => space.id === privateSpace.id)).toBe(false);
  });

  it('denies an admin who tries to act on a private space directly by id, the same as any other outsider', async () => {
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);

    await renameSpace(testApp, adminToken, privateSpace.id, 'Admin Was Here').expect(403);
    await renameSpace(testApp, outsiderToken, privateSpace.id, 'Outsider Was Here').expect(403);
  });

  it('lets the owner rename their own private space', async () => {
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);

    await renameSpace(testApp, ownerToken, privateSpace.id, 'My Notes').expect(200);
  });

  it('refuses an admin who tries to share a private space that is not theirs, exactly like reading it', async () => {
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);

    await shareSpace(testApp, adminToken, privateSpace.id, outsiderUserId).expect(403);
  });

  it('lets the owner share a private space, but the shared member cannot re-share it', async () => {
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);

    await shareSpace(testApp, ownerToken, privateSpace.id, sharedMemberUserId).expect(201);

    const sharedMemberSpaces = (await listSpaces(testApp, sharedMemberToken).expect(200)).body as SpaceListItem[];
    expect(sharedMemberSpaces.some((space) => space.id === privateSpace.id)).toBe(true);

    const sharedWithSharedMember = (await listSharedWithMe(testApp, sharedMemberToken).expect(200))
      .body as SpaceListItem[];
    expect(sharedWithSharedMember.some((space) => space.id === privateSpace.id)).toBe(true);

    const sharedWithOwner = (await listSharedWithMe(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    expect(sharedWithOwner.some((space) => space.id === privateSpace.id)).toBe(false);

    await shareSpace(testApp, sharedMemberToken, privateSpace.id, outsiderUserId).expect(403);
    const outsiderSpaces = (await listSpaces(testApp, outsiderToken).expect(200)).body as SpaceListItem[];
    expect(outsiderSpaces.some((space) => space.id === privateSpace.id)).toBe(false);
  });

  it('lets a person a private space was shared with read it, but not change its name or its mark', async () => {
    const prisma = testApp.get(PrismaService);
    const ownerSpaces = (await listSpaces(testApp, ownerToken).expect(200)).body as SpaceListItem[];
    const privateSpace = findOwnPrivateSpace(ownerSpaces);
    await shareSpace(testApp, ownerToken, privateSpace.id, sharedMemberUserId);
    const workerSessionOf = async (userId: string): Promise<string> => {
      const { email } = await prisma.user.update({
        data: { role: 'WORKER' },
        select: { email: true },
        where: { id: userId },
      });
      return (await loginUser(testApp, email, 'plainPassword123')).accessToken;
    };
    const space = await prisma.space.findUniqueOrThrow({ select: { ownerId: true }, where: { id: privateSpace.id } });
    const [owner, member] = await Promise.all([
      workerSessionOf(space.ownerId ?? ''),
      workerSessionOf(sharedMemberUserId),
    ]);
    const markAs = (token: string) =>
      request(testApp.getServer())
        .patch(`/api/v1/spaces/${privateSpace.id}/icon`)
        .set('Authorization', `Bearer ${token}`)
        .send({ icon: { kind: 'emoji', value: '🙈' } });

    await renameSpace(testApp, member, privateSpace.id, 'Ajeno').expect(403);
    const markedByMember = await markAs(member);

    expect(markedByMember.status).toBeGreaterThanOrEqual(400);
    const stored = await prisma.space.findUniqueOrThrow({ select: { icon: true }, where: { id: privateSpace.id } });
    expect(JSON.stringify(stored.icon)).not.toContain('🙈');
    await markAs(owner).expect(200);
  });

  it('rejects unauthenticated requests to list what was shared', async () => {
    await request(testApp.getServer()).get('/api/v1/spaces/shared-with-me').expect(401);
  });
});
