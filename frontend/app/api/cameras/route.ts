import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cameras = await prisma.cameraSetting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ cameras });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to fetch cameras', details: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const camera = await prisma.cameraSetting.create({
      data: {
        name: data.name,
        url: data.url,
        location: data.location || '',
        enabled: data.enabled !== undefined ? data.enabled : true,
      }
    });
    return NextResponse.json({ message: 'Camera added', camera });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to add camera', details: (error as Error).message }, { status: 500 });
  }
}
