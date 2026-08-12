import re

with open("backend/main.py", "r") as f:
    content = f.read()

# 1. Add global variables
global_vars = """
# Global Camera Streaming State
LATEST_FRAME_BYTES = None
CAMERA_GLOBAL_TASK = None
GLOBAL_CAMERA = None
GLOBAL_CAMERA_RUNNING = True

"""
content = re.sub(r'background_executor = ThreadPoolExecutor\(max_workers=5\)', 'background_executor = ThreadPoolExecutor(max_workers=5)\n' + global_vars, content)

# 2. Add CAMERA_SOURCE and CAMERA_MODE imports
content = content.replace(
    'from backend.core.config import DATABASE_URL, UNKNOWN_ALERT_COOLDOWN, SUPABASE_URL, SUPABASE_KEY',
    'from backend.core.config import DATABASE_URL, UNKNOWN_ALERT_COOLDOWN, SUPABASE_URL, SUPABASE_KEY, CAMERA_SOURCE, CAMERA_MODE'
)

# 3. Replace load_cameras default
content = content.replace(
    'return [{"id": "default-0", "name": "Built-in Webcam", "url": "0", "location": "Local", "enabled": True}]',
    'return [{"id": "default-0", "name": "Primary Camera", "url": CAMERA_SOURCE, "location": "Local", "enabled": True}]'
)

# 4. Modify generate_frames to be an async generator and introduce global_inference_loop
old_generate_frames_pattern = re.compile(r'def generate_frames\(\):.*?@app\.get\("/api/stream"\)', re.DOTALL)

new_code = """
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
            yield (b'--frame\\r\\n' b'Content-Type: image/jpeg\\r\\n\\r\\n' + LATEST_FRAME_BYTES + b'\\r\\n')
        await asyncio.sleep(0.033) # Max ~30fps stream to client

@app.get("/api/stream")"""

content = old_generate_frames_pattern.sub(new_code, content)

# 5. Modify lifespan to start and stop the global_inference_loop
lifespan_old = """    except Exception as e:
        logger.error(f"Failed to initialize asyncpg pool: {e}")
    yield
    if db_pool:
        await db_pool.close()
        logger.info("asyncpg database pool closed.")"""

lifespan_new = """    except Exception as e:
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
        logger.info("asyncpg database pool closed.")"""

content = content.replace(lifespan_old, lifespan_new)

with open("backend/main.py", "w") as f:
    f.write(content)

