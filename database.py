"""
database.py — SQLite schema and async CRUD for the Security System.

Tables:
  persons  — registered (known) individuals with their face embeddings
  events   — all detection events (Known hits + Unknown alerts)

Design notes:
  • Uses aiosqlite for fully async I/O so FastAPI's event loop never blocks.
  • Embeddings stored as JSON-serialised float arrays (512-D InsightFace output).
  • Both tables carry camera_id + tenant_id for future SaaS multi-tenancy.
    Adding a tenant costs zero schema migration — just start writing a different
    tenant_id and filter on it.
  • The events table replaces both the old attendance_logs and unknown_face_buffer
    tables, keeping a single source of truth for all detection activity.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiosqlite
import numpy as np
from loguru import logger

from config import CAMERA_ID, DB_PATH, TENANT_ID


# ── Schema DDL ─────────────────────────────────────────────────────────────────

CREATE_PERSONS_TABLE = """
CREATE TABLE IF NOT EXISTS persons (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    face_embedding  TEXT    NOT NULL,       -- JSON float[512]
    snapshot_path   TEXT,                   -- path to registration photo
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    -- SaaS hooks (no migration required when multi-tenancy is added)
    camera_id       TEXT    NOT NULL DEFAULT 'cam-01',
    tenant_id       TEXT    NOT NULL DEFAULT 'default'
);
"""

CREATE_EVENTS_TABLE = """
CREATE TABLE IF NOT EXISTS events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id       INTEGER REFERENCES persons(id),  -- NULL for Unknown faces
    timestamp       TEXT    NOT NULL DEFAULT (datetime('now')),
    snapshot_path   TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Unknown',   -- 'Known' | 'Unknown'
    telegram_msg_id INTEGER,                -- Telegram message ID for the alert
    buffer_status   TEXT    NOT NULL DEFAULT 'pending',  -- 'pending'|'added'|'ignored'
    -- SaaS hooks
    camera_id       TEXT    NOT NULL DEFAULT 'cam-01',
    tenant_id       TEXT    NOT NULL DEFAULT 'default'
);
"""


# ── Initialisation ─────────────────────────────────────────────────────────────

async def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_PERSONS_TABLE)
        await db.execute(CREATE_EVENTS_TABLE)
        await db.commit()
    logger.info("Database initialised at {}", DB_PATH)


# ── Persons CRUD ───────────────────────────────────────────────────────────────

async def add_person(
    name: str,
    embedding: np.ndarray,
    snapshot_path: Optional[str] = None,
) -> int:
    """
    Insert a new known person with their face embedding.

    Args:
        name:          Display name (e.g., "John Smith").
        embedding:     512-D normalised float32 array from InsightFace.
        snapshot_path: Optional path to the registration snapshot.

    Returns:
        The auto-assigned integer ID of the new person.
    """
    emb_json = json.dumps(embedding.tolist())
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO persons (name, face_embedding, snapshot_path, camera_id, tenant_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, emb_json, snapshot_path, CAMERA_ID, TENANT_ID),
        )
        await db.commit()
        row_id = cursor.lastrowid
    logger.info("Person added | id={} name={}", row_id, name)
    return row_id  # type: ignore[return-value]


async def get_all_persons_with_embeddings() -> list[dict]:
    """
    Return all active persons including their numpy embeddings.
    Used by the VisionEngine to build the in-memory comparison matrix.

    Returns:
        List of dicts: { id, name, embedding: np.ndarray, created_at }
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT id, name, face_embedding, snapshot_path, created_at
            FROM   persons
            WHERE  is_active = 1
            ORDER  BY created_at ASC
            """
        ) as cursor:
            rows = await cursor.fetchall()

    persons = []
    for row in rows:
        persons.append(
            {
                "id": row["id"],
                "name": row["name"],
                "embedding": np.array(json.loads(row["face_embedding"]), dtype=np.float32),
                "snapshot_path": row["snapshot_path"],
                "created_at": row["created_at"],
            }
        )
    return persons


async def get_all_persons() -> list[dict]:
    """
    Return all active persons WITHOUT embeddings — safe for API responses.

    Returns:
        List of dicts: { id, name, snapshot_path, created_at }
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT id, name, snapshot_path, created_at
            FROM   persons
            WHERE  is_active = 1
            ORDER  BY name ASC
            """
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def delete_person(person_id: int) -> bool:
    """
    Soft-delete a person by setting is_active = 0.
    The embedding is kept in the DB for audit purposes.

    Returns:
        True if a row was found and deactivated, False otherwise.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "UPDATE persons SET is_active = 0 WHERE id = ? AND is_active = 1",
            (person_id,),
        )
        await db.commit()
        deactivated = cursor.rowcount > 0
    if deactivated:
        logger.info("Person soft-deleted | id={}", person_id)
    return deactivated


# ── Events CRUD ────────────────────────────────────────────────────────────────

async def log_event(
    snapshot_path: str,
    status: str,                          # "Known" or "Unknown"
    person_id: Optional[int] = None,      # None for Unknown faces
) -> int:
    """
    Record a detection event.

    Args:
        snapshot_path: Path to the saved frame snapshot.
        status:        "Known" or "Unknown".
        person_id:     ID from the persons table, or None if unknown.

    Returns:
        The auto-assigned event ID.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO events
                (person_id, snapshot_path, status, camera_id, tenant_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            (person_id, snapshot_path, status, CAMERA_ID, TENANT_ID),
        )
        await db.commit()
        row_id = cursor.lastrowid
    logger.debug(
        "Event logged | id={} status={} person_id={}", row_id, status, person_id
    )
    return row_id  # type: ignore[return-value]


async def get_recent_events(limit: int = 50) -> list[dict]:
    """
    Return recent detection events joined with person names.

    Returns:
        List of dicts including person_name (or 'Unknown') for display.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT
                e.id,
                e.person_id,
                COALESCE(p.name, 'Unknown') AS person_name,
                e.timestamp,
                e.snapshot_path,
                e.status,
                e.buffer_status,
                e.camera_id
            FROM  events e
            LEFT  JOIN persons p ON p.id = e.person_id
            ORDER BY e.timestamp DESC
            LIMIT ?
            """,
            (limit,),
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def get_event(event_id: int) -> Optional[dict]:
    """
    Retrieve a single event by ID, including the stored embedding
    (needed when promoting an Unknown to a Known person).

    Returns:
        Dict with all event fields, or None if not found.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM events WHERE id = ?", (event_id,)
        ) as cursor:
            row = await cursor.fetchone()
    return dict(row) if row else None


async def update_event_telegram_msg(event_id: int, telegram_msg_id: int) -> None:
    """Record the Telegram message ID after successfully sending an alert."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE events SET telegram_msg_id = ? WHERE id = ?",
            (telegram_msg_id, event_id),
        )
        await db.commit()


async def update_event_buffer_status(event_id: int, status: str) -> None:
    """
    Update the admin action status for an Unknown face alert.

    Args:
        event_id: The event to update.
        status:   One of 'pending', 'added', 'ignored'.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE events SET buffer_status = ? WHERE id = ?",
            (status, event_id),
        )
        await db.commit()


async def update_event_status_and_person(event_id: int, status: str, person_id: int) -> None:
    """
    Update the event status and link it to a newly registered person.
    Also marks buffer_status as 'added'.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE events SET status = ?, person_id = ?, buffer_status = 'added' WHERE id = ?",
            (status, person_id, event_id),
        )
        await db.commit()


async def get_event_embedding(event_id: int) -> Optional[np.ndarray]:
    """
    Retrieve the face embedding stored directly in the events table snapshot.
    NOTE: Embeddings for unknown faces are stored in a separate column added below.
    This function is used during the "Add as Known" Telegram flow.
    """
    # Embeddings for unknown events are stored in a dedicated column
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT face_embedding FROM events WHERE id = ?", (event_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if row is None or row["face_embedding"] is None:
        return None
    return np.array(json.loads(row["face_embedding"]), dtype=np.float32)


async def store_event_embedding(event_id: int, embedding: np.ndarray) -> None:
    """
    Store the face embedding alongside an event (used for Unknown faces
    so the admin can later promote them to Known with a single tap).
    Requires the events table to have a face_embedding column (added via migration).
    """
    emb_json = json.dumps(embedding.tolist())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE events SET face_embedding = ? WHERE id = ?",
            (emb_json, event_id),
        )
        await db.commit()


async def ensure_embedding_column() -> None:
    """
    Idempotently add face_embedding column to events if it doesn't exist.
    Called during init_db() so the schema self-heals on upgrade.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Check existing columns
        async with db.execute("PRAGMA table_info(events)") as cursor:
            cols = {row[1] async for row in cursor}
        if "face_embedding" not in cols:
            await db.execute(
                "ALTER TABLE events ADD COLUMN face_embedding TEXT"
            )
            await db.commit()
            logger.info("Added face_embedding column to events table.")
