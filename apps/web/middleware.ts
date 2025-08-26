import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/debug'];
// Allow requests for static files (e.g., images, fonts, css, js) to bypass auth
const PUBLIC_FILE_REGEX = /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  // Admin role kontrolü kaldırıldı - herkes admin sayfalarına girebilir
  // Sadece login kontrolü yapılıyor

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};
