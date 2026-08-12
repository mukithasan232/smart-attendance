import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { botToken, chatId } = await request.json();

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Bot Token and Chat ID are required' }, { status: 400 });
    }

    const message = `🔔 Hello! This is a test notification from your Smart Attendance / CoderNest Client Settings.\n\nTime: ${new Date().toUTCString()}`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      console.error('Telegram API error:', data);
      return NextResponse.json({ error: data.description || 'Failed to send message to Telegram' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Test message sent successfully!' }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending telegram test message:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
