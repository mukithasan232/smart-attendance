"""
main.py — FastAPI application: RTSP processing + REST API + Telegram webhook.

Architecture:
  • Lifespan: on startup, init DB → load persons → start camera → start bg task
  • Background loop: camera → VisionEngine → DB log → Telegram alert (async)
  • /api/stream:            MJPEG live video feed for the dashboard
  • /api/events:            Recent detection events (Known + Unknown)
  • /api/persons:           Known persons list (no embeddings)
  • /api/persons/upload:    Register new person via photo upload
  • /api/persons/{id}:      Delete a known person
  • /api/telegram/webhook:  Receive Telegram inline button / text replies
  • /api/status:            System health check

Thread safety:
  • camera.read() is called from the async processing_loop running in the
    event loop — safe because RTSPCamera uses an internal lock.
  • recognizer.process_frame() is CPU-bound; run in an executor thread to
    prevent blocking the event loop.
  • All DB operations are async via aiosqlite — no blocking I/O on the loop.
  • The last_results global is written from the processing loop and read by
    the stream generator — both on the event loop, so no race condition.
"""

import asyncio
import io
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pydantic import BaseModel

class RegisterPersonRequest(BaseModel):
    name: str
from telegram import Update

import bot
import database
from camera import RTSPCamera
from config import (
    CAMERA_ID,
    SERVER_HOST,
    SERVER_PORT,
    SNAPSHOTS_DIR,
    TELEGRAM_ADMIN_ID,
    TELEGRAM_WEBHOOK_URL,
    UNKNOWN_COOLDOWN_SEC,
)
from vision import RecognitionResult, engine

# ── Shared state ───────────────────────────────────────────────────────────────
camera: Optional[RTSPCamera] = None
_processing_task: Optional[asyncio.Task] = None

# Most recent recognition results — read by the MJPEG stream to draw overlays
last_results: list[RecognitionResult] = []

# Cooldown tracker — prevents spamming alerts for the same unknown person
# Maps: zone_key (str) → last_alert_timestamp (float, monotonic)
_last_unknown_alert: dict[str, float] = {}

# Debounce tracker — prevents duplicate "Known" event logs for same person
# Maps: person_id (int) → last_logged_timestamp (float, monotonic)
_last_known_log: dict[int, float] = {}
KNOWN_LOG_COOLDOWN_SEC = 300  # 5 minutes between repeat logs for the same person


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: startup initialisation and graceful shutdown."""
    global camera, _processing_task

    logger.info("=== Smart Face Recognition Security System — Starting Up ===")

    # 1. Initialise database (creates tables if they don't exist)
    await database.init_db()
    await database.ensure_embedding_column()  # idempotent schema migration

    # 2. Load all known persons into the VisionEngine cache
    persons = await database.get_all_persons_with_embeddings()
    engine.initialize()
    engine.load_known_persons(persons)

    # 3. Start the RTSP camera reader thread
    camera = RTSPCamera()
    camera.start()

    # 4. Start the async AI processing loop
    _processing_task = asyncio.create_task(processing_loop())
    logger.info("Background processing loop started.")

    # 5. Register Telegram webhook (if a public URL is configured)
    if TELEGRAM_WEBHOOK_URL:
        await bot.set_webhook(TELEGRAM_WEBHOOK_URL)
    else:
        logger.warning(
            "TELEGRAM_WEBHOOK_URL not set — Telegram alerts will still be sent "
            "but the bot cannot receive button/text replies without a webhook or polling."
        )

    yield  # ── Server is live ─────────────────────────────────────────────────

    logger.info("=== Smart Face Recognition Security System — Shutting Down ===")
    if _processing_task:
        _processing_task.cancel()
        try:
            await _processing_task
        except asyncio.CancelledError:
            pass
    if camera is not None:
        camera.stop()


# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Smart Face Recognition Security System",
    description="AI-powered security camera with Telegram alerts and a web dashboard.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten this in production (e.g., your dashboard domain)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve saved snapshots as static files for the dashboard thumbnail display
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")


# ── Background Processing Loop ─────────────────────────────────────────────────

async def processing_loop() -> None:
    """
    Main AI processing loop — runs as a persistent asyncio background task.

    Algorithm:
      1. Non-blocking read of the latest camera frame.
      2. Run VisionEngine.process_frame() in a thread executor (CPU-bound).
      3. For KNOWN faces: log a debounced attendance event.
      4. For UNKNOWN faces: apply cooldown → save snapshot → log event → alert admin.
    """
    global last_results
    loop = asyncio.get_event_loop()
    logger.info("Processing loop running.")

    while True:
        await asyncio.sleep(0)  # Yield control to the event loop

        if camera is None or not camera.is_running:
            await asyncio.sleep(0.1)
            continue

        ok, frame = camera.read()
        if not ok or frame is None:
            await asyncio.sleep(0.05)
            continue

        # CPU-bound inference → thread pool executor (won't block the event loop)
        try:
            results = await loop.run_in_executor(
                None, engine.process_frame, frame.copy()
            )
        except Exception as exc:
            logger.error("VisionEngine error: {}", exc)
            await asyncio.sleep(0.1)
            continue

        last_results = results  # Update global for MJPEG stream overlay

        for result in results:
            if result.embedding is None:
                continue
            if result.is_known:
                await _handle_known_face(result, frame)
            else:
                await _handle_unknown_face(result, frame)


async def _handle_known_face(result: RecognitionResult, frame: np.ndarray) -> None:
    """
    Log a recognition event for a known person (debounced).

    No alert is sent — known persons are logged silently.
    """
    person_id = result.matched_person_id
    if person_id is None:
        return

    # Debounce: skip logging if we just logged this person recently
    now = time.monotonic()
    if now - _last_known_log.get(person_id, 0) < KNOWN_LOG_COOLDOWN_SEC:
        return
    _last_known_log[person_id] = now

    # Save a snapshot for the audit log
    snapshot_path = _save_snapshot(frame, f"known_{person_id}")
    if snapshot_path is None:
        return

    await database.log_event(
        snapshot_path=str(snapshot_path),
        status="Known",
        person_id=person_id,
    )
    logger.info(
        "Known person recognised | name={} confidence={:.3f}",
        result.matched_name,
        result.confidence,
    )



def is_image_clear(image_crop: np.ndarray, threshold: float = 100.0) -> bool:
    """Check if an image crop is clear enough using Laplacian variance."""
    if image_crop.size == 0:
        return False
    variance = cv2.Laplacian(image_crop, cv2.CV_64F).var()
    return variance >= threshold


async def _handle_unknown_face(result: RecognitionResult, frame: np.ndarray) -> None:
    """
    Raise a security alert for an unknown face.

    Applies a cooldown window (UNKNOWN_COOLDOWN_SEC) to prevent notification spam
    when the same unknown person stays in frame. After cooldown:
      1. Save snapshot to disk.
      2. Store the embedding alongside the event (for later registration).
      3. Send a Telegram alert with [Add as Known] / [Ignore] buttons.
    """
    # 1. Confidence check
    if result.det_score < 0.60:
        logger.debug("Face rejected due to low confidence ({:.2f} < 0.60)", result.det_score)
        return

    # 2. Face size check
    x1, y1, x2, y2 = result.bbox
    width = x2 - x1
    height = y2 - y1
    if width < 40 or height < 40:
        logger.debug("Face rejected due to small size ({}x{})", width, height)
        return

    # 3. Blur detection check
    face_crop = frame[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
    if not is_image_clear(face_crop, threshold=50.0):
        logger.debug("Face rejected due to blur (Laplacian variance < 100)")
        return

    # Cooldown check — one zone key for now; extend to spatial zones later
    zone_key = "default"
    now = time.monotonic()
    if now - _last_unknown_alert.get(zone_key, 0) < UNKNOWN_COOLDOWN_SEC:
        return
    _last_unknown_alert[zone_key] = now

    # Save the snapshot
    snapshot_path = _save_snapshot(frame, "unknown")
    if snapshot_path is None:
        return

    # Create the event record
    event_id = await database.log_event(
        snapshot_path=str(snapshot_path),
        status="Unknown",
        person_id=None,
    )

    # Store the embedding so the admin can promote this person later
    await database.store_event_embedding(event_id, result.embedding)

    # Send Telegram alert
    msg_id = await bot.send_unknown_face_alert(
        snapshot_path=snapshot_path,
        event_id=event_id,
        timestamp=datetime.now(),
    )

    if msg_id is not None:
        await database.update_event_telegram_msg(event_id, msg_id)


def _save_snapshot(frame: np.ndarray, prefix: str) -> Optional[Path]:
    """Save a frame as JPEG to the snapshots directory. Returns the path or None."""
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        path = SNAPSHOTS_DIR / f"{prefix}_{ts}.jpg"
        cv2.imwrite(str(path), frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return path
    except Exception as exc:
        logger.error("Snapshot save failed: {}", exc)
        return None


# ── MJPEG Stream ───────────────────────────────────────────────────────────────

@app.get("/api/stream", summary="Live MJPEG camera feed")
async def video_stream():
    """
    Stream the live camera feed as an MJPEG multipart HTTP response.

    Browsers and <img> tags can display this directly:
      <img src="http://localhost:8000/api/stream" />

    Each frame is annotated with face detection bounding boxes and labels
    using the most recent recognition results (updated by the processing loop).
    """
    async def frame_generator():
        while True:
            if camera is None:
                await asyncio.sleep(0.1)
                continue

            ok, frame = camera.read()
            if not ok or frame is None:
                await asyncio.sleep(0.05)
                continue

            # Annotate with latest recognition results (non-blocking read of global)
            annotated = engine.draw_results(frame.copy(), last_results)

            # Encode as JPEG
            success, jpeg_buf = cv2.imencode(
                ".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70]
            )
            if not success:
                await asyncio.sleep(0.05)
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + jpeg_buf.tobytes()
                + b"\r\n"
            )
            await asyncio.sleep(1 / 20)  # ~20 FPS max

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


# ── Telegram Webhook ───────────────────────────────────────────────────────────

@app.post("/api/telegram/webhook", include_in_schema=False)
async def telegram_webhook(request: Request) -> Response:
    """Receive Telegram updates and dispatch to bot handlers."""
    try:
        body = await request.json()
        update = Update.de_json(body, bot.get_bot())
    except Exception as exc:
        logger.error("Failed to parse Telegram update: {}", exc)
        return Response(status_code=400)

    # ── Inline button callback ─────────────────────────────────────────────────
    if update.callback_query:
        result = await bot.handle_callback_query(update)
        action = result.get("action")

        if action == "ignore":
            await database.update_event_buffer_status(result["event_id"], "ignored")

    # ── Text message (name input after clicking "Add as Known") ───────────────
    elif update.message and update.message.text:
        result = await bot.handle_text_message(update)

        if result.get("action") == "register":
            await _register_person_from_telegram(result)

    return Response(status_code=200)


async def _register_person_from_telegram(data: dict) -> None:
    """
    Complete the one-tap registration flow triggered from Telegram.

    Steps:
      1. Retrieve the event to get its stored face embedding.
      2. Insert a new person record into the DB.
      3. Mark the event's buffer_status as 'added'.
      4. Reload the VisionEngine cache so the person is recognised immediately.
      5. Confirm registration to the admin via Telegram.
    """
    event_id = data["event_id"]
    name = data["name"]

    # Fetch the embedding stored alongside the event
    embedding = await database.get_event_embedding(event_id)
    if embedding is None:
        await bot.send_text_to_admin(
            f"⚠️ Could not retrieve face data for Event <code>#{event_id}</code>. "
            f"Registration failed."
        )
        logger.error("No embedding found for event_id={}", event_id)
        return

    # Fetch the snapshot path for the person gallery thumbnail
    event = await database.get_event(event_id)
    snapshot_path = event["snapshot_path"] if event else None

    # Register the person
    try:
        person_id = await database.add_person(
            name=name,
            embedding=embedding,
            snapshot_path=snapshot_path,
        )
    except Exception as exc:
        logger.error("add_person failed: {}", exc)
        await bot.send_text_to_admin(
            f"⚠️ Failed to register <b>{name}</b>: {exc}"
        )
        return

    # Mark the alert as resolved
    await database.update_event_buffer_status(event_id, "added")

    # Hot-reload the VisionEngine cache (takes effect on next processed frame)
    persons = await database.get_all_persons_with_embeddings()
    engine.load_known_persons(persons)

    logger.info("Registered via Telegram | id={} name={}", person_id, name)

    await bot.send_text_to_admin(
        f"✅ <b>Registered successfully!</b>\n\n"
        f"👤 <b>Name:</b> {name}\n"
        f"🆔 <b>Person ID:</b> {person_id}\n\n"
        f"<i>This face will now be recognised automatically. 🎉</i>"
    )


# ── REST API Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/status", summary="System health check")
async def get_status():
    """Return camera status, known persons count, and server timestamp."""
    persons = await database.get_all_persons()
    return {
        "status": "running",
        "camera_id": CAMERA_ID,
        "camera_running": camera.is_running if camera else False,
        "known_persons_count": len(persons),
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
    }


@app.get("/api/events", summary="Recent detection events")
async def get_events(limit: int = 50):
    """
    Return the most recent detection events (Known + Unknown).
    Each event includes the person_name (or 'Unknown'), timestamp, and snapshot path.
    """
    events = await database.get_recent_events(limit=limit)
    return events


@app.get("/api/persons", summary="List known persons")
async def list_persons():
    """Return all active known persons (no embeddings — safe for API consumers)."""
    return await database.get_all_persons()


@app.post("/api/events/{event_id}/register_person", summary="Register unknown person from event")
async def register_person_from_event(event_id: int, req: RegisterPersonRequest):
    """
    Register a person directly from an 'Unknown' event via the dashboard.
    Loads the saved snapshot, runs InsightFace to extract the embedding,
    registers the person, and updates the event status to 'Known'.
    """
    event = await database.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    snapshot_path = event["snapshot_path"]
    if not snapshot_path or not Path(snapshot_path).exists():
        raise HTTPException(status_code=404, detail="Snapshot file not found on disk.")

    # Run InsightFace on the saved snapshot
    frame = cv2.imread(snapshot_path)
    if frame is None:
        raise HTTPException(status_code=500, detail="Failed to read the snapshot image.")

    embedding = engine.generate_embedding(frame)
    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No face could be detected in the saved snapshot. Cannot register."
        )

    # Insert new record into persons table
    try:
        person_id = await database.add_person(
            name=req.name,
            embedding=embedding,
            snapshot_path=snapshot_path,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")

    # Update the event's status to Known and link to the new person
    await database.update_event_status_and_person(event_id, "Known", person_id)

    # Reload VisionEngine cache
    persons = await database.get_all_persons_with_embeddings()
    engine.load_known_persons(persons)

    return {
        "message": f"Successfully registered '{req.name}' and updated the event.",
        "person_id": person_id,
        "event_id": event_id,
    }


@app.post("/api/persons/upload", status_code=201, summary="Register person via photo")
async def upload_person(
    name: str = Form(...),
    image: UploadFile = File(...),
):
    """
    Register a new known person by uploading a clear photo.
    The system detects the face, extracts its embedding, and stores it.

    Constraints:
      • Image must contain exactly one face.
      • Photo should be clear and well-lit for best accuracy.
    """
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    embedding = engine.generate_embedding(frame)
    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No face detected in the uploaded image. Please use a clear, well-lit photo.",
        )

    # Save the registration photo as the person's gallery thumbnail
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    snapshot_path = SNAPSHOTS_DIR / f"registered_{ts}.jpg"
    cv2.imwrite(str(snapshot_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])

    try:
        person_id = await database.add_person(
            name=name,
            embedding=embedding,
            snapshot_path=str(snapshot_path),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Reload VisionEngine cache
    persons = await database.get_all_persons_with_embeddings()
    engine.load_known_persons(persons)

    return {
        "message": f"'{name}' registered successfully.",
        "person_id": person_id,
        "snapshot_path": str(snapshot_path),
    }


@app.delete("/api/persons/{person_id}", summary="Delete a known person")
async def delete_person(person_id: int):
    """
    Soft-delete a known person by ID. The person will no longer be recognised.
    Historical event records are preserved for audit purposes.
    """
    deleted = await database.delete_person(person_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Person #{person_id} not found.")

    persons = await database.get_all_persons_with_embeddings()
    engine.load_known_persons(persons)

    return {"message": f"Person #{person_id} has been removed from the system."}


@app.post("/api/persons/reload", summary="Force reload recognition cache")
async def reload_persons():
    """Force-reload the VisionEngine's in-memory embedding cache from the database."""
    persons = await database.get_all_persons_with_embeddings()
    engine.load_known_persons(persons)
    return {"message": f"Loaded {len(persons)} known persons into VisionEngine."}


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "Smart Face Recognition Security System",
        "version": "2.0.0",
        "docs": "/docs",
        "stream": "/api/stream",
        "status": "/api/status",
    }


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=False,
        log_level="info",
    )
