import glob
import re

files = [
    'frontend/app/api/payments/webhook/route.ts',
    'frontend/app/api/payments/checkout/route.ts',
    'frontend/app/api/auth/forgot-password/route.ts',
    'frontend/app/api/auth/reset-password/route.ts',
    'frontend/app/api/newsletter/subscribe/route.ts',
    'frontend/app/api/billing/route.ts'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    # Replace import
    content = content.replace("import { PrismaClient } from '@prisma/client';", "import { prisma } from '@/lib/prisma';")
    content = content.replace('import { PrismaClient } from "@prisma/client";', "import { prisma } from '@/lib/prisma';")
    
    # Remove direct instantiation
    content = re.sub(r'const\s+prisma\s*=\s*new\s+PrismaClient\(\)\s*;\s*\n', '', content)
    
    with open(file, 'w') as f:
        f.write(content)
