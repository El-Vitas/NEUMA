import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

/** La configuración no tiene portada propia: abre en la primera sección, la que todo el mundo ve. */
export const instant = false;

export default async function Page() {
  redirect({ href: ROUTES.PORTAL_SETTINGS_TOKENS, locale: await getLocale() });
}
