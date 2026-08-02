import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { apiServer } from '@/shared/lib/api-server';
import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import { authSessionSchema } from '../../schemas/auth.schemas';
import type { AuthSession, LoginInput, RegisterInput } from '../../types/auth.types';

export const requireAuth = async (): Promise<void> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE);
  if (!token) {
    redirect(ROUTES.LOGIN);
  }
};

export const loginUser = async (input: LoginInput): Promise<AuthSession> => {
  const data = await apiServer.post<unknown>(API_ROUTES.AUTH_SESSIONS, input);
  return authSessionSchema.parse(data);
};

export const registerUser = async (input: RegisterInput): Promise<AuthSession> => {
  const data = await apiServer.post<unknown>(API_ROUTES.USERS, input);
  return authSessionSchema.parse(data);
};

export const logoutUser = async (): Promise<void> => {
  await apiServer.del<void>(API_ROUTES.AUTH_SESSIONS_CURRENT);
};
