import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS, COOKIE_PATH } from '@/modules/auth/constants/cookie.options.constants';
import { refreshSession } from '@/modules/auth/lib/auth.refresh.lib';
import { isAccessTokenSpent } from '@/modules/auth/lib/auth.token.expiry.lib';
import type { AuthSession } from '@/modules/auth/types/auth.types';
import { config as appConfig } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';
import { routing } from './i18n/routing';

const handleLocaleRouting = createMiddleware(routing);

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

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

const storeSessionOnResponse = (response: NextResponse, session: AuthSession): NextResponse => {
  const options = {
    httpOnly: true,
    path: COOKIE_PATH,
    sameSite: 'lax' as const,
    secure: appConfig.nodeEnv === 'production',
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken, {
    ...options,
    maxAge: session.accessTokenExpiresInSeconds,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken, {
    ...options,
    maxAge: session.refreshTokenExpiresInSeconds,
  });
  return response;
};

const redirectToLogin = (request: NextRequest, locale: string): NextResponse => {
  const loginPath = locale === routing.defaultLocale ? ROUTES.LOGIN : `/${locale}${ROUTES.LOGIN}`;
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
};

/**
 * Renews a session that is about to expire before the page is rendered.
 *
 * Routing is the only moment where a new cookie can still reach the browser,
 * so a session is renewed here instead of letting a page render with a token
 * the API is about to reject.
 */
export const proxy = async (request: NextRequest) => {
  const localeResponse = handleLocaleRouting(request);
  if (localeResponse.headers.has('location')) {
    return localeResponse;
  }

  const { locale, pathname } = getLocalizedPathname(request.nextUrl.pathname);

  if (pathname === ROUTES.LOGIN) {
    return localeResponse;
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (
    !isAccessTokenSpent({
      leewaySeconds: ACCESS_TOKEN_REFRESH_LEEWAY_SECONDS,
      nowSeconds: nowInSeconds(),
      token: accessToken,
    })
  ) {
    return localeResponse;
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken === undefined) {
    return redirectToLogin(request, locale);
  }

  const session = await refreshSession(refreshToken);
  if (session === null) {
    return redirectToLogin(request, locale);
  }

  return storeSessionOnResponse(localeResponse, session);
};

/**
 * Next.js reads this matcher when it builds, without running the file, and it
 * only understands a plain string literal here. Written any other way — a
 * `String.raw` template among them — it is not read at all, the proxy starts
 * answering for `/_next/static` too, and every chunk comes back a 404.
 */
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
