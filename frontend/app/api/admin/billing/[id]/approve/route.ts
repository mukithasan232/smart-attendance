import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminCheck = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!adminCheck || (adminCheck.role !== 'SUPER_ADMIN' && adminCheck.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id: params.id }
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.status === 'PAID') {
      return NextResponse.json({ error: 'Bill is already paid' }, { status: 400 });
    }

    // Update Bill
    const updatedBill = await prisma.bill.update({
      where: { id: params.id },
      data: { status: 'PAID' }
    });

    // Update related Transaction
    await prisma.transaction.updateMany({
      where: { billId: params.id },
      data: { status: 'PAID' }
    });

    // Extract plan name if possible
    let planToUpgrade = 'Starter';
    const desc = bill.description || '';
    if (desc.toLowerCase().includes('enterprise')) planToUpgrade = 'Enterprise';
    else if (desc.toLowerCase().includes('pro')) planToUpgrade = 'Pro';

    // Update the Client associated with this user
    await prisma.client.updateMany({
      where: { adminId: bill.userId },
      data: { plan: planToUpgrade, status: 'Active' }
    });

    return NextResponse.json({ message: 'Bill approved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error approving bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
