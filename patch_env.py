import re

with open(".env", "r") as f:
    content = f.read()

# Update DATABASE_URL to include ?pgbouncer=true
def replace_url(match):
    url = match.group(1)
    if "?pgbouncer=true" not in url:
        if "?" in url:
            url += "&pgbouncer=true"
        else:
            url += "?pgbouncer=true"
    return f'DATABASE_URL="{url}"'

content = re.sub(r'DATABASE_URL="([^"]+)"', replace_url, content)
content = re.sub(r"DATABASE_URL=([^\s\"']+)", lambda m: replace_url(m).replace('"', ''), content)

# Generate a random 32-byte hex for ENCRYPTION_KEY if not present
if "ENCRYPTION_KEY=" not in content:
    import secrets
    key = secrets.token_hex(32)
    content += f"\nENCRYPTION_KEY={key}\n"

with open(".env", "w") as f:
    f.write(content)

with open("frontend/.env", "r") as f:
    f_content = f.read()
    
if "ENCRYPTION_KEY=" not in f_content:
    f_content += f"\nENCRYPTION_KEY={key}\n"
    with open("frontend/.env", "w") as f:
        f.write(f_content)

