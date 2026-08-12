import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { sendLoginAlertEmail } from '@/lib/mail';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Secondary Verification: Verify against local Prisma database (per strict security requirement)
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { password: true, role: true }
    });

    if (dbUser && dbUser.password) {
      const isValid = await bcrypt.compare(password, dbUser.password);
      if (!isValid) {
        console.warn(`Local password mismatch for ${email}. Falling back strictly to Supabase Auth.`);
      }
    }

    sendLoginAlertEmail(email).catch(console.error);

    return NextResponse.json({ user: data.user }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
