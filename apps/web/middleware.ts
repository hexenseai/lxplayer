import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/debug', '/debug-organizations', '/test-auth', '/test-role-filtering', '/', '/library', '/studio', '/player'];
// Allow requests for static files (e.g., images, fonts, css, js) to bypass auth
const PUBLIC_FILE_REGEX = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

// QUICK BYPASS: Development mode authentication bypass
const BYPASS_AUTH = process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // QUICK BYPASS: Skip all auth checks in development
  if (BYPASS_AUTH) {
    return NextResponse.next();
  }
  
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    PUBLIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('lx_token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Admin sayfaları için role kontrolü
  if (pathname.startsWith('/admin')) {
    // Admin sayfalarına erişim için token kontrolü yeterli
    // Sayfa seviyesinde role kontrolü yapılacak
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};
