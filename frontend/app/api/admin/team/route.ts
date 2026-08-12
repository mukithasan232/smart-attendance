import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';
import bcrypt from 'bcryptjs';

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { error: 'Unauthorized', status: 401 };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden: SUPER_ADMIN required', status: 403 };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
      app_metadata: { role }
    });

    if (authError) {
      console.error('Supabase Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Hash password and save in Prisma
    const hashedPassword = await bcrypt.hash(password, 10);
    const dbUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        role,
        password: hashedPassword,
        isVerified: true
      }
    });

    return NextResponse.json({ message: 'Admin created successfully', user: dbUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const requester = await prisma.user.findUnique({ where: { id: user.id } });
  if (requester?.role !== 'ADMIN' && requester?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isVerified: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(admins, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
