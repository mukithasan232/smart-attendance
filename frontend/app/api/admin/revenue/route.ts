import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const bills = await prisma.bill.findMany({
      include: {
        user: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bills, { status: 200 });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { userId, amount, currency, description, dueDate } = body;

    if (!userId || !amount) {
      return NextResponse.json({ error: 'User ID and amount are required' }, { status: 400 });
    }

    const newBill = await prisma.bill.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        user: { select: { email: true } }
      }
    });

    return NextResponse.json(newBill, { status: 201 });
  } catch (error: any) {
    console.error('Error generating bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
