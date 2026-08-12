import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mail';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return 200 even if user is not found to prevent email enumeration
      return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' }, { status: 200 });
    }

    // 2. Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // 3. Hash the token for DB storage (SHA-256)
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
      
    // 4. Set token expiry (1 hour from now)
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // 5. Update user in DB
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // 6. Send the raw token via email
    // Trigger asynchronously so we don't block the API response
    sendPasswordResetEmail(user.email, resetToken).catch((err) => {
      console.error('Failed to send reset email in background:', err);
    });

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
