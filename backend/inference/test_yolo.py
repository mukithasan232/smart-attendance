import cv2
import numpy as np
from backend.core.config import USE_YOLO_PREFILTER
from backend.inference.vision import engine
import time

print("YOLO Pre-filter enabled:", USE_YOLO_PREFILTER)
engine.initialize()

# Create a blank black frame (no person)
frame = np.zeros((640, 640, 3), dtype=np.uint8)

t0 = time.time()
results = engine.process_frame(frame)
print(f"Results (should be empty): {results}")
print(f"Time taken: {(time.time() - t0)*1000:.1f}ms")
