const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });

async function seed() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    console.log("Fetching admin from Supabase...");
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const adminEmail = 'admin@codernest.cloud';
    const existingUser = usersData.users.find(u => u.email === adminEmail);
    if (!existingUser) {
      console.log("Admin not found in Supabase Auth.");
      return;
    }

    console.log(`Found Supabase user: ${existingUser.id}`);
    
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const dbUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'SUPER_ADMIN',
        isVerified: true
      },
      create: {
        id: existingUser.id,
        email: adminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isVerified: true
      }
    });

    console.log("Prisma seeded successfully!", dbUser.email);
  } catch (e) {
    console.error("Error:", e);
  }
}
seed();
