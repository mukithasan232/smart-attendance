import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = user.app_metadata?.role;
  if (role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const clients = await prisma.client.findMany({
      orderBy: { joinedAt: 'desc' },
    });
    return NextResponse.json(clients, { status: 200 });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, subdomain, plan, status, users } = body;

    if (!name || !subdomain) {
      return NextResponse.json({ error: 'Name and subdomain are required' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        subdomain,
        plan: plan || 'Starter',
        status: status || 'Active',
        users: users || 0,
      },
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Subdomain already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
