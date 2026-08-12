import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const smtp = await request.json();

    if (!smtp || !smtp.host || !smtp.user || !smtp.password || !smtp.to_emails) {
      return NextResponse.json({ error: 'Missing required SMTP configuration (host, user, password, to_emails)' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465, // Use `true` for port 465, `false` for all other ports
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    });

    const info = await transporter.sendMail({
      from: smtp.from_addr || smtp.user,
      to: smtp.to_emails,
      subject: 'Test Email - SecureVision ERP',
      text: 'This is a test email sent from the SecureVision ERP Super Admin Settings.',
      html: '<b>This is a test email sent from the SecureVision ERP Super Admin Settings.</b>',
    });

    return NextResponse.json({ success: true, message: `Test email sent successfully! Message ID: ${info.messageId}` }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send test email' }, { status: 500 });
  }
}
