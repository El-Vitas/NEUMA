'use server';

import 'server-only';
import { getLocale } from 'next-intl/server';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { redirect } from '../../../../i18n/navigation';
import { logoutUser, requireAuth } from './auth.server';
import { clearAccessTokenCookie } from './cookie.helpers.server';

export const logout = async (): Promise<void> => {
  await requireAuth();

  await Promise.all([logoutUser(), clearAccessTokenCookie()]);
  redirect({ href: ROUTES.LOGIN, locale: await getLocale() });
};
