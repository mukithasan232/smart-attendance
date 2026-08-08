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

import ast
from supabase import create_client, Client
from backend.core.config import SUPABASE_URL, SUPABASE_KEY
from backend.inference.yolov8_seg_onnx import YOLOv8Segmentation_onnx
from backend.inference.face_recognizer import InsightFaceRecognizer

app = FastAPI(
    title="SecureVision CV Backend",
    description="FastAPI backend for Computer Vision inference and Supabase integration",
    version="1.0.0"
)

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init Supabase Client
supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")

@app.get("/")
def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "SecureVision CV Backend is running"}

# Init YOLOv8 ONNX Model
yolo_model = None
try:
    # Use dynamic absolute path to models directory or relative if running from root
    model_path = os.path.join(os.path.dirname(__file__), "models", "yolov8n-seg.onnx")
    
    # Check if files exist before initializing to prevent fatal crashes
    if os.path.exists(model_path):
        yolo_model = YOLOv8Segmentation_onnx(model_path)
        logger.info(f"YOLOv8 ONNX Segmentation engine initialized successfully from {model_path}.")
    else:
        logger.warning(f"ONNX model file not found at {model_path}. Inference disabled.")
except Exception as e:
    logger.error(f"Failed to initialize YOLOv8 ONNX engine: {e}")

# Init InsightFace Model
face_recognizer = None
try:
    if os.path.exists(os.path.join(os.path.dirname(__file__), "models", "models", "buffalo_l")):
        face_recognizer = InsightFaceRecognizer(models_dir=os.path.join(os.path.dirname(__file__), "models"))
except Exception as e:
    logger.error(f"Failed to initialize Face Recognizer: {e}")

# Cache registered persons
cached_persons = []
if supabase:
    try:
        res = supabase.table("persons").select("id, name, face_embedding").eq("is_active", 1).execute()
        if res.data:
            for p in res.data:
                if p.get("face_embedding"):
                    try:
                        # Vector is returned as string or list, convert to numpy
                        if isinstance(p["face_embedding"], str):
                            emb = np.array(ast.literal_eval(p["face_embedding"]), dtype=np.float32)
                        else:
                            emb = np.array(p["face_embedding"], dtype=np.float32)
                        p["face_embedding"] = emb
                        cached_persons.append(p)
                    except Exception:
                        pass
        logger.info(f"Loaded {len(cached_persons)} registered faces into memory.")
    except Exception as e:
        logger.error(f"Failed to load faces from Supabase: {e}")

# Global camera state
CAMERAS_FILE = os.path.join(os.path.dirname(__file__), "cameras.json")
ACTIVE_CAMERA_URL = 0
ACTIVE_CAMERA_ID = "default-0"
IS_CAMERA_RUNNING = False

def load_cameras():
    if os.path.exists(CAMERAS_FILE):
        try:
            with open(CAMERAS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    # Default fallback
    return [{"id": "default-0", "name": "Built-in Webcam", "url": "0", "location": "Local", "enabled": True}]

def save_cameras(cams):
    with open(CAMERAS_FILE, "w") as f:
        json.dump(cams, f, indent=4)

# Set initial active camera on startup
_initial_cams = load_cameras()
_active = next((c for c in _initial_cams if c.get("enabled")), _initial_cams[0] if _initial_cams else None)
if _active:
    ACTIVE_CAMERA_URL = _active["url"]
    ACTIVE_CAMERA_ID = _active["id"]


def generate_frames():
    global IS_CAMERA_RUNNING, ACTIVE_CAMERA_URL
    current_url = ACTIVE_CAMERA_URL
    
    # helper to parse "0" to int
    def get_src(url):
        return int(url) if str(url).isdigit() else url

    try:
        camera = cv2.VideoCapture(get_src(current_url))
        IS_CAMERA_RUNNING = camera.isOpened()
    except Exception as e:
        logger.error(f"Failed to open camera: {e}")
        IS_CAMERA_RUNNING = False
        return

    try:
        frame_counter = 0
        while True:
            # Check for dynamic hot-switching
            if current_url != ACTIVE_CAMERA_URL:
                camera.release()
                current_url = ACTIVE_CAMERA_URL
                camera = cv2.VideoCapture(get_src(current_url))
                IS_CAMERA_RUNNING = camera.isOpened()
                if not IS_CAMERA_RUNNING:
                    time.sleep(1)
                    continue

            success, frame = camera.read()
            if not success or frame is None:
                IS_CAMERA_RUNNING = False
                time.sleep(0.5)
                # Try reconnecting
                camera = cv2.VideoCapture(get_src(current_url))
                continue
                
            IS_CAMERA_RUNNING = True
            frame_counter += 1
            # Skip 2 out of every 3 frames to prevent CPU overload and extreme FPS drops
            if frame_counter % 3 != 0:
                continue
                
            try:
                # Run ONNX inference on the frame
                if yolo_model is not None:
                    boxes, scores, class_ids = yolo_model.segment_objects(frame)
                    
                    labels_override = [None] * len(boxes)
                    colors_override = [None] * len(boxes)
                    
                    if face_recognizer is not None:
                        for i in range(len(boxes)):
                            if int(class_ids[i]) == 0:
                                x1, y1, x2, y2 = [int(v) for v in boxes[i]]
                                
                                # Add 10% margin to the person crop for better face detection
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
                                        labels_override[i] = match["name"]
                                        colors_override[i] = (0, 255, 0) # Green for known
                                    else:
                                        labels_override[i] = "Unknown"
                                        colors_override[i] = (0, 0, 255) # Red for unknown
                    
                    yolo_model.boxes = boxes
                    yolo_model.scores = scores
                    yolo_model.class_ids = class_ids
                    frame = yolo_model.draw_masks(frame, labels_override=labels_override, colors_override=colors_override)
                    
                # Convert to MJPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                    
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except Exception as e:
                logger.error(f"Error in video pipeline frame processing: {e}")
                time.sleep(0.1)
    finally:
        camera.release()
        IS_CAMERA_RUNNING = False

@app.get("/api/stream")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/api/events")
def get_events(limit: int = 50):
    if not supabase:
        return []
    try:
        res = supabase.table('detection_logs').select('*').order('timestamp', desc=True).limit(limit).execute()
        return res.data
    except Exception as exc:
        logger.error(f"Supabase fetch error: {exc}")
        return []


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

@app.get("/api/settings/cameras")
def api_get_cameras():
    return {"cameras": load_cameras()}

@app.post("/api/settings/cameras")
def api_add_camera(cam: CameraInput):
    cams = load_cameras()
    new_cam = cam.dict()
    new_cam["id"] = str(uuid.uuid4())
    cams.append(new_cam)
    save_cameras(cams)
    return {"message": "Camera added", "camera": new_cam}

@app.put("/api/settings/cameras/{cam_id}")
def api_update_camera(cam_id: str, cam: CameraInput):
    cams = load_cameras()
    updated = None
    for c in cams:
        if c["id"] == cam_id:
            c.update(cam.dict())
            updated = c
            break
    if updated:
        save_cameras(cams)
        return {"message": "Camera updated", "camera": updated}
    return {"message": "Not found", "camera": None}

@app.delete("/api/settings/cameras/{cam_id}")
def api_delete_camera(cam_id: str):
    cams = load_cameras()
    new_cams = [c for c in cams if c["id"] != cam_id]
    save_cameras(new_cams)
    return {"message": "Camera deleted"}

@app.post("/api/settings/cameras/{cam_id}/apply")
def api_apply_camera(cam_id: str):
    global ACTIVE_CAMERA_URL, ACTIVE_CAMERA_ID
    cams = load_cameras()
    cam = next((c for c in cams if c["id"] == cam_id), None)
    if not cam:
        return {"message": "Camera not found", "url": ""}
    
    ACTIVE_CAMERA_URL = cam["url"]
    ACTIVE_CAMERA_ID = cam["id"]
    return {"message": f"Applied {cam['name']}", "url": cam["url"]}


@app.get("/api/persons")
def get_persons():
    """Fetch the list of registered persons from the database."""
    if not supabase:
        logger.warning("Supabase client not initialized, returning empty persons list.")
        return []
        
    try:
        # Fetch active persons (is_active = 1)
        res = supabase.table("persons").select("id, name, snapshot_path, created_at").eq("is_active", 1).order("created_at", desc=True).execute()
        
        # Handle cases where data is None or empty gracefully
        if not res.data:
            return []
            
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch persons from Supabase: {e}")
        return []


