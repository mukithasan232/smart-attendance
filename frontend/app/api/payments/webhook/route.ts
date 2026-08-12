import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // In a real webhook from Stripe or similar, the payload structure would be dictated by them.
    // For this generic mock, we expect: { transactionId, billId, status: 'SUCCESS' | 'FAILED', providerName }
    const { transactionId, billId, status, providerName } = payload;

    if (!transactionId || !billId || !status || !providerName) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // 1. Fetch gateway to verify webhook signature
    const gateway = await prisma.paymentGateway.findUnique({
      where: { providerName }
    });

    if (!gateway) {
      return NextResponse.json({ error: 'Gateway not found' }, { status: 404 });
    }

    // Real world: 
    // const webhookSecret = decrypt(gateway.webhookSecret);
    // stripe.webhooks.constructEvent(request.body, request.headers['stripe-signature'], webhookSecret);

    // 2. Find Transaction
    const transaction = await prisma.transaction.findFirst({
      where: { transactionId, billId }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 3. Update Transaction and Bill atomically
    await prisma.$transaction(async (tx) => {
      const finalStatus = status === 'SUCCESS' ? 'PAID' : 'FAILED';
      
      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: finalStatus }
      });

      if (finalStatus === 'PAID') {
        await tx.bill.update({
          where: { id: billId },
          data: { status: 'PAID' }
        });
      }
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
