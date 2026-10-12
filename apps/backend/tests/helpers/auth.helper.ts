import { type AuthSession, USER_ROLE } from '@neuma/shared';
import request from 'supertest';
import { UsersService } from '@/modules/users/users.service';
import type { TestApp } from './test-app.helper';

/** Accounts are only created by an admin, so tests create them through the service and then sign in. */
export const createAccount = async (
  testApp: TestApp,
  payload: { email: string; name: string; password: string },
): Promise<AuthSession> => {
  const created = await testApp.get(UsersService).createUser({ ...payload, role: USER_ROLE.CLIENT });
  if (created.isFail()) throw created.getError();
  return loginUser(testApp, payload.email, payload.password);
};

export const loginUser = async (testApp: TestApp, email: string, password: string): Promise<AuthSession> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/auth/sessions')
    .send({ email, password })
    .expect(201);
  return response.body as AuthSession;
};
