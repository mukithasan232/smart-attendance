"""
camera.py — Thermal-optimized RTSP stream reader for Apple M1 Air.

Design decisions:
- Runs in a dedicated background thread so the main loop never blocks on I/O.
- Frame skipping: we grab (and discard) N frames before returning one to the
  AI pipeline. This keeps CPU usage proportional to 1/FRAME_SKIP of the stream
  rate without sleeping (which can still leave frames building up in the buffer).
- The internal queue depth is capped at 1 so the AI always processes the
  *latest* frame, never a backlogged old one.
- Resolution is downscaled immediately after capture to reduce memory bandwidth
  and AI inference time.
"""

import threading
import time
from collections import deque

import cv2
from loguru import logger

from config import FRAME_SKIP, RTSP_MAX_FPS, RTSP_RESIZE_WIDTH, RTSP_URL


class RTSPCamera:
    """
    Thread-safe RTSP (or local webcam) reader with:
      • Frame skipping   — process 1 out of every FRAME_SKIP frames
      • Resolution cap   — resize to RTSP_RESIZE_WIDTH px wide on capture
      • FPS limiter      — sleep to enforce RTSP_MAX_FPS cap
      • Reconnect logic  — auto-reconnects if the stream drops
    """

    def __init__(
        self,
        url: str = RTSP_URL,
        frame_skip: int = FRAME_SKIP,
        resize_width: int = RTSP_RESIZE_WIDTH,
        max_fps: int = RTSP_MAX_FPS,
    ) -> None:
        # Allow integer camera index (e.g., "0") or a full RTSP URL string
        self.url = int(url) if url.isdigit() else url
        self.frame_skip = max(1, frame_skip)
        self.resize_width = resize_width
        self.min_frame_interval = 1.0 / max(1, max_fps)

        self._cap: cv2.VideoCapture | None = None
        self._lock = threading.Lock()
        # Deque of depth 1 acts as a "latest frame" slot
        self._frame_queue: deque = deque(maxlen=1)
        self._running = False
        self._thread: threading.Thread | None = None

    # ── Public API ──────────────────────────────────────────────────────────

    def start(self) -> "RTSPCamera":
        """Open the capture and start the background reader thread."""
        self._open_capture()
        self._running = True
        self._thread = threading.Thread(
            target=self._reader_loop, name="rtsp-reader", daemon=True
        )
        self._thread.start()
        logger.info(
            "Camera started | url={} frame_skip={} resize_width={} max_fps={}",
            self.url,
            self.frame_skip,
            self.resize_width,
            int(1 / self.min_frame_interval),
        )
        return self

    def stop(self) -> None:
        """Signal the reader thread to stop and release resources."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=3)
        self._release_capture()
        logger.info("Camera stopped.")

    def read(self) -> tuple[bool, cv2.typing.MatLike | None]:
        """
        Return the latest processed frame (non-blocking).
        Returns (True, frame) if a frame is available, (False, None) otherwise.
        The frame is already resized and colour-corrected.
        """
        if self._frame_queue:
            return True, self._frame_queue[-1]
        return False, None

    @property
    def is_running(self) -> bool:
        return self._running

    # ── Internal helpers ─────────────────────────────────────────────────────

    def _open_capture(self) -> None:
        if self._cap and self._cap.isOpened():
            return
        logger.info("Opening capture source: {}", self.url)
        cap = cv2.VideoCapture(self.url)

        if isinstance(self.url, str) and self.url.startswith("rtsp"):
            # Use TCP transport for RTSP — more reliable over LAN
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"H264"))  # type: ignore[attr-defined]
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal internal buffer

        if not cap.isOpened():
            raise RuntimeError(f"Could not open video source: {self.url}")

        self._cap = cap

    def _release_capture(self) -> None:
        if self._cap:
            self._cap.release()
            self._cap = None

    def _reader_loop(self) -> None:
        """Background thread: grab + skip + resize + enqueue."""
        grab_count = 0
        last_frame_time = 0.0
        reconnect_delay = 2.0  # seconds

        while self._running:
            # ── FPS limiter ─────────────────────────────────────────────────
            now = time.monotonic()
            elapsed = now - last_frame_time
            if elapsed < self.min_frame_interval:
                time.sleep(self.min_frame_interval - elapsed)

            with self._lock:
                if not self._cap or not self._cap.isOpened():
                    logger.warning("Capture not open — attempting reconnect…")
                    time.sleep(reconnect_delay)
                    try:
                        self._open_capture()
                    except RuntimeError as exc:
                        logger.error("Reconnect failed: {}", exc)
                    continue

                # grab() is cheaper than read() — decodes only on retrieve()
                grabbed = self._cap.grab()

            if not grabbed:
                logger.warning("Frame grab failed — reconnecting…")
                self._release_capture()
                time.sleep(reconnect_delay)
                try:
                    self._open_capture()
                except RuntimeError as exc:
                    logger.error("Reconnect failed: {}", exc)
                continue

            grab_count += 1

            # ── Frame skip ──────────────────────────────────────────────────
            if grab_count % self.frame_skip != 0:
                continue  # discard without decoding — saves CPU

            # ── Decode ──────────────────────────────────────────────────────
            with self._lock:
                ret, frame = self._cap.retrieve()

            if not ret or frame is None:
                continue

            # ── Resize ──────────────────────────────────────────────────────
            frame = self._resize(frame)

            # ── Enqueue (replaces previous frame — we only keep latest) ─────
            self._frame_queue.append(frame)
            last_frame_time = time.monotonic()

    def _resize(self, frame: cv2.typing.MatLike) -> cv2.typing.MatLike:
        """Downscale to RTSP_RESIZE_WIDTH, preserving aspect ratio."""
        h, w = frame.shape[:2]
        if w <= self.resize_width:
            return frame
        scale = self.resize_width / w
        new_w = self.resize_width
        new_h = int(h * scale)
        return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)


# ── Quick standalone test ────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    logger.remove()
    logger.add(sys.stderr, level="DEBUG")
    logger.info("Starting camera test — press Q to quit")

    cam = RTSPCamera()
    cam.start()

    try:
        while True:
            ok, frame = cam.read()
            if ok and frame is not None:
                cv2.imshow("Smart Attendance — Camera Test", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            else:
                time.sleep(0.01)
    finally:
        cam.stop()
        cv2.destroyAllWindows()
        logger.info("Camera test complete.")
