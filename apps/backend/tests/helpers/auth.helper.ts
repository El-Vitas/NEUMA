import type { AuthSession } from '@neuma/shared';
import request from 'supertest';
import type { TestApp } from './test-app.helper';

export const registerUser = async (
  testApp: TestApp,
  payload: { email: string; name: string; password: string },
): Promise<AuthSession> => {
  const response = await request(testApp.getServer()).post('/api/v1/users').send(payload).expect(201);
  return response.body as AuthSession;
};

export const loginUser = async (testApp: TestApp, email: string, password: string): Promise<AuthSession> => {
  const response = await request(testApp.getServer())
    .post('/api/v1/auth/sessions')
    .send({ email, password })
    .expect(201);
  return response.body as AuthSession;
};
