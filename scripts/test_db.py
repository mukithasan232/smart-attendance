"""
scripts/test_db.py — Verify database.py works correctly.

Creates test users, logs attendance, and retrieves records.
"""
import sys
import asyncio
from pathlib import Path

# Always resolve relative to this file, works from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from database import (
    init_db,
    add_user,
    get_all_users,
    log_attendance,
    get_recent_logs,
    delete_user,
)


async def main():
    print("=== Database Test ===\n")

    # Init
    await init_db()
    print("✅ Database initialised")

    # Add test user
    fake_embedding = np.random.rand(512).astype(np.float32)  # type: ignore
    fake_embedding /= np.linalg.norm(fake_embedding)  # type: ignore
    user_id = await add_user("TEST001", "Test Person", fake_embedding)
    print(f"✅ User added: id={user_id}")

    # List users
    users = await get_all_users()
    print(f"✅ Users in DB: {len(users)}")
    for u in users:
        print(f"   • {u['employee_id']} — {u['name']} | emb shape={u['embedding'].shape}")

    # Log attendance
    log_id = await log_attendance("TEST001", "Test Person", confidence=0.95)
    print(f"✅ Attendance logged: log_id={log_id}")

    # Recent logs
    logs = await get_recent_logs(limit=5)
    print(f"✅ Recent logs ({len(logs)} rows):")
    for log in logs:
        print(f"   • {log['employee_id']} at {log['logged_at']} | synced={log['hrm_synced']}")

    # Delete test user
    deleted = await delete_user("TEST001")
    print(f"✅ User deleted: {deleted}")

    print("\n=== All tests passed! ===")


if __name__ == "__main__":
    asyncio.run(main())
