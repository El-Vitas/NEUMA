import { ROUTES } from '@/shared/routes/constants/routes.constants';

/** Carries no locale: whoever opens the link reads the page in their own language. */
export const buildPortalPageLink = (origin: string, spaceId: string, pageId: string): string =>
  new URL(ROUTES.PORTAL_SPACE_PAGE(spaceId, pageId), origin).toString();
