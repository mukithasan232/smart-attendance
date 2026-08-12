import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, token, password } = await request.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Hash the incoming raw token to compare with DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Find user with valid token and expiry
    const user = await prisma.user.findFirst({
      where: {
        email,
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(), // Must be greater than current time (not expired)
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Token is invalid or has expired.' }, { status: 400 });
    }

    // 3. Update the password in Supabase Auth via Admin Client
    const supabaseAdmin = createAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error('Supabase Admin update error:', updateError);
      return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
    }

    // 4. Clear the reset token fields in Prisma
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ message: 'Password has been reset successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
