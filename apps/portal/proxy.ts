import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { routing } from './i18n/routing';

const handleLocaleRouting = createMiddleware(routing);

const getLocalizedPathname = (pathname: string): { locale: string; pathname: string } => {
  const locale = routing.locales.find(
    (candidate) => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  );
  if (locale === undefined) {
    return { locale: routing.defaultLocale, pathname };
  }

  const pathnameWithoutLocale = pathname.slice(locale.length + 1) || '/';
  return { locale, pathname: pathnameWithoutLocale };
};

export const proxy = (request: NextRequest) => {
  const localeResponse = handleLocaleRouting(request);
  if (localeResponse.headers.has('location')) {
    return localeResponse;
  }

  const { locale, pathname } = getLocalizedPathname(request.nextUrl.pathname);

  if (pathname === ROUTES.LOGIN) {
    return localeResponse;
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE);
  if (accessToken === undefined) {
    const loginPath = locale === routing.defaultLocale ? ROUTES.LOGIN : `/${locale}${ROUTES.LOGIN}`;
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return localeResponse;
};

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
