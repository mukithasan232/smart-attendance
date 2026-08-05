import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const hasToken = request.cookies.get('auth-token');
  const path = request.nextUrl.pathname;
  
  // Public auth paths that authenticated users shouldn't access
  const isAuthPath = path === '/login' || path === '/signup' || path === '/pricing';

  // Private dashboard paths
  const isDashboardPath = 
    path === '/' || 
    path.startsWith('/persons') || 
    path.startsWith('/settings') || 
    path.startsWith('/logs');

  if (isAuthPath && hasToken) {
    // Redirect authenticated users away from auth pages to dashboard
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isDashboardPath && !hasToken) {
    // Redirect unauthenticated users away from dashboard to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
