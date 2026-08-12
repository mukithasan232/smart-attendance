import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/encryption';

async function checkAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  return dbUser?.role === 'ADMIN' || dbUser?.role === 'SUPER_ADMIN';
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    
    // Support toggling isActive
    const dataToUpdate: any = {};
    if (body.isActive !== undefined) dataToUpdate.isActive = body.isActive;
    
    // Support updating keys (only if provided and not masked)
    if (body.apiKey) dataToUpdate.apiKey = body.apiKey;
    if (body.secretKey && !body.secretKey.includes('•')) dataToUpdate.secretKey = encrypt(body.secretKey);
    if (body.webhookSecret && !body.webhookSecret.includes('•')) dataToUpdate.webhookSecret = encrypt(body.webhookSecret);
    
    const gateway = await prisma.paymentGateway.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ message: 'Gateway updated', gateway }, { status: 200 });
  } catch (error) {
    console.error('Error updating gateway:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    await prisma.paymentGateway.delete({ where: { id } });

    return NextResponse.json({ message: 'Gateway deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting gateway:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
