with open("prisma/schema.prisma", "r") as f:
    content = f.read()

billing_models = """

enum PaymentStatus {
  PENDING
  PAID
  FAILED
}

model PaymentGateway {
  id            String   @id @default(uuid())
  providerName  String   @unique
  apiKey        String
  secretKey     String
  webhookSecret String?
  isActive      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Bill {
  id          String        @id @default(uuid())
  userId      String
  amount      Float
  currency    String        @default("USD")
  status      PaymentStatus @default(PENDING)
  dueDate     DateTime?
  description String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  
  user        User          @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

model Transaction {
  id            String        @id @default(uuid())
  billId        String
  userId        String
  gatewayUsed   String
  transactionId String?       // ID returned by the gateway
  amount        Float
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  
  bill          Bill          @relation(fields: [billId], references: [id])
  user          User          @relation(fields: [userId], references: [id])
}
"""

# Need to append user relation `bills Bill[]` and `transactions Transaction[]` to User model
if "bills          Bill[]" not in content:
    import re
    user_regex = re.compile(r"(model User \{.*?)(^\})", re.DOTALL | re.MULTILINE)
    replacement = r"\1  bills                Bill[]\n  transactions         Transaction[]\n\2"
    content = user_regex.sub(replacement, content)

if "model PaymentGateway" not in content:
    content += billing_models

with open("prisma/schema.prisma", "w") as f:
    f.write(content)

