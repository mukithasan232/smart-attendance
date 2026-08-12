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

from fastapi.staticfiles import StaticFiles
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

from backend.utils import bot
from backend.core import database
from backend.utils import notify
from backend.utils.camera import RTSPCamera
from backend.core.config import (
    CAMERA_ID,
    SERVER_HOST,
    SERVER_PORT,
    SNAPSHOTS_DIR,
    TELEGRAM_ADMIN_ID,
    TELEGRAM_WEBHOOK_URL,
    UNKNOWN_COOLDOWN_SEC,
    AUTO_ENROLL_UNKNOWN_FACES,
    SMTP_ALERT_UNKNOWN,
    SMTP_ALERT_KNOWN,
    SUPABASE_URL,
    SUPABASE_KEY,
)
from backend.inference.vision import RecognitionResult, engine

from supabase import create_client, Client
from postgrest.types import CountMethod
supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

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

    engine.initialize()

    # 2. Start the RTSP camera reader thread
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

    logger.info("CORS and Static Files initialized successfully.")
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

import os
if not os.path.exists("snapshots"):
    os.makedirs("snapshots")
app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "https://vision.codernest.cloud",
        "https://smart-attendance-blush.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
                asyncio.create_task(_handle_known_face(result, frame.copy()))
            else:
                asyncio.create_task(_handle_unknown_face(result, frame.copy()))


async def _handle_known_face(result: RecognitionResult, frame: np.ndarray) -> None:
    """
    Log a recognition event for a known person (debounced).

    No Telegram alert is sent — known persons are logged silently.
    An optional email alert is sent if SMTP_ALERT_KNOWN=True.
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
        snapshot_path=snapshot_path,
        status="Known",
        person_id=result.matched_person_id,
    )
    logger.info(
        "Known person recognised | name={} confidence={:.3f}",
        result.matched_name,
        result.confidence,
    )

    # Optional email alert for known person arrival
    if SMTP_ALERT_KNOWN:
        ts = datetime.now().strftime("%d %b %Y, %H:%M:%S")
        asyncio.create_task(notify.send_email_alert(
            subject=f"✅ Known Visitor: {result.matched_name}",
            body=(
                f"<b>Known visitor detected</b><br/>"
                f"<b>Name:</b> {result.matched_name}<br/>"
                f"<b>Camera:</b> {CAMERA_ID}<br/>"
                f"<b>Time:</b> {ts}"
            ),
            image_path=snapshot_path,
        ))



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
    if not is_image_clear(face_crop, threshold=15.0):
        logger.debug("Face rejected due to blur (Laplacian variance < 15)")
        return

    # Cooldown check — one zone key for now; extend to spatial zones later
    zone_key = "default"
    now = time.monotonic()
    
    # Short 5-sec cooldown if auto-enrolling to prevent duplicate tasks before cache is updated
    cooldown = 5 if AUTO_ENROLL_UNKNOWN_FACES else UNKNOWN_COOLDOWN_SEC
    if now - _last_unknown_alert.get(zone_key, 0) < cooldown:
        return
    _last_unknown_alert[zone_key] = now

    # Save the snapshot
    snapshot_path = _save_snapshot(frame, "unknown")

    if AUTO_ENROLL_UNKNOWN_FACES:
        ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        auto_name = f"AutoUser_{ts_str}"
        try:
            person_id = await database.add_person(
                name=auto_name,
                embedding=result.embedding,
                snapshot_path=snapshot_path,
            )
            
            # Log event as Known since they are now enrolled
            event_id = await database.log_event(
                snapshot_path=snapshot_path,
                status="Known",
                person_id=person_id,
            )
            
            # Mark the buffer status so it doesn't stay 'pending'
            await database.update_event_buffer_status(event_id, "added")

            # Zero-latency cache update (no longer needed for pgvector)
            pass
            
            logger.info("Auto-enrolled unknown face as id={} name={}", person_id, auto_name)
            
            # Send Telegram alert
            await bot.send_text_to_admin(
                f"🤖 <b>Auto-Enrollment Triggered</b>\n\n"
                f"👤 <b>Name:</b> {auto_name}\n"
                f"🆔 <b>Person ID:</b> {person_id}\n\n"
                f"<i>This person was automatically enrolled into the database.</i>"
            )
        except Exception as exc:
            logger.error("Auto-enrollment failed: {}", exc)
            
        return

    # Create the event record
    event_id = await database.log_event(
        snapshot_path=snapshot_path,
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

    # Send email alert (fires alongside Telegram, non-blocking)
    if SMTP_ALERT_UNKNOWN:
        ts = datetime.now().strftime("%d %b %Y, %H:%M:%S")
        asyncio.create_task(notify.send_email_alert(
            subject=f"🚨 Unknown Person Detected — {CAMERA_ID}",
            body=(
                f"<b>⚠️ Security Alert: Unregistered face detected</b><br/><br/>"
                f"<b>Camera:</b> {CAMERA_ID}<br/>"
                f"<b>Time:</b> {ts}<br/>"
                f"<b>Event ID:</b> #{event_id}<br/><br/>"
                f"<i>Please review this alert in the SecureVision dashboard.</i>"
            ),
            image_path=snapshot_path,
        ))


def _save_snapshot(frame: np.ndarray, prefix: str) -> str:
    """Save a frame as JPEG to Supabase Storage (or fallback to local). Returns the public URL or path."""
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{prefix}_{ts}.jpg"
        
        success, encoded = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            logger.error("Failed to encode frame to JPEG")
            return "fallback_no_image"
            
        byte_data = encoded.tobytes()
        
        if supabase:
            try:
                supabase.storage.from_('snapshots').upload(
                    path=filename,
                    file=byte_data,
                    file_options={"content-type": "image/jpeg"}
                )
                return supabase.storage.from_('snapshots').get_public_url(filename)
            except Exception as e:
                logger.warning(f"Supabase upload failed: {e}. Falling back to local disk.")
                
        # Fallback to local save
        path = SNAPSHOTS_DIR / filename
        with open(path, "wb") as f:
            f.write(byte_data)
        return str(path)
    except Exception as exc:
        logger.error("Snapshot save failed completely: {}", exc)
        return "fallback_no_image"


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

    # Hot-reload the VisionEngine cache (zero-latency)
    # With pgvector, no need to add_known_person to cache

    logger.info("Registered via Telegram | id={} name={}", person_id, name)

    await bot.send_text_to_admin(
        f"✅ <b>Registered successfully!</b>\n\n"
        f"👤 <b>Name:</b> {name}\n"
        f"🆔 <b>Person ID:</b> {person_id}\n\n"
        f"<i>This face will now be recognised automatically. 🎉</i>"
    )


# ── REST API Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/status", summary="System health check")
def get_status():
    """Return camera status, known persons count, and server timestamp."""
    try:
        if supabase:
            res = supabase.table('persons').select('id', count=CountMethod.exact).execute()
            persons_count = res.count if res.count is not None else 0
        else:
            persons_count = 0
    except Exception as exc:
        logger.error(f"Supabase count error: {exc}")
        persons_count = 0
        
    return {
        "status": "running",
        "camera_id": CAMERA_ID,
        "camera_running": camera.is_running if camera else False,
        "known_persons_count": persons_count,
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
    }


@app.get("/api/events", summary="Recent detection events")
def get_events(limit: int = 50):
    """
    Return the most recent detection events directly from Supabase `detection_logs`.
    """
    if not supabase:
        logger.warning("Supabase client not initialized.")
        return []
        
    try:
        res = supabase.table('detection_logs').select('*').order('timestamp', desc=True).limit(limit).execute()
        return res.data
    except Exception as exc:
        logger.error(f"Supabase fetch error: {exc}")
        return []


@app.get("/api/persons", summary="List known persons")
def list_persons():
    """Return all active known persons, fetching directly from Supabase."""
    if not supabase:
        logger.warning("Supabase client not initialized.")
        return []
    try:
        res = supabase.table('persons').select('id, name, designation, snapshot_path, created_at, is_active').eq('is_active', 1).order('created_at', desc=True).execute()
        return res.data
    except Exception as exc:
        logger.error(f"Failed to load persons list: {exc}")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": "DB_CONNECTION_FAILED", "details": str(exc)})


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

    # Zero-latency cache update
    # With pgvector, no need to add_known_person to cache

    return {
        "message": f"Successfully registered '{req.name}' and updated the event.",
        "person_id": person_id,
        "event_id": event_id,
    }


@app.post("/api/persons", status_code=201, summary="Register person via photo")
async def upload_person(
    name: str = Form(...),
    designation: str = Form(...),
    image: UploadFile = File(...),
):
    """
    Register a new known person. Uploads face to Supabase Storage and saves metadata.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured.")

    contents = await image.read()
    
    # Save the registration photo to Supabase Storage ('faces' bucket)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"registered_{ts}.jpg"
    
    try:
        supabase.storage.from_('faces').upload(
            path=filename,
            file=contents,
            file_options={"content-type": image.content_type or "image/jpeg"}
        )
        snapshot_path = supabase.storage.from_('faces').get_public_url(filename)
    except Exception as e:
        logger.error(f"Supabase upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {e}")

    # -------------------------------------------------------------------------
    # [AI Engine Placeholder]
    # Here, the Python facial embedding extraction logic (InsightFace/pgvector)
    # will run to extract the face vector from `contents` and store it.
    # For now, we proceed to save the metadata.
    # -------------------------------------------------------------------------

    try:
        res = supabase.table('persons').insert({
            "name": name,
            "designation": designation,
            "snapshot_path": snapshot_path,
            "is_active": 1
        }).execute()
        person_id = res.data[0]['id']
    except Exception as exc:
        logger.error(f"Failed to insert person: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "message": f"'{name}' registered successfully.",
        "person_id": person_id,
        "snapshot_path": snapshot_path,
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

    return {"message": f"Person #{person_id} has been removed from the system."}


@app.post("/api/persons/reload", summary="Force reload recognition cache")
async def reload_persons():
    """VisionEngine now uses PostgreSQL pgvector directly. No reload necessary."""
    return {"message": "VisionEngine uses PostgreSQL directly. No cache reload required."}


# ── Notification Settings Endpoints ────────────────────────────────────────────────

class SmtpSettingsRequest(BaseModel):
    enabled: bool = False
    host: str = "smtp.gmail.com"
    port: int = 587
    use_tls: bool = True
    user: str = ""
    password: str = ""          # Empty string means "don't update the stored password"
    from_addr: str = ""
    to_emails: str = ""         # Comma-separated
    alert_unknown: bool = True
    alert_known: bool = False


@app.get("/api/settings/notifications", summary="Get SMTP notification settings")
async def get_notification_settings():
    """Return current SMTP config. Password is always redacted."""
    from backend.core import config
    return {
        "smtp": {
            "enabled": config.SMTP_ENABLED,
            "host": config.SMTP_HOST,
            "port": config.SMTP_PORT,
            "use_tls": config.SMTP_USE_TLS,
            "user": config.SMTP_USER,
            "password": "" if not config.SMTP_PASSWORD else "••••••••",
            "from_addr": config.SMTP_FROM,
            "to_emails": ", ".join(config.SMTP_TO_EMAILS),
            "alert_unknown": config.SMTP_ALERT_UNKNOWN,
            "alert_known": config.SMTP_ALERT_KNOWN,
        }
    }


@app.post("/api/settings/notifications", summary="Save SMTP notification settings")
async def save_notification_settings(req: SmtpSettingsRequest):
    """
    Persist SMTP settings to the .env file and reload config module.
    Password is only updated if a non-empty, non-redacted value is provided.
    """
    env_path = Path(".env")
    if not env_path.exists():
        raise HTTPException(status_code=500, detail=".env file not found.")

    lines = env_path.read_text().splitlines(keepends=True)

    updates = {
        "SMTP_ENABLED": str(req.enabled),
        "SMTP_HOST": req.host,
        "SMTP_PORT": str(req.port),
        "SMTP_USE_TLS": str(req.use_tls),
        "SMTP_USER": req.user,
        "SMTP_FROM": req.from_addr or req.user,
        "SMTP_TO_EMAILS": req.to_emails,
        "SMTP_ALERT_UNKNOWN": str(req.alert_unknown),
        "SMTP_ALERT_KNOWN": str(req.alert_known),
    }
    # Only update password if a real new value was provided
    if req.password and req.password != "••••••••":
        updates["SMTP_PASSWORD"] = req.password

    # Rewrite matching keys in-place; append any new keys
    existing_keys = set()
    new_lines = []
    for line in lines:
        key = line.split("=")[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}\n")
            existing_keys.add(key)
        else:
            new_lines.append(line)

    for key, value in updates.items():
        if key not in existing_keys:
            new_lines.append(f"{key}={value}\n")

    env_path.write_text("".join(new_lines))

    # Reload config so subsequent alert calls use the new values
    import importlib
    from backend.core import config
    importlib.reload(config)

    return {"message": "SMTP settings saved successfully."}


@app.post("/api/settings/notifications/test", summary="Send a test email")
async def test_notification():
    """Send a test email using current SMTP settings. Returns success/failure detail."""
    success = await notify.send_email_alert(
        subject="✅ SecureVision — Test Email",
        body=(
            "<b>Connection test successful!</b><br/><br/>"
            "Your SMTP integration is configured correctly.<br/>"
            "You will now receive security alerts at this address."
        ),
    )
    if success:
        return {"success": True, "message": "Test email sent successfully!"}
    else:
        raise HTTPException(
            status_code=400,
            detail="Failed to send test email. Check your SMTP credentials and try again.",
        )



# ── Camera Management Endpoints ───────────────────────────────────────────────────

class CameraConfig(BaseModel):
    id: Optional[str] = None
    name: str
    url: str
    location: str = ""
    enabled: bool = True


def _load_cameras() -> list:
    """Load the camera list from config (re-imports to get latest .env values)."""
    import importlib, config as cfg
    importlib.reload(cfg)
    return list(cfg.CAMERAS_CONFIG)


def _save_cameras(cams: list) -> None:
    """Persist camera list to .env as JSON and reload config."""
    import importlib, json, config as cfg
    env_path = Path(".env")
    lines = env_path.read_text().splitlines(keepends=True)
    json_val = json.dumps(cams, ensure_ascii=False)
    new_lines, found = [], False
    for line in lines:
        if line.startswith("CAMERAS_CONFIG="):
            new_lines.append(f"CAMERAS_CONFIG={json_val}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"CAMERAS_CONFIG={json_val}\n")
    env_path.write_text("".join(new_lines))
    importlib.reload(cfg)


@app.get("/api/settings/cameras", summary="List configured cameras")
async def list_cameras():
    """Return all camera configurations from the .env store."""
    return {"cameras": _load_cameras()}


@app.post("/api/settings/cameras", status_code=201, summary="Add a new camera")
async def add_camera(cam: CameraConfig):
    """Add a new camera entry and persist to .env."""
    import uuid
    cams = _load_cameras()
    new_cam = cam.model_dump()
    new_cam["id"] = str(uuid.uuid4())[:8]
    cams.append(new_cam)
    _save_cameras(cams)
    return {"message": "Camera added.", "camera": new_cam}


@app.put("/api/settings/cameras/{cam_id}", summary="Update a camera")
async def update_camera(cam_id: str, cam: CameraConfig):
    """Update an existing camera by ID and persist to .env."""
    cams = _load_cameras()
    updated = False
    for i, c in enumerate(cams):
        if c["id"] == cam_id:
            cams[i] = {**cam.model_dump(), "id": cam_id}
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail=f"Camera '{cam_id}' not found.")
    _save_cameras(cams)
    return {"message": "Camera updated.", "camera": cams[next(i for i, c in enumerate(cams) if c["id"] == cam_id)]}


@app.delete("/api/settings/cameras/{cam_id}", summary="Delete a camera")
async def delete_camera(cam_id: str):
    """Remove a camera by ID from the .env store."""
    cams = _load_cameras()
    original_len = len(cams)
    cams = [c for c in cams if c["id"] != cam_id]
    if len(cams) == original_len:
        raise HTTPException(status_code=404, detail=f"Camera '{cam_id}' not found.")
    _save_cameras(cams)
    return {"message": f"Camera '{cam_id}' deleted."}


@app.post("/api/settings/cameras/{cam_id}/apply", summary="Apply camera — hot-reload the live feed")
async def apply_camera(cam_id: str):
    """
    Restart the running RTSPCamera with the URL from the selected camera config.
    This allows switching cameras without restarting the server.
    """
    global camera, _processing_task
    cams = _load_cameras()
    target = next((c for c in cams if c["id"] == cam_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Camera '{cam_id}' not found.")
    if not target.get("enabled", True):
        raise HTTPException(status_code=400, detail="Cannot apply a disabled camera.")

    new_url = target["url"]

    # Stop existing processing loop and camera
    if _processing_task:
        _processing_task.cancel()
        try:
            await _processing_task
        except asyncio.CancelledError:
            pass

    if camera is not None:
        camera.stop()

    # Start new camera with the selected URL
    try:
        camera = RTSPCamera(url=new_url)
        camera.start()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=f"Could not open camera stream: {exc}")

    # Restart processing loop
    _processing_task = asyncio.create_task(processing_loop())

    # Also update RTSP_URL in .env so it persists across restarts
    env_path = Path(".env")
    lines = env_path.read_text().splitlines(keepends=True)
    new_lines, found = [], False
    for line in lines:
        if line.startswith("RTSP_URL="):
            new_lines.append(f"RTSP_URL={new_url}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"RTSP_URL={new_url}\n")
    env_path.write_text("".join(new_lines))

    logger.info("Camera hot-reloaded | id={} url={}", cam_id, new_url)
    return {"message": f"Live feed switched to '{target['name']}'.", "url": new_url}


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
