import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, planName, amount, transactionId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    // Create the Bill
    const bill = await prisma.bill.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'PENDING',
        description: `Upgrade to ${planName} Plan`,
      }
    });

    // Create the Transaction
    await prisma.transaction.create({
      data: {
        billId: bill.id,
        userId: user.id,
        amount: parseFloat(amount),
        status: 'PENDING',
        gatewayUsed: 'Manual',
        transactionId: transactionId
      }
    });

    return NextResponse.json({ message: 'Manual payment submitted for approval.' }, { status: 201 });
  } catch (error) {
    console.error('Error submitting manual payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
