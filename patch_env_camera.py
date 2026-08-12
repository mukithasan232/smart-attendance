import re

with open(".env", "r") as f:
    content = f.read()

# Add CAMERA_SOURCE and CAMERA_MODE if not present
if "CAMERA_SOURCE=" not in content:
    content += "\n# Camera Live Config\nCAMERA_SOURCE=0\nCAMERA_MODE=live\n"
else:
    # Make sure CAMERA_MODE exists if CAMERA_SOURCE exists
    if "CAMERA_MODE=" not in content:
        content += "CAMERA_MODE=live\n"

with open(".env", "w") as f:
    f.write(content)

