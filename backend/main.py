import time
import cv2
import numpy as np
import os
import json
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger
from contextlib import asynccontextmanager
import asyncpg
import ast
from supabase import create_client, Client
from backend.core.config import DATABASE_URL, UNKNOWN_ALERT_COOLDOWN, SUPABASE_URL, SUPABASE_KEY, CAMERA_SOURCE, CAMERA_MODE

# Init Supabase Client (Only used for Storage now)
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully for Storage.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")

from backend.inference.engine import YOLOEngine
from backend.inference.yolo_world import YOLOWorldEngine
import os
from backend.inference.transform.utils import draw_ultralytics_results
from backend.utils.camera import RTSPCamera
from backend.inference.transform.utils import compute_iou
from backend.inference.face_recognizer import InsightFaceRecognizer
from concurrent.futures import ThreadPoolExecutor
import datetime
import asyncio

# Global asyncpg pool and main event loop
db_pool: asyncpg.Pool | None = None
main_loop = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, cached_persons, main_loop
    main_loop = asyncio.get_running_loop()
    try:
        # statement_cache_size=0 is REQUIRED for Supabase transaction poolers (port 6543)
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10, statement_cache_size=0)
        logger.info("asyncpg database pool initialized successfully.")
        
        # Load registered persons
        try:
            async with db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT id, name, face_embedding FROM persons WHERE is_active = 1")
                for row in rows:
                    if row['face_embedding']:
                        try:
                            emb_str = str(row['face_embedding'])
                            # pgvector returns string formatting like '[0.1, 0.2]'
                            emb = np.array(ast.literal_eval(emb_str), dtype=np.float32)
                            cached_persons.append({
                                "id": row['id'],
                                "name": row['name'],
                                "face_embedding": emb
                            })
                        except Exception:
                            pass
            logger.info(f"Loaded {len(cached_persons)} registered faces into memory.")
        except Exception as e:
            logger.error(f"Failed to load faces from PostgreSQL: {e}")
            
    except Exception as e:
        logger.error(f"Failed to initialize asyncpg pool: {e}")
        
    global CAMERA_GLOBAL_TASK
    CAMERA_GLOBAL_TASK = main_loop.run_in_executor(background_executor, global_inference_loop)
    logger.info("Global Camera Inference Loop started.")
    
    yield
    
    global GLOBAL_CAMERA_RUNNING, GLOBAL_CAMERA
    GLOBAL_CAMERA_RUNNING = False
    if GLOBAL_CAMERA:
        GLOBAL_CAMERA.stop()
    if CAMERA_GLOBAL_TASK:
        # We don't await the ThreadPool task directly, it will finish on GLOBAL_CAMERA_RUNNING = False
        pass
        
    if db_pool:
        await db_pool.close()
        logger.info("asyncpg database pool closed.")

app = FastAPI(
    title="SecureVision CV Backend",
    description="FastAPI backend for Computer Vision inference and PostgreSQL logging",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount snapshots directory to serve images statically
snapshots_dir = os.path.join(os.path.dirname(__file__), "snapshots")
os.makedirs(snapshots_dir, exist_ok=True)
app.mount("/snapshots", StaticFiles(directory=snapshots_dir), name="snapshots")

@app.get("/")
def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "SecureVision CV Backend is running", "db_connected": db_pool is not None}

# Init YOLOv8 Optimized Engine (YOLO-World Zero-Shot by default)
yolo_model = None
try:
    # Use YOLO-World if requested, else fallback to standard YOLO segmentation
    if os.getenv("USE_STANDARD_YOLO", "0") == "1":
        yolo_model = YOLOEngine("yolov8n-seg")
        logger.info("YOLOv8 Standard engine initialized successfully.")
    else:
        yolo_model = YOLOWorldEngine()
        logger.info("YOLO-World Zero-Shot engine initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize YOLO engine: {e}")

# Init InsightFace Model
face_recognizer = None
try:
    if os.path.exists(os.path.join(os.path.dirname(__file__), "models", "models", "buffalo_l")):
        face_recognizer = InsightFaceRecognizer(models_dir=os.path.join(os.path.dirname(__file__), "models"))
except Exception as e:
    logger.error(f"Failed to initialize Face Recognizer: {e}")

# Cache registered persons
cached_persons = []

# Global camera state
CAMERAS_FILE = os.path.join(os.path.dirname(__file__), "cameras.json")
ACTIVE_CAMERA_URL = 0
ACTIVE_CAMERA_ID = "default-0"
IS_CAMERA_RUNNING = False

def load_cameras_sync():
    # Fallback sync version for initial load
    return [{"id": "default-0", "name": "Primary Camera", "url": CAMERA_SOURCE, "location": "Local", "enabled": True}]

async def load_cameras_async():
    if not db_pool:
        return load_cameras_sync()
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch('SELECT id, name, url, location, enabled FROM "CameraSetting" ORDER BY "createdAt" DESC')
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to load cameras from DB: {e}")
        return load_cameras_sync()

def save_cameras(cams):
    pass # Managed by Next.js now

# Set initial active camera on startup
_initial_cams = load_cameras_sync()
_active = next((c for c in _initial_cams if c.get("enabled")), _initial_cams[0] if _initial_cams else None)
if _active:
    ACTIVE_CAMERA_URL = _active["url"]
    ACTIVE_CAMERA_ID = _active["id"]

background_executor = ThreadPoolExecutor(max_workers=5)

# Global Camera Streaming State
LATEST_FRAME_BYTES = None
CAMERA_GLOBAL_TASK = None
GLOBAL_CAMERA = None
GLOBAL_CAMERA_RUNNING = True





async def async_unknown_alert(person_crop, timestamp):
    try:
        ts = timestamp.strftime("%Y%m%d_%H%M%S")
        filename = f"unknown_{ts}.jpg"
        snapshots_dir = os.path.join(os.path.dirname(__file__), "snapshots")
        os.makedirs(snapshots_dir, exist_ok=True)
        snapshot_path = os.path.join(snapshots_dir, filename)
        db_snapshot_path = f"/snapshots/{filename}"
        
        cv2.imwrite(snapshot_path, person_crop)
        
        event_id = None
        if db_pool:
            try:
                async with db_pool.acquire() as conn:
                    # Insert into events table and get the returned ID
                    event_id = await conn.fetchval(
                        "INSERT INTO events (status, snapshot_path, timestamp) VALUES ($1, $2, $3) RETURNING id",
                        "Unknown", db_snapshot_path, timestamp
                    )
            except Exception as e:
                logger.error(f"PostgreSQL events insert failed: {e}")
                
        if event_id:
            try:
                from backend.utils.bot import send_unknown_face_alert
                await send_unknown_face_alert(snapshot_path, event_id, timestamp)
            except Exception as e:
                logger.error(f"Telegram alert failed: {e}")
    except Exception as e:
        logger.error(f"Async alert error: {e}")


def global_inference_loop():
    global IS_CAMERA_RUNNING, ACTIVE_CAMERA_URL, LATEST_FRAME_BYTES, GLOBAL_CAMERA, GLOBAL_CAMERA_RUNNING
    current_url = ACTIVE_CAMERA_URL
    
    # If mock mode, just output a static frame or skip hardware
    if CAMERA_MODE.lower() == 'mock':
        logger.info("CAMERA_MODE is mock. Not binding real hardware.")
        # Create a blank image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(img, "MOCK CAMERA ACTIVE", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        ret, buffer = cv2.imencode('.jpg', img)
        if ret:
            LATEST_FRAME_BYTES = buffer.tobytes()
        IS_CAMERA_RUNNING = True
        while GLOBAL_CAMERA_RUNNING:
            time.sleep(1)
        return

    try:
        GLOBAL_CAMERA = RTSPCamera(url=current_url, max_fps=30)
        GLOBAL_CAMERA.start()
        IS_CAMERA_RUNNING = True
    except Exception as e:
        logger.error(f"Failed to open camera: {e}")
        IS_CAMERA_RUNNING = False
        return

    try:
        frame_counter = 0
        last_result = None
        last_recognized_names = []
        last_colors_override = []
        
        tracked_faces = {}
        last_track_boxes = []
        next_track_id = 0
        last_alert_time = 0
        
        while GLOBAL_CAMERA_RUNNING:
            if current_url != ACTIVE_CAMERA_URL:
                GLOBAL_CAMERA.stop()
                current_url = ACTIVE_CAMERA_URL
                GLOBAL_CAMERA = RTSPCamera(url=current_url, max_fps=30)
                GLOBAL_CAMERA.start()
                IS_CAMERA_RUNNING = GLOBAL_CAMERA.is_running
                if not IS_CAMERA_RUNNING:
                    time.sleep(1)
                    continue

            ok, frame = GLOBAL_CAMERA.read()
            if not ok or frame is None:
                time.sleep(0.01)
                continue
                
            IS_CAMERA_RUNNING = True
            frame_counter += 1
            
            if frame_counter % 2 != 0 and last_result is not None and yolo_model is not None:
                frame = draw_ultralytics_results(frame, last_result, recognized_names=last_recognized_names, colors_override=last_colors_override)
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    LATEST_FRAME_BYTES = buffer.tobytes()
                continue
                
            try:
                if yolo_model is not None:
                    result = yolo_model.predict(frame)
                    if result and len(result.boxes) > 0:
                        boxes = result.boxes.xyxy.cpu().numpy()
                        class_ids = result.boxes.cls.cpu().numpy()
                        recognized_names = [None] * len(boxes)
                        colors_override = [None] * len(boxes)
                        current_track_boxes = []
                        
                        for i in range(len(boxes)):
                            if int(class_ids[i]) == 0:
                                box = [int(v) for v in boxes[i]]
                                x1, y1, x2, y2 = box
                                best_iou = 0
                                best_track_id = None
                                if len(last_track_boxes) > 0:
                                    last_boxes_arr = np.array([lb[0] for lb in last_track_boxes])
                                    ious = compute_iou(np.array(box), last_boxes_arr)
                                    best_idx = np.argmax(ious)
                                    if ious[best_idx] > 0.4:
                                        best_iou = ious[best_idx]
                                        best_track_id = last_track_boxes[best_idx][1]
                                
                                if best_track_id is None:
                                    best_track_id = next_track_id
                                    next_track_id += 1
                                    
                                current_track_boxes.append((box, best_track_id))
                                
                                if face_recognizer is not None and (frame_counter % 15 == 0 or best_track_id not in tracked_faces):
                                    h, w = frame.shape[:2]
                                    margin_x = int((x2 - x1) * 0.1)
                                    margin_y = int((y2 - y1) * 0.1)
                                    cx1, cy1 = max(0, x1 - margin_x), max(0, y1 - margin_y)
                                    cx2, cy2 = min(w, x2 + margin_x), min(h, y2 + margin_y)
                                    person_crop = frame[cy1:cy2, cx1:cx2]
                                    embedding = face_recognizer.extract_embedding(person_crop)
                                    
                                    if embedding is not None:
                                        match, score = InsightFaceRecognizer.match_face(embedding, cached_persons, threshold=0.45)
                                        if match:
                                            tracked_faces[best_track_id] = match["name"]
                                        else:
                                            tracked_faces[best_track_id] = "Unknown"
                                            current_time = time.time()
                                            if current_time - last_alert_time > UNKNOWN_ALERT_COOLDOWN:
                                                last_alert_time = current_time
                                                if main_loop:
                                                    asyncio.run_coroutine_threadsafe(async_unknown_alert(person_crop.copy(), datetime.datetime.now()), main_loop)
                                    else:
                                        tracked_faces[best_track_id] = "Unknown"
                                
                                name = tracked_faces.get(best_track_id, "Unknown")
                                recognized_names[i] = name
                                if name == "Unknown":
                                    colors_override[i] = (0, 0, 255)
                                else:
                                    colors_override[i] = (0, 255, 0)
                                    
                        last_track_boxes = current_track_boxes
                        last_result = result
                        last_recognized_names, last_colors_override = recognized_names, colors_override
                        frame = draw_ultralytics_results(frame, result, recognized_names=recognized_names, colors_override=colors_override)
                    else:
                        last_result = None
                        
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    LATEST_FRAME_BYTES = buffer.tobytes()
            except Exception as e:
                logger.error(f"Error in video pipeline frame processing: {e}")
                time.sleep(0.1)
    finally:
        if GLOBAL_CAMERA:
            GLOBAL_CAMERA.stop()
        IS_CAMERA_RUNNING = False

async def generate_frames():
    while True:
        if LATEST_FRAME_BYTES is not None:
            yield (b'--frame
' b'Content-Type: image/jpeg

' + LATEST_FRAME_BYTES + b'
')
        await asyncio.sleep(0.033) # Max ~30fps stream to client

@app.get("/api/stream")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/api/events")
async def get_events(limit: int = 50):
    if not db_pool:
        return []
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM events ORDER BY timestamp DESC LIMIT $1", limit)
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.error(f"PostgreSQL fetch error: {exc}")
        return []

@app.delete("/api/events")
async def clear_all_events():
    if not db_pool:
        return {"error": "Database connection missing"}
    
    try:
        # 1. Delete all records from events
        async with db_pool.acquire() as conn:
            await conn.execute("DELETE FROM events")
            
        # 2. Clear snapshots folder
        snapshots_dir = os.path.join(os.path.dirname(__file__), "snapshots")
        if os.path.exists(snapshots_dir):
            for filename in os.listdir(snapshots_dir):
                if filename.endswith(".jpg"):
                    file_path = os.path.join(snapshots_dir, filename)
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        logger.error(f"Failed to delete {file_path}: {e}")
                        
        return {"success": True, "message": "All events and snapshots cleared"}
    except Exception as exc:
        logger.error(f"Failed to clear events: {exc}")
        return {"error": str(exc)}


from fastapi import File, Form, UploadFile, HTTPException

@app.post("/api/persons", status_code=201)
async def upload_person(
    name: str = Form(...),
    designation: str = Form(...),
    image: UploadFile = File(...),
):
    """
    Register a new person from the frontend.
    Extracts the face embedding using InsightFace and saves to Supabase.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured.")

    if not face_recognizer:
        raise HTTPException(status_code=500, detail="Face recognizer not initialized.")

    contents = await image.read()
    
    # Run InsightFace to get the 512D embedding
    np_img = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")
        
    embedding = face_recognizer.extract_embedding(frame)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected in the uploaded image.")

    # Convert embedding to list so it can be stored as a vector/string in the DB
    embedding_list = embedding.tolist()

    # Save snapshot to Supabase Storage
    ts = time.strftime("%Y%m%d_%H%M%S")
    filename = f"registered_{ts}.jpg"
    snapshot_path = None
    try:
        supabase.storage.from_('faces').upload(
            path=filename,
            file=contents,
            file_options={"content-type": image.content_type or "image/jpeg"}
        )
        snapshot_path = supabase.storage.from_('faces').get_public_url(filename)
    except Exception as e:
        logger.error(f"Supabase storage upload failed: {e}")
        # Proceed even if storage fails, we just won't have a snapshot

    # Insert into the database
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool not configured.")
        
    try:
        async with db_pool.acquire() as conn:
            person_id = await conn.fetchval(
                "INSERT INTO persons (name, face_embedding, snapshot_path, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
                name, str(embedding_list), snapshot_path, 1
            )
        
        # Hot-reload the cache
        cached_persons.append({
            "id": person_id,
            "name": name,
            "face_embedding": embedding
        })
        logger.info(f"Registered new person: {name} (ID: {person_id})")
        
        return {
            "message": f"'{name}' registered successfully.",
            "person_id": person_id,
            "snapshot_path": snapshot_path,
        }
    except Exception as exc:
        logger.error(f"Failed to insert person into database: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


from pydantic import BaseModel
class RegisterFromLogRequest(BaseModel):
    log_id: int
    name: str
    image_path: str

@app.post("/api/register-from-log")
async def register_from_log(req: RegisterFromLogRequest):
    if not face_recognizer:
        raise HTTPException(status_code=500, detail="Face recognizer not initialized.")
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool not configured.")
        
    filename = os.path.basename(req.image_path)
    local_path = os.path.join(os.path.dirname(__file__), "snapshots", filename)
    
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Snapshot image not found on server.")
        
    img = cv2.imread(local_path)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not read snapshot image.")
        
    embedding = face_recognizer.extract_embedding(img)
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected in this snapshot. Please use a clearer image.")
        
    embedding_list = embedding.tolist()
    
    try:
        async with db_pool.acquire() as conn:
            person_id = await conn.fetchval(
                "INSERT INTO persons (name, face_embedding, snapshot_path, is_active) VALUES ($1, $2, $3, $4) RETURNING id",
                req.name, str(embedding_list), f"/snapshots/{filename}", 1
            )
            
            await conn.execute(
                "UPDATE events SET status = 'Known', person_id = $1 WHERE id = $2",
                person_id, req.log_id
            )
            
        cached_persons.append({
            "id": person_id,
            "name": req.name,
            "face_embedding": embedding
        })
        logger.info(f"Registered new person from log: {req.name} (ID: {person_id})")
        return {"status": "success", "message": "Person registered successfully", "person_id": person_id}
    except Exception as exc:
        logger.error(f"Failed to register from log: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

# --- Camera Settings API ---

from pydantic import BaseModel
class CameraInput(BaseModel):
    name: str
    url: str
    location: str = ""
    enabled: bool = True

@app.get("/api/status")
def get_status():
    return {
        "status": "ok",
        "camera_running": IS_CAMERA_RUNNING,
        "camera_id": ACTIVE_CAMERA_ID
    }


@app.post("/api/settings/cameras/{cam_id}/apply")
async def api_apply_camera(cam_id: str):
    global ACTIVE_CAMERA_URL, ACTIVE_CAMERA_ID
    cams = await load_cameras_async()
    cam = next((c for c in cams if c["id"] == cam_id), None)
    if not cam:
        return {"message": "Camera not found", "url": ""}
    
    ACTIVE_CAMERA_URL = cam["url"]
    ACTIVE_CAMERA_ID = cam["id"]
    return {"message": f"Applied {cam['name']}", "url": cam["url"]}


@app.get("/api/persons")
async def get_persons():
    """Fetch the list of registered persons from the database."""
    if not db_pool:
        logger.warning("Database pool not initialized, returning empty persons list.")
        return []
        
    try:
        # Fetch active persons (is_active = 1)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("SELECT id, name, snapshot_path, created_at FROM persons WHERE is_active = 1 ORDER BY created_at DESC")
            
            # Handle cases where data is None or empty gracefully
            if not rows:
                return []
                
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to fetch persons from PostgreSQL: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"error": "DB_CONNECTION_FAILED", "details": str(e)})

@app.delete("/api/persons/{person_id}")
async def delete_person(person_id: int):
    """Delete a registered person (hard delete)."""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool not configured.")
        
    try:
        async with db_pool.acquire() as conn:
            exists = await conn.fetchval("SELECT id FROM persons WHERE id = $1", person_id)
            if not exists:
                raise HTTPException(status_code=404, detail="Person not found")
                
            await conn.execute("DELETE FROM persons WHERE id = $1", person_id)
            
        global cached_persons
        cached_persons = [p for p in cached_persons if p["id"] != person_id]
        
        logger.info(f"Deleted person ID: {person_id}")
        return {"status": "success", "message": "Person deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete person {person_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
