import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Authenticate the requester
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify the requester is an ADMIN
    // We check from the database as a secondary strict check, though middleware already checked
    const requester = await prisma.user.findUnique({ where: { id: user.id } });
    if (requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Get the new role from request body
    const body = await request.json();
    const newRole: Role = body.role;

    if (!['ADMIN', 'USER'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 4. Update the user in Prisma
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    // 5. Update the user in Supabase app_metadata
    const adminAuthClient = createAdminClient();
    const { data: targetUser, error: targetError } = await adminAuthClient.auth.admin.getUserById(targetUserId);

    if (targetError || !targetUser?.user) {
      // Even if not found in auth, we updated Prisma. But ideally they should be in sync.
      return NextResponse.json({ error: 'User updated in DB, but not found in Auth' }, { status: 206 });
    }

    const currentIsVerified = targetUser.user.app_metadata?.isVerified ?? false;

    await adminAuthClient.auth.admin.updateUserById(targetUserId, {
      app_metadata: { role: newRole, isVerified: currentIsVerified },
    });

    return NextResponse.json({ message: 'User role updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
