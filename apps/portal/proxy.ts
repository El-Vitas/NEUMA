import { type NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { ROUTES } from '@/shared/routes/constants/routes.constants';

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (pathname === ROUTES.LOGIN) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE);
  if (accessToken === undefined) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
