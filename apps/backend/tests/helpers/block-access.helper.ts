import { SpaceVisibility } from '@neuma/db';
import { BLOCK_ROLE, type BlockRole } from '@neuma/shared';
import request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { createAccount, loginUser } from './auth.helper';
import type { TestApp } from './test-app.helper';

export interface SeededUser {
  readonly id: string;
  readonly token: string;
}

export type SeededUserRole = 'ADMIN' | 'CLIENT' | 'WORKER';

const SEEDED_PASSWORD = 'plainPassword123';
const HTTP_CREATED = 201;

/** Seeds one account per call. Accounts start as clients, so the role is raised afterwards when it is not one. */
export const createSeededUser = async (testApp: TestApp, label: string, role: SeededUserRole): Promise<SeededUser> => {
  const prisma = testApp.get(PrismaService);
  const email = `${label.toLowerCase().replaceAll(' ', '-')}-${crypto.randomUUID()}@test.com`;
  await createAccount(testApp, { email, name: label, password: SEEDED_PASSWORD });
  if (role !== 'CLIENT') await prisma.models.User.where({ email }).update({ role });
  const session = await loginUser(testApp, email, SEEDED_PASSWORD);
  return { id: session.user.id, token: session.accessToken };
};

interface CreatedSpaceResponse {
  id: string;
}

export const createSeededSpace = async (
  testApp: TestApp,
  adminToken: string,
  visibility: SpaceVisibility,
): Promise<string> => {
  const slug = `space-${crypto.randomUUID()}`;
  const response = await request(testApp.getServer())
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: slug, slug, visibility })
    .expect(HTTP_CREATED);
  return (response.body as CreatedSpaceResponse).id;
};

/** Permissions that leave a block to one person: everyone else resolves to no role. */
export const onlyUserPermissions = (userId: string, role: BlockRole = BLOCK_ROLE.full) => [
  { principal: { kind: 'user' as const, userId }, role },
];
