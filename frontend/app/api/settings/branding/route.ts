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

export const DEFAULT_BRANDING = {
  appName: 'CoderNest',
  tagline: 'স্মার্ট ভিশন',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#4f46e5',
};

// GET is public so that the UI/layout can load the branding without auth if needed
export async function GET() {
  try {
    const record = await prisma.systemSettings.findUnique({
      where: { key: 'branding' }
    });

    if (record && record.value) {
      return NextResponse.json({ branding: record.value }, { status: 200 });
    }

    return NextResponse.json({ branding: DEFAULT_BRANDING }, { status: 200 });
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    // Return default on error so UI doesn't break
    return NextResponse.json({ branding: DEFAULT_BRANDING }, { status: 200 });
  }
}

// POST requires SUPER_ADMIN
export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();

    const record = await prisma.systemSettings.upsert({
      where: { key: 'branding' },
      update: { value: body },
      create: { key: 'branding', value: body }
    });

    return NextResponse.json({ message: 'Branding saved successfully', branding: record.value }, { status: 200 });
  } catch (error) {
    console.error('Error saving branding settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
