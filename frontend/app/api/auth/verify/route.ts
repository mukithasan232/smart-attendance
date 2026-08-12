// Force TS re-evaluation
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=MissingToken', request.url));
    }

    const userRecord = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!userRecord) {
      return NextResponse.redirect(new URL('/login?error=InvalidToken', request.url));
    }

    // 1. Update in Prisma
    await prisma.user.update({
      where: { id: userRecord.id },
      data: { isVerified: true, verificationToken: null },
    });

    const adminAuthClient = createAdminClient();

    // 2. Update in Supabase app_metadata
    const { data: existingUser } = await adminAuthClient.auth.admin.getUserById(userRecord.id);
    const currentRole = existingUser?.user?.app_metadata?.role || 'USER';

    if (existingUser?.user) {
      await adminAuthClient.auth.admin.updateUserById(userRecord.id, {
        app_metadata: { role: currentRole, isVerified: true },
        email_confirm: true,
      });
    }

    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Verification GET error:', error);
    return NextResponse.redirect(new URL('/login?error=ServerError', request.url));
  }
}

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
    console.error('Verification POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
