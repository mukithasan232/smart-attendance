import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const adminEmail = 'admin@codernest.cloud';
    const adminPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const supabase = createAdminClient();

    let adminAuthId = '';

    // 1. Create or fetch user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'SUPER_ADMIN' },
      app_metadata: { role: 'SUPER_ADMIN' }
    });

    if (authError && authError.code === 'email_exists') {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (!usersError && usersData?.users) {
        const existingUser = usersData.users.find(u => u.email === adminEmail);
        if (existingUser) {
          adminAuthId = existingUser.id;
          
          // Force update the role and password just in case
          await supabase.auth.admin.updateUserById(adminAuthId, {
            password: adminPassword,
            user_metadata: { role: 'SUPER_ADMIN' },
            app_metadata: { role: 'SUPER_ADMIN' }
          });
        }
      }
    } else if (authData?.user) {
      adminAuthId = authData.user.id;
    }

    if (!adminAuthId) {
      return NextResponse.json({ error: 'Failed to establish Supabase Auth ID' }, { status: 500 });
    }

    // 2. Upsert user in Prisma Database
    const dbUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'SUPER_ADMIN',
        password: hashedPassword,
        isVerified: true
      },
      create: {
        id: adminAuthId,
        email: adminEmail,
        role: 'SUPER_ADMIN',
        password: hashedPassword,
        isVerified: true
      }
    });

    return NextResponse.json({ 
      message: "Super Admin created successfully", 
      email: dbUser.email,
      id: dbUser.id
    }, { status: 200 });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
