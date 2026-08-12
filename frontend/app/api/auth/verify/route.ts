import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    // Only allow users to verify themselves, or an ADMIN to verify others.
    // We'll keep it simple: users verify themselves here for now (like a mock verification step).
    if (userId !== user.id) {
      // Check if requester is ADMIN
      const requester = await prisma.user.findUnique({ where: { id: user.id } });
      if (requester?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const adminAuthClient = createAdminClient();

    // 1. Update in Prisma
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // 2. Update in Supabase app_metadata
    // We need to fetch the existing user's role to not overwrite it
    const { data: existingUser, error: userError } = await adminAuthClient.auth.admin.getUserById(userId);
    
    if (userError || !existingUser?.user) {
      return NextResponse.json({ error: 'User not found in auth' }, { status: 404 });
    }

    const currentRole = existingUser.user.app_metadata?.role || 'USER';

    await adminAuthClient.auth.admin.updateUserById(userId, {
      app_metadata: { role: currentRole, isVerified: true },
    });

    return NextResponse.json({ message: 'User verified successfully' }, { status: 200 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
