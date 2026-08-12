import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const camera = await prisma.cameraSetting.update({
      where: { id: params.id },
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.cameraSetting.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ message: 'Camera deleted' });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to delete camera', details: (error as Error).message }, { status: 500 });
  }
}
