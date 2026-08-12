import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

export async function GET() {
  const auth = await getAuthUser();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      select: { settings: true }
    });

    return NextResponse.json({ settings: userRecord?.settings || {} }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    // Fetch existing first to merge deeply if needed, or just overwrite for now
    const userRecord = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      select: { settings: true }
    });

    const currentSettings = (userRecord?.settings as object) || {};
    const newSettings = { ...currentSettings, ...body };

    const updatedUser = await prisma.user.update({
      where: { id: auth.user!.id },
      data: { settings: newSettings }
    });

    return NextResponse.json({ message: 'Settings saved successfully', settings: updatedUser.settings }, { status: 200 });
  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
