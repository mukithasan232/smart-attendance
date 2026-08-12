import re

with open("backend/main.py", "r") as f:
    code = f.read()

# Add import
if "from backend.inference.yolo_world import YOLOWorldEngine" not in code:
    code = code.replace(
        "from backend.inference.engine import YOLOEngine",
        "from backend.inference.engine import YOLOEngine\nfrom backend.inference.yolo_world import YOLOWorldEngine\nimport os"
    )

old_init = """# Init YOLOv8 Optimized Engine
yolo_model = None
try:
    yolo_model = YOLOEngine("yolov8n-seg")
    logger.info("YOLOv8 hardware-optimized engine initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize YOLOv8 engine: {e}")"""

new_init = """# Init YOLOv8 Optimized Engine (YOLO-World Zero-Shot by default)
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
    logger.error(f"Failed to initialize YOLO engine: {e}")"""

if old_init in code:
    code = code.replace(old_init, new_init)

with open("backend/main.py", "w") as f:
    f.write(code)
