const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config({ path: './.env.local' });

async function test() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    console.log("Connecting...");
    const user = await prisma.user.findFirst();
    console.log("Success! user:", user ? user.id : null);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
