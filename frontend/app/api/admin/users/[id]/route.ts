import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = user.app_metadata?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { user };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    
    // Check if the user exists in Prisma
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
       return NextResponse.json({ error: 'Cannot delete a SUPER_ADMIN' }, { status: 403 });
    }

    // 1. Delete user from Supabase Auth
    const supabaseAdmin = createAdminClient();
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Supabase Auth error deleting user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Delete user from Prisma (Cascade delete will handle relations)
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
