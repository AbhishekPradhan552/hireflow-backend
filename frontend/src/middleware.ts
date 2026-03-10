import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hireflow_token')?.value;

  if (PUBLIC_PATHS.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!PUBLIC_PATHS.includes(pathname) && pathname !== '/' && !token) {
    if (!pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
