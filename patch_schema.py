import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

# Add fields to User
user_regex = re.compile(r"(model User \{.*?createdAt\s+DateTime\s+@default\(now\(\)\))", re.DOTALL)
replacement = r"\1\n  passwordResetToken   String? \n  passwordResetExpires DateTime?"
content = user_regex.sub(replacement, content)

# Add NewsletterSubscriber model
newsletter_model = """

model NewsletterSubscriber {
  id           String   @id @default(uuid())
  email        String   @unique
  subscribedAt DateTime @default(now())
  isActive     Boolean  @default(true)
}
"""
content += newsletter_model

with open("prisma/schema.prisma", "w") as f:
    f.write(content)
