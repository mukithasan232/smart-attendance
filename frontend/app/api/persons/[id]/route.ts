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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const personId = parseInt(id, 10);
    const tenantId = await getTenantId(user.id);

    // Verify ownership
    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId }
    });

    if (!person) {
      return NextResponse.json({ error: 'Not Found or Forbidden' }, { status: 404 });
    }

    // Forward delete to FastAPI to ensure cache/memory structures are cleared
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${API_BASE}/api/persons/${personId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
       let err;
       try {
         err = await res.json();
       } catch (e) {
         err = { detail: res.statusText };
       }
       return NextResponse.json({ error: err.detail || 'Failed to delete in backend' }, { status: res.status });
    }

    // Usually FastAPI deletes the record from DB too, but we can safely ignore if already deleted
    return NextResponse.json({ success: true, message: 'Person deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting person:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
