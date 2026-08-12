import re

# Update signup
with open("frontend/app/api/auth/signup/route.ts", "r") as f:
    signup_code = f.read()

if "sendWelcomeEmail" not in signup_code:
    signup_code = signup_code.replace(
        "import { cookies } from 'next/headers';",
        "import { cookies } from 'next/headers';\nimport { sendWelcomeEmail } from '@/lib/mail';"
    )
    
    # After user is created in Prisma: await prisma.user.create(...)
    target_block = "await prisma.user.create({"
    if target_block in signup_code:
        # We need to find where the Prisma call ends to insert the email call.
        # Simplest is to replace the return statement with the email call + return
        return_stmt = "return NextResponse.json({ user: data.user }, { status: 201 });"
        new_return = "sendWelcomeEmail(email).catch(console.error);\n\n    " + return_stmt
        signup_code = signup_code.replace(return_stmt, new_return)
        
        with open("frontend/app/api/auth/signup/route.ts", "w") as f:
            f.write(signup_code)


# Update login
with open("frontend/app/api/auth/login/route.ts", "r") as f:
    login_code = f.read()

if "sendLoginAlertEmail" not in login_code:
    login_code = login_code.replace(
        "import { cookies } from 'next/headers';",
        "import { cookies } from 'next/headers';\nimport { sendLoginAlertEmail } from '@/lib/mail';"
    )
    
    return_stmt = "return NextResponse.json({ user: data.user }, { status: 200 });"
    new_return = "sendLoginAlertEmail(email).catch(console.error);\n\n    " + return_stmt
    login_code = login_code.replace(return_stmt, new_return)

    with open("frontend/app/api/auth/login/route.ts", "w") as f:
        f.write(login_code)

