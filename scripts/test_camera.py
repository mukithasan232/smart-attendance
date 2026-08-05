"""
scripts/test_camera.py — Verify camera.py works in the environment.

Displays the camera feed with FPS counter. Press Q to quit.
"""
import sys
import time
from pathlib import Path

# Always resolve relative to this file, works from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
from loguru import logger
from camera import RTSPCamera
from config import FRAME_SKIP, RTSP_MAX_FPS, RTSP_RESIZE_WIDTH, RTSP_URL


def main():
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")

    print("\n=== Camera Test ===")
    print(f"  Source:     {RTSP_URL}")
    print(f"  Frame Skip: {FRAME_SKIP} (processing 1 in {FRAME_SKIP})")
    print(f"  Max FPS:    {RTSP_MAX_FPS}")
    print(f"  Resize:     {RTSP_RESIZE_WIDTH}px wide")
    print("\nPress Q to quit.\n")

    cam = RTSPCamera()
    cam.start()

    frame_count = 0
    fps_start = time.monotonic()
    display_fps = 0.0

    try:
        while True:
            ok, frame = cam.read()
            if not ok or frame is None:
                time.sleep(0.01)
                continue

            frame_count += 1
            elapsed = time.monotonic() - fps_start
            if elapsed >= 1.0:
                display_fps = frame_count / elapsed
                frame_count = 0
                fps_start = time.monotonic()

            h, w = frame.shape[:2]
            cv2.putText(
                frame,
                f"FPS: {display_fps:.1f} | Size: {w}x{h} | Skip: {FRAME_SKIP}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
            )
            cv2.imshow("Camera Test — press Q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cam.stop()
        cv2.destroyAllWindows()
        print("Camera test complete.")


if __name__ == "__main__":
    main()
