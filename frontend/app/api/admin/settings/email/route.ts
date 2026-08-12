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
  html_template: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
  <div style="background-color: #1e3a8a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SecureVision ERP</h1>
  </div>
  <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; color: #374151; line-height: 1.6;">
    <p style="font-size: 16px; margin-top: 0;">Hello,</p>
    <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; font-size: 15px;">
      {{message}}
    </div>
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px; margin-bottom: 0; border-top: 1px solid #e5e7eb; padding-top: 15px;">
      This is an automated notification from SecureVision ERP. Please do not reply to this email.
    </p>
  </div>
</div>`,
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
