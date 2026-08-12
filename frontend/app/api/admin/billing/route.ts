import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bills = await prisma.bill.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            id: true
          }
        }
      }
    });

    return NextResponse.json(bills, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, currency, dueDate, description } = body;

    if (!userId || !amount) {
      return NextResponse.json({ error: 'User ID and Amount are required' }, { status: 400 });
    }

    const newBill = await prisma.bill.create({
      data: {
        userId,
        amount: parseFloat(amount),
        currency: currency || 'USD',
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            email: true,
            id: true
          }
        }
      }
    });

    return NextResponse.json(newBill, { status: 201 });
  } catch (error: any) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
