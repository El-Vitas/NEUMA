import { describe, expect, it } from 'bun:test';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { routing } from '../../../../i18n/routing';
import { config } from '../../../../proxy';

describe('portal routing foundation', () => {
  it('uses English as the default locale with an optional Spanish prefix', () => {
    expect(routing.locales).toEqual(['en', 'es']);
    expect(routing.defaultLocale).toBe('en');
    expect(routing.localePrefix).toBe('as-needed');
  });

  it('exposes English application paths', () => {
    expect(ROUTES).toMatchObject({
      LOGIN: '/login',
      PORTAL: '/',
      PORTAL_SPACES: '/spaces',
      PORTAL_USERS: '/users',
      PORTAL_ACCOUNT: '/account',
      PORTAL_DATABASES: '/databases',
    });
    expect(ROUTES.PORTAL_SPACE('space-1')).toBe('/spaces/space-1');
    expect(ROUTES.PORTAL_SPACE_PAGE('space-1', 'page-1')).toBe('/spaces/space-1/pages/page-1');
    expect(ROUTES.PORTAL_SPACE_NEW_PAGE('space-1')).toBe('/spaces/space-1/pages/new');
    expect(ROUTES.PORTAL_DATABASE('database-1')).toBe('/databases/database-1');
  });

  it('does not locale-prefix API, Next internals, static files, or extensions', () => {
    expect(config.matcher).toContain('/((?!api|_next|_vercel|.*\\..*).*)');
  });
});
