import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api/');
  const isAdminApi = pathname.startsWith('/api/admin');
  
  // Define route categories
  const isSuperAdminRoute = pathname.startsWith('/super-admin');

  const isUserRoute = pathname === '/' || 
                      pathname === '/dashboard' ||
                      pathname.startsWith('/live') || 
                      pathname.startsWith('/logs') || 
                      pathname.startsWith('/persons') || 
                      pathname.startsWith('/billing');

  const role = user?.app_metadata?.role || 'USER';
  const isPrivileged = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!user && (isSuperAdminRoute || isUserRoute || isAdminApi)) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    if (!isPrivileged && (isSuperAdminRoute || isAdminApi)) {
      if (isApi) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isPrivileged && isUserRoute) {
      // Redirect admins trying to access user pages to their dashboard
      return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
