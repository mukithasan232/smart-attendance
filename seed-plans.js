const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const initialPlans = [
  {
    name: 'Starter',
    description: 'For small teams getting started.',
    price: 0,
    isPopular: false,
    features: ['Up to 50 Known Persons', 'Basic Analytics', '1 Camera Support']
  },
  {
    name: 'Pro',
    description: 'The core plan for growing businesses.',
    price: 1000,
    isPopular: true,
    features: ['Unlimited Known Persons', '24/7 RTSP Monitoring', 'Telegram Alerts integration']
  },
  {
    name: 'Enterprise',
    description: 'Full hardware & multi-camera setup.',
    price: 5000,
    isPopular: false,
    features: ['Everything in Pro', 'Custom Hardware Setup', 'Unlimited Camera Support']
  }
];

async function main() {
  console.log('Seeding Subscription Plans...');
  for (const plan of initialPlans) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan });
      console.log(`Created plan: ${plan.name}`);
    } else {
      console.log(`Plan already exists: ${plan.name}`);
    }
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
