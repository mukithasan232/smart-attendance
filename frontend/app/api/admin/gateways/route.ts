import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Only ADMINs should access this
async function checkAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  return dbUser?.role === 'ADMIN';
}

export async function GET() {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const gateways = await prisma.paymentGateway.findMany();
    
    // Mask sensitive data before sending to frontend
    const maskedGateways = gateways.map(g => ({
      ...g,
      secretKey: g.secretKey ? '••••••••••••••••' : null,
      webhookSecret: g.webhookSecret ? '••••••••••••••••' : null,
    }));

    return NextResponse.json(maskedGateways, { status: 200 });
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { providerName, apiKey, secretKey, webhookSecret, isActive } = await request.json();

    if (!providerName || !apiKey || !secretKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Encrypt sensitive keys
    const encryptedSecret = encrypt(secretKey);
    const encryptedWebhook = webhookSecret ? encrypt(webhookSecret) : null;

    const gateway = await prisma.paymentGateway.upsert({
      where: { providerName },
      update: {
        apiKey,
        secretKey: encryptedSecret,
        webhookSecret: encryptedWebhook,
        isActive: isActive ?? false
      },
      create: {
        providerName,
        apiKey,
        secretKey: encryptedSecret,
        webhookSecret: encryptedWebhook,
        isActive: isActive ?? false
      }
    });

    return NextResponse.json({ message: 'Gateway saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error saving gateway:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
