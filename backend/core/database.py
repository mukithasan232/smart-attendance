"""
database.py — SQLAlchemy schema and CRUD for the Security System with Supabase & pgvector.

Tables:
  persons  — registered (known) individuals with their face embeddings (Vector)
  events   — all detection events (Known hits + Unknown alerts)

Design notes:
  • Uses SQLAlchemy and psycopg2 (synchronous).
  • Embeddings stored as pgvector Vector(512).
  • All DB operations are synchronous internally, but exposed as `async def` wrappers
    using `asyncio.to_thread` so that the FastAPI event loop is never blocked, and
    the rest of the codebase remains unchanged!
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional
import json

import numpy as np
from loguru import logger
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pgvector.sqlalchemy import Vector

from backend.core.config import CAMERA_ID, DATABASE_URL, TENANT_ID

if not DATABASE_URL:
    logger.warning("DATABASE_URL is not set. Supabase integration will fail.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Schema DDL ─────────────────────────────────────────────────────────────────

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    face_embedding = Column(Vector(512), nullable=False)
    snapshot_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Integer, default=1, nullable=False)
    
    camera_id = Column(String, default='cam-01', nullable=False)
    tenant_id = Column(String, default='default', nullable=False)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    snapshot_path = Column(String, nullable=False)
    status = Column(String, default='Unknown', nullable=False)
    telegram_msg_id = Column(Integer, nullable=True)
    buffer_status = Column(String, default='pending', nullable=False)
    face_embedding = Column(Vector(512), nullable=True)
    
    camera_id = Column(String, default='cam-01', nullable=False)
    tenant_id = Column(String, default='default', nullable=False)


# ── Synchronous Core Functions ─────────────────────────────────────────────────

def _init_db() -> None:
    try:
        with engine.begin() as conn:
            conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector;")
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialised via SQLAlchemy.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

def _add_person(name: str, embedding: np.ndarray, snapshot_path: Optional[str] = None) -> int:
    with SessionLocal() as db:
        person = Person(
            name=name,
            face_embedding=embedding.astype(np.float32),
            snapshot_path=snapshot_path,
            camera_id=CAMERA_ID,
            tenant_id=TENANT_ID,
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        return int(person.id) # type: ignore

def _get_all_persons() -> list[dict]:
    with SessionLocal() as db:
        persons = db.query(Person).filter(Person.is_active == 1).order_by(Person.name.asc()).all()
        return [{"id": p.id, "name": p.name, "snapshot_path": p.snapshot_path} for p in persons]

def _get_all_persons_with_embeddings() -> list[dict]:
    with SessionLocal() as db:
        persons = db.query(Person).filter(Person.is_active == 1).order_by(Person.created_at.asc()).all()
        return [{
            "id": p.id, 
            "name": p.name, 
            "embedding": np.array(p.face_embedding, dtype=np.float32),
            "snapshot_path": p.snapshot_path
        } for p in persons]

def _delete_person(person_id: int) -> bool:
    with SessionLocal() as db:
        person = db.query(Person).filter(Person.id == person_id, Person.is_active == 1).first()
        if not person:
            return False
        person.is_active = 0 # type: ignore
        db.commit()
        logger.info("Person soft-deleted | id={}", person_id)
        return True

def _find_matching_person(query_embedding: np.ndarray, threshold: float) -> Optional[tuple[int, str, float]]:
    with SessionLocal() as db:
        query_vec = query_embedding.astype(np.float32)
        distance_col = Person.face_embedding.cosine_distance(query_vec).label("distance")
        
        result = (
            db.query(Person.id, Person.name, distance_col)
            .filter(Person.is_active == 1)
            .order_by(distance_col)
            .first()
        )
        
        if result:
            pid, name, distance = result
            if distance <= (1.0 - threshold):
                return pid, name, (1.0 - distance)
    return None

def _log_event(snapshot_path: str, status: str, person_id: Optional[int] = None) -> int:
    with SessionLocal() as db:
        event = Event(
            person_id=person_id,
            snapshot_path=snapshot_path,
            status=status,
            camera_id=CAMERA_ID,
            tenant_id=TENANT_ID,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        logger.debug("Event logged | id={} status={} person_id={}", event.id, status, person_id)
        return int(event.id) # type: ignore

def _get_recent_events(limit: int = 50) -> list[dict]:
    with SessionLocal() as db:
        events = (
            db.query(Event, Person.name)
            .outerjoin(Person, Event.person_id == Person.id)
            .order_by(Event.timestamp.desc())
            .limit(limit)
            .all()
        )
        
        results = []
        for event, person_name in events:
            ts_str = event.timestamp.strftime("%Y-%m-%d %H:%M:%S") if event.timestamp else ""
            results.append({
                "id": event.id,
                "person_id": event.person_id,
                "person_name": person_name if person_name else "Unknown",
                "timestamp": ts_str,
                "snapshot_path": event.snapshot_path,
                "status": event.status,
                "buffer_status": event.buffer_status,
                "camera_id": event.camera_id,
            })
        return results

def _get_event(event_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            return None
        return {
            "id": event.id,
            "person_id": event.person_id,
            "timestamp": event.timestamp.strftime("%Y-%m-%d %H:%M:%S") if event.timestamp else "",
            "snapshot_path": event.snapshot_path,
            "status": event.status,
            "buffer_status": event.buffer_status,
            "camera_id": event.camera_id,
        }

def _update_event_telegram_msg(event_id: int, telegram_msg_id: int) -> None:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.telegram_msg_id = telegram_msg_id # type: ignore
            db.commit()

def _update_event_buffer_status(event_id: int, status: str) -> None:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.buffer_status = status # type: ignore
            db.commit()

def _update_event_status_and_person(event_id: int, status: str, person_id: int) -> None:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = status # type: ignore
            event.person_id = person_id # type: ignore
            event.buffer_status = 'added' # type: ignore
            db.commit()

def _get_event_embedding(event_id: int) -> Optional[np.ndarray]:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event and event.face_embedding is not None:
            return np.array(event.face_embedding, dtype=np.float32)
        return None

def _store_event_embedding(event_id: int, embedding: np.ndarray) -> None:
    with SessionLocal() as db:
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.face_embedding = embedding.astype(np.float32) # type: ignore
            db.commit()


# ── Async Wrappers (Exposed API) ───────────────────────────────────────────────

async def init_db() -> None:
    await asyncio.to_thread(_init_db)

async def ensure_embedding_column() -> None:
    pass

async def add_person(name: str, embedding: np.ndarray, snapshot_path: Optional[str] = None) -> int:
    return await asyncio.to_thread(_add_person, name, embedding, snapshot_path)

async def get_all_persons() -> list[dict]:
    return await asyncio.to_thread(_get_all_persons)

async def get_all_persons_with_embeddings() -> list[dict]:
    return await asyncio.to_thread(_get_all_persons_with_embeddings)

async def delete_person(person_id: int) -> bool:
    return await asyncio.to_thread(_delete_person, person_id)

async def log_event(snapshot_path: str, status: str, person_id: Optional[int] = None) -> int:
    return await asyncio.to_thread(_log_event, snapshot_path, status, person_id)

async def get_recent_events(limit: int = 50) -> list[dict]:
    return await asyncio.to_thread(_get_recent_events, limit)

async def get_event(event_id: int) -> Optional[dict]:
    return await asyncio.to_thread(_get_event, event_id)

async def update_event_telegram_msg(event_id: int, telegram_msg_id: int) -> None:
    await asyncio.to_thread(_update_event_telegram_msg, event_id, telegram_msg_id)

async def update_event_buffer_status(event_id: int, status: str) -> None:
    await asyncio.to_thread(_update_event_buffer_status, event_id, status)

async def update_event_status_and_person(event_id: int, status: str, person_id: int) -> None:
    await asyncio.to_thread(_update_event_status_and_person, event_id, status, person_id)

async def get_event_embedding(event_id: int) -> Optional[np.ndarray]:
    return await asyncio.to_thread(_get_event_embedding, event_id)

async def store_event_embedding(event_id: int, embedding: np.ndarray) -> None:
    await asyncio.to_thread(_store_event_embedding, event_id, embedding)
    
# Not async since it's used inside the synchronous vision engine loop!
def find_matching_person(query_embedding: np.ndarray, threshold: float) -> Optional[tuple[int, str, float]]:
    return _find_matching_person(query_embedding, threshold)
