import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function getTenantId(userId: string) {
  const client = await prisma.client.findFirst({
    where: { adminId: userId }
  });
  return client ? client.id : userId;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(user.id);

    const persons = await prisma.person.findMany({
      where: { tenantId, is_active: 1 },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(persons, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching persons:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
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

    const tenantId = await getTenantId(user.id);
    const formData = await request.formData();
    
    // Forward to FastAPI
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/persons`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      let err;
      try {
        err = await res.json();
      } catch (e) {
        err = { detail: res.statusText };
      }
      return NextResponse.json({ error: err.detail || 'Failed to register person via CV backend' }, { status: res.status });
    }
    
    const data = await res.json();
    const personId = data.person_id;
    
    // Update the inserted record with tenantId
    if (personId) {
       await prisma.person.update({
         where: { id: personId },
         data: { tenantId }
       });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /persons:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
