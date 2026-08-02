'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { logoutUser, requireAuth } from './auth.server';
import { clearAccessTokenCookie } from './cookie.helpers.server';

export const logout = async (): Promise<never> => {
  await requireAuth();

  await Promise.all([logoutUser(), clearAccessTokenCookie()]);
  redirect(ROUTES.LOGIN);
};
