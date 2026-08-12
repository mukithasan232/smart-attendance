import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gateway = await prisma.paymentGateway.findUnique({
      where: { providerName: 'Manual' }
    });

    if (!gateway || !gateway.isActive) {
      return NextResponse.json({ instructions: null }, { status: 200 });
    }

    return NextResponse.json({ instructions: gateway.apiKey }, { status: 200 });
  } catch (error) {
    console.error('Error fetching manual gateway:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
