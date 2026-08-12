import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = user.app_metadata?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });

    return NextResponse.json(plans, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = user.app_metadata?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, features, isPopular } = body;

    if (!name || !description || price === undefined) {
      return NextResponse.json({ error: 'Name, description, and price are required' }, { status: 400 });
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        features: features || [],
        isPopular: isPopular || false
      }
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
