import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const adminAuthClient = createAdminClient();
    
    // 1. Create user in Supabase using the admin API so it auto-confirms if needed
    // or just signs them up.
    const { data, error } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // We can set this to true for now, or false if we want email flow
      app_metadata: { role: 'USER', isVerified: false },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      // 2. Create user in Prisma
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          role: 'USER',
          isVerified: false,
        }
      });
    }

    sendWelcomeEmail(email).catch(console.error);

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
