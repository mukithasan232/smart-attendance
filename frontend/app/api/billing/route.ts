import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bills = await prisma.bill.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          select: { id: true, status: true, amount: true, gatewayUsed: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    // Also fetch available active gateways for the frontend to show options
    const activeGateways = await prisma.paymentGateway.findMany({
      where: { isActive: true },
      select: { id: true, providerName: true }
    });

    return NextResponse.json({ bills, availableGateways: activeGateways }, { status: 200 });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
