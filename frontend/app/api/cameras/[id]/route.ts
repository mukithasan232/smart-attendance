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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantId(user.id);
    const data = await req.json();

    const existing = await prisma.cameraSetting.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found or Forbidden' }, { status: 404 });
    }

    const camera = await prisma.cameraSetting.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        location: data.location,
        enabled: data.enabled,
      }
    });
    return NextResponse.json({ message: 'Camera updated', camera });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to update camera', details: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantId(user.id);

    const existing = await prisma.cameraSetting.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found or Forbidden' }, { status: 404 });
    }

    await prisma.cameraSetting.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Camera deleted' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to delete camera', details: (error as Error).message }, { status: 500 });
  }
}
