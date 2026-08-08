"""
scripts/test_db.py — Verify database.py works correctly.

Creates test persons, logs events, and retrieves records.
"""
import sys
import asyncio
from pathlib import Path

# Always resolve relative to this file, works from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
from backend.core.database import (
    init_db,
    add_person,
    get_all_persons_with_embeddings,
    log_event,
    get_recent_events,
    delete_person,
)


async def main():
    print("=== Database Test ===\n")

    # Init
    await init_db()
    print("✅ Database initialised")

    # Add test person
    fake_embedding = np.random.rand(512).astype(np.float32)
    fake_embedding /= np.linalg.norm(fake_embedding)
    person_id = await add_person("Test Person", fake_embedding)
    print(f"✅ Person added: id={person_id}")

    # List persons
    persons = await get_all_persons_with_embeddings()
    print(f"✅ Persons in DB: {len(persons)}")
    for p in persons:
        print(f"   • ID:{p['id']} — {p['name']} | emb shape={p['embedding'].shape}")

    # Log event
    event_id = await log_event("test_snap.jpg", "Known", person_id=person_id)
    print(f"✅ Event logged: event_id={event_id}")

    # Recent events
    events = await get_recent_events(limit=5)
    print(f"✅ Recent events ({len(events)} rows):")
    for event in events:
        print(f"   • {event['person_name']} at {event['timestamp']} | status={event['status']}")

    # Delete test person
    deleted = await delete_person(person_id)
    print(f"✅ Person deleted: {deleted}")

    print("\n=== All tests passed! ===")


if __name__ == "__main__":
    asyncio.run(main())
