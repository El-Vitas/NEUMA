import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

/** Has no landing of its own: opens the first section, the one every role sees. */
export const instant = false;

export default async function Page() {
  redirect({ href: ROUTES.PORTAL_SETTINGS_TOKENS, locale: await getLocale() });
}
