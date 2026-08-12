import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { billId, providerName } = await request.json();

    if (!billId || !providerName) {
      return NextResponse.json({ error: 'Missing billId or providerName' }, { status: 400 });
    }

    // 1. Fetch the Bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill || bill.userId !== user.id) {
      return NextResponse.json({ error: 'Bill not found or unauthorized' }, { status: 404 });
    }

    if (bill.status === 'PAID') {
      return NextResponse.json({ error: 'Bill is already paid' }, { status: 400 });
    }

    // 2. Fetch active gateway credentials
    const gateway = await prisma.paymentGateway.findUnique({
      where: { providerName }
    });

    if (!gateway || !gateway.isActive) {
      return NextResponse.json({ error: 'Selected payment gateway is not active or found' }, { status: 400 });
    }

    // 3. Decrypt the secret key securely
    const _secretKey = decrypt(gateway.secretKey);
    // At this point, you would initialize the SDK (e.g., Stripe) using the decrypted secret key.
    // const stripe = require('stripe')(_secretKey);

    // 4. Create Transaction Record (PENDING)
    // We generate a mock transactionId since we are simulating the gateway response
    const mockTransactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    
    await prisma.transaction.create({
      data: {
        billId: bill.id,
        userId: user.id,
        gatewayUsed: providerName,
        transactionId: mockTransactionId,
        amount: bill.amount,
        status: 'PENDING'
      }
    });

    // 5. Create Payment Intent/Session
    // In a real scenario, you'd call stripe.checkout.sessions.create(...)
    // and return the session.url to the frontend.
    
    const mockCheckoutUrl = `/checkout/mock?id=${mockTransactionId}`;

    return NextResponse.json({ 
      message: 'Checkout session created', 
      checkoutUrl: mockCheckoutUrl,
      transactionId: mockTransactionId
    }, { status: 200 });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
