import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = user.app_metadata?.role;
  if (role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden: Super Admin access required', status: 403 };
  }

  return { user };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    
    // Check if the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
       return NextResponse.json({ error: 'Cannot impersonate another SUPER_ADMIN' }, { status: 403 });
    }

    const baseUrl = 'https://vision.codernest.cloud';
    const redirectUrl = `${baseUrl}/dashboard`;

    // Generate an admin magic link for the target user's email
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error('Supabase Auth error generating link:', error);
      return NextResponse.json({ error: error?.message || 'Failed to generate impersonation session' }, { status: 400 });
    }

    // Return the action link so the frontend can redirect the browser to it.
    // The browser will follow the Supabase auth flow, swap the cookies, and land on /dashboard
    return NextResponse.json({ action_link: data.properties.action_link }, { status: 200 });
  } catch (error: any) {
    console.error('Error in impersonation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
