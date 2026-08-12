import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function getTenantId(userId: string) {
  const client = await prisma.client.findFirst({
    where: { adminId: userId }
  });
  return client ? client.id : userId;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(user.id);

    const cameras = await prisma.cameraSetting.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ cameras });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to fetch cameras', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(user.id);
    const data = await req.json();

    const camera = await prisma.cameraSetting.create({
      data: {
        name: data.name,
        url: data.url,
        location: data.location || '',
        enabled: data.enabled !== undefined ? data.enabled : true,
        tenantId,
      }
    });
    return NextResponse.json({ message: 'Camera added', camera });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to add camera', details: (error as Error).message }, { status: 500 });
  }
}
