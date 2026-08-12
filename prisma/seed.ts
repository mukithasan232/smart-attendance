import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create mock users if none exist (so we can assign bills)
  let user1 = await prisma.user.findFirst({ where: { email: 'mockuser1@example.com' } });
  if (!user1) {
    user1 = await prisma.user.create({
      data: {
        id: 'mock-user-1',
        email: 'mockuser1@example.com',
        role: 'USER',
        isVerified: true
      }
    });
  }

  let user2 = await prisma.user.findFirst({ where: { email: 'mockuser2@example.com' } });
  if (!user2) {
    user2 = await prisma.user.create({
      data: {
        id: 'mock-user-2',
        email: 'mockuser2@example.com',
        role: 'USER',
        isVerified: true
      }
    });
  }

  // 2. Create 3 mock clients
  const clients = [
    { name: 'Acme Corp', subdomain: 'acme', adminEmail: 'admin@acmecorp.com', plan: 'Enterprise', status: 'Active', users: 120 },
    { name: 'Globex Inc', subdomain: 'globex', adminEmail: 'billing@globex.com', plan: 'Pro', status: 'Active', users: 45 },
    { name: 'Soylent Corp', subdomain: 'soylent', adminEmail: 'admin@soylent.net', plan: 'Starter', status: 'Suspended', users: 5 }
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { subdomain: client.subdomain },
      update: {},
      create: client
    });
  }
  console.log('Mock clients created.');

  // 3. Create 2 pending bills for the users
  const bills = [
    { userId: user1.id, amount: 99.00, currency: 'USD', description: 'Pro Plan Monthly Subscription', status: 'PENDING' },
    { userId: user2.id, amount: 499.00, currency: 'USD', description: 'Enterprise Onboarding Fee', status: 'PENDING' }
  ];

  for (const bill of bills) {
    // Only create if user has no bills to prevent duplicate spam on re-seeding
    const existingBills = await prisma.bill.findMany({ where: { userId: bill.userId } });
    if (existingBills.length === 0) {
      await prisma.bill.create({ data: bill as any });
    }
  }
  console.log('Mock bills created.');

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
