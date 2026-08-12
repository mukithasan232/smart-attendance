import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const role = user.app_metadata?.role;
  if (role !== 'SUPER_ADMIN') {
    return { error: 'Forbidden: Super Admin access required', status: 403 };
  }

  return { user };
}

const DEFAULT_SMTP = {
  enabled: false,
  host: 'smtp.gmail.com',
  port: 587,
  use_tls: true,
  user: '',
  password: '',
  from_addr: '',
  to_emails: '',
  alert_unknown: false,
  alert_known: false,
};

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const record = await prisma.systemSettings.findUnique({
      where: { key: 'smtp' }
    });

    if (record && record.value) {
      return NextResponse.json({ smtp: record.value }, { status: 200 });
    }

    return NextResponse.json({ smtp: DEFAULT_SMTP }, { status: 200 });
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    const record = await prisma.systemSettings.upsert({
      where: { key: 'smtp' },
      update: { value: body },
      create: { key: 'smtp', value: body }
    });

    return NextResponse.json({ message: 'Settings saved successfully', smtp: record.value }, { status: 200 });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
