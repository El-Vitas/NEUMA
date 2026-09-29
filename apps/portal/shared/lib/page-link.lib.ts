import { ROUTES } from '@/shared/routes/constants/routes.constants';

/**
 * El enlace de una página, completo, para pegarlo en otra parte: un mensaje, un
 * documento o la conversación con un agente, que sabe abrirlo.
 *
 * Va sin idioma: quien lo abre lee la página en el suyo.
 */
export const buildPortalPageLink = (origin: string, spaceId: string, pageId: string): string =>
  new URL(ROUTES.PORTAL_SPACE_PAGE(spaceId, pageId), origin).toString();
