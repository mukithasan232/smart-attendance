"""
vision.py — InsightFace face detection + 512-D embedding engine.

This module is the AI core of the security system. It wraps InsightFace's
FaceAnalysis model with:
  • CoreML / CPU ONNX provider auto-selection (Apple Silicon optimisation)
  • In-memory embedding cache keyed by person_id
  • Vectorised cosine similarity matching (fast even for 1000+ known persons)

Apple Silicon note:
  InsightFace uses ONNX Runtime internally. On Apple M1/M2/M3 the best
  available providers in order of preference are:
    1. CoreMLExecutionProvider  — uses Apple ANE/GPU via Core ML
    2. CPUExecutionProvider     — always available as fallback

  We DO NOT use torch.device("mps") here; InsightFace's model loading
  bypasses PyTorch. The ONNX Runtime providers list achieves the same goal.
"""

import time
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np
from loguru import logger

from config import FACE_DETECT_THRESHOLD, FACE_MATCH_THRESHOLD, MODEL_DIR

# Lazy import — allows the rest of the app to start even if insightface
# is not installed (useful for CI/CD or dashboard-only deployments).
try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    logger.warning(
        "insightface not installed. Face recognition will be disabled. "
        "Run: pip install insightface"
    )


# ── Data Classes ───────────────────────────────────────────────────────────────

@dataclass
class RecognitionResult:
    """Returned by VisionEngine.process_frame() for each detected face."""
    bbox: tuple[int, int, int, int]          # (x1, y1, x2, y2) in pixels
    embedding: np.ndarray                    # 512-D normalised float32 vector
    matched_person_id: Optional[int] = None  # persons.id from DB, or None
    matched_name: Optional[str] = None       # Display name, or None
    confidence: float = 0.0                  # Cosine similarity (0.0–1.0)
    is_known: bool = False                   # True if above match threshold
    det_score: float = 0.0                   # Detection score from InsightFace


@dataclass
class KnownPerson:
    """In-memory representation of a registered person."""
    person_id: int
    name: str
    embedding: np.ndarray


# ── Vision Engine ──────────────────────────────────────────────────────────────

class VisionEngine:
    """
    Wraps InsightFace FaceAnalysis with:
      • ONNX provider selection (CoreML preferred on Apple Silicon)
      • In-memory known-person embedding cache
      • Cosine similarity matching against the registered person list
      • Utility: draw annotated bounding boxes on frames for debugging/stream
    """

    def __init__(self) -> None:
        self._app: Optional["FaceAnalysis"] = None
        self._known_persons: list[KnownPerson] = []
        # Pre-normalised embedding matrix — shape (N, 512) — for vectorised dot product
        self._embeddings_matrix: Optional[np.ndarray] = None
        self._initialized = False

    # ── Initialisation ─────────────────────────────────────────────────────────

    def initialize(self) -> None:
        """
        Load InsightFace models (downloads to MODEL_DIR on first run, ~400 MB).
        Must be called once before process_frame() or generate_embedding().
        """
        if not INSIGHTFACE_AVAILABLE:
            logger.error("Cannot initialise: insightface is not installed.")
            return

        providers = self._select_providers()
        logger.info("InsightFace ONNX providers: {}", providers)

        self._app = FaceAnalysis(
            name="buffalo_l",           # Full model: detection + recognition
            root=str(MODEL_DIR),        # Cache models locally in ./models/
            providers=providers,
        )
        # det_size 640×640 is the accuracy/speed sweet spot for 640px input frames
        self._app.prepare(
            ctx_id=0,
            det_thresh=FACE_DETECT_THRESHOLD,
            det_size=(640, 640),
        )
        self._initialized = True
        logger.info("VisionEngine (InsightFace buffalo_l) initialised successfully.")

    @staticmethod
    def _select_providers() -> list[str]:
        """Return the best available ONNX Runtime execution providers."""
        try:
            import onnxruntime as ort
            available = ort.get_available_providers()
            logger.debug("Available ONNX providers: {}", available)
            preferred: list[str] = []
            if "CoreMLExecutionProvider" in available:
                preferred.append("CoreMLExecutionProvider")
            preferred.append("CPUExecutionProvider")
            return preferred
        except ImportError:
            return ["CPUExecutionProvider"]

    # ── Known Person Cache ─────────────────────────────────────────────────────

    def load_known_persons(self, persons: list[dict]) -> None:
        """
        Populate the in-memory embedding cache from DB records.

        Call this at startup and after every new person is registered.

        Args:
            persons: list of dicts from database.get_all_persons_with_embeddings()
                     Each dict must have: { id, name, embedding: np.ndarray }
        """
        self._known_persons = [
            KnownPerson(
                person_id=p["id"],
                name=p["name"],
                embedding=p["embedding"],
            )
            for p in persons
        ]

        if self._known_persons:
            # Stack all embeddings into a (N, 512) matrix
            matrix = np.stack([p.embedding for p in self._known_persons])
            # L2-normalise each row so dot product == cosine similarity
            norms = np.linalg.norm(matrix, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1.0, norms)  # avoid divide-by-zero
            self._embeddings_matrix = matrix / norms
        else:
            self._embeddings_matrix = None

        logger.info(
            "Known persons loaded into VisionEngine: {} registered", len(self._known_persons)
        )

    # ── Core Processing ────────────────────────────────────────────────────────

    def process_frame(self, frame: np.ndarray) -> list[RecognitionResult]:
        """
        Detect all faces in a frame and attempt to match each against known persons.

        Args:
            frame: BGR numpy array (standard OpenCV format — no conversion needed).

        Returns:
            List of RecognitionResult, one per detected face (may be empty).
        """
        if not self._initialized or self._app is None:
            logger.warning("VisionEngine not initialized — call initialize() first.")
            return []

        t0 = time.perf_counter()

        # --- LOW LIGHT ENHANCEMENT (CLAHE) ---
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_channel, a, b = cv2.split(lab)
        
        # If the frame is too dark (mean lightness < 80), apply CLAHE
        if np.mean(l_channel) < 80:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            cl = clahe.apply(l_channel)
            merged = cv2.merge((cl, a, b))
            enhanced_frame = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
            logger.debug("Applied CLAHE low-light enhancement (mean lightness: {:.1f})", np.mean(l_channel))
        else:
            enhanced_frame = frame

        # InsightFace expects BGR (same as OpenCV) — no conversion needed
        faces = self._app.get(enhanced_frame)

        results: list[RecognitionResult] = []
        for face in faces:
            if face.embedding is None:
                continue

            # Normalise the query embedding to unit length
            emb = face.embedding.astype(np.float32)
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm

            det_score = float(getattr(face, "det_score", 0.0))
            result = self._match_embedding(emb, face.bbox, det_score)
            results.append(result)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.debug(
            "process_frame: {} face(s) detected in {:.1f} ms", len(results), elapsed_ms
        )
        return results

    def _match_embedding(
        self, query_emb: np.ndarray, bbox: np.ndarray, det_score: float = 0.0
    ) -> RecognitionResult:
        """
        Find the closest known person via cosine similarity.

        Cosine similarity interpretation:
          1.0  = identical face
          0.6+ = very likely same person (depends on threshold setting)
          0.0  = completely different

        Returns:
            RecognitionResult with is_known=True if best similarity is above
            the configured threshold (1.0 - FACE_MATCH_THRESHOLD).
        """
        x1, y1, x2, y2 = [int(v) for v in bbox]
        base_result = RecognitionResult(
            bbox=(x1, y1, x2, y2),
            embedding=query_emb,
            det_score=det_score,
        )

        if self._embeddings_matrix is None or not self._known_persons:
            return base_result  # No known persons registered yet

        # Vectorised cosine similarities — query is already unit-normalised
        # Shape: (N,) — one similarity score per known person
        similarities = self._embeddings_matrix @ query_emb
        best_idx = int(np.argmax(similarities))
        best_sim = float(similarities[best_idx])

        logger.debug(
            "Best match: {} (id={}) sim={:.4f} threshold={}",
            self._known_persons[best_idx].name,
            self._known_persons[best_idx].person_id,
            best_sim,
            FACE_MATCH_THRESHOLD,
        )

        # Convert threshold: FACE_MATCH_THRESHOLD is a "distance" (0=identical, 1=opposite)
        # We match if cosine similarity >= (1 - threshold)
        match_sim_threshold = 1.0 - FACE_MATCH_THRESHOLD

        if best_sim >= match_sim_threshold:
            person = self._known_persons[best_idx]
            return RecognitionResult(
                bbox=(x1, y1, x2, y2),
                embedding=query_emb,
                matched_person_id=person.person_id,
                matched_name=person.name,
                confidence=best_sim,
                is_known=True,
                det_score=det_score,
            )

        return base_result  # Unknown face

    # ── Utilities ──────────────────────────────────────────────────────────────

    def generate_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Generate a 512-D embedding for the largest/best face in an image.
        Used for registering new persons from uploaded photos.

        Args:
            image: BGR numpy array.

        Returns:
            Normalised 512-D float32 embedding, or None if no face detected.
        """
        if not self._initialized or self._app is None:
            logger.error("VisionEngine not initialized.")
            return None

        faces = self._app.get(image)
        if not faces:
            logger.warning("No face detected in the provided image.")
            return None

        # Select the face with the highest detection confidence
        best_face = max(faces, key=lambda f: f.det_score)
        emb = best_face.embedding.astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb

    def draw_results(
        self, frame: np.ndarray, results: list[RecognitionResult]
    ) -> np.ndarray:
        """
        Draw annotated bounding boxes and name labels on a frame.

        Color coding:
          • Green  — known person (with confidence score)
          • Red    — unknown face

        Args:
            frame:   BGR numpy array to annotate (modified in-place).
            results: List of RecognitionResult from process_frame().

        Returns:
            The annotated frame (same array, modified in-place).
        """
        for r in results:
            x1, y1, x2, y2 = r.bbox
            color = (0, 200, 0) if r.is_known else (0, 0, 220)
            label = (
                f"{r.matched_name} ({r.confidence:.2f})"
                if r.is_known
                else "Unknown"
            )
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            # Background for label text readability
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
            cv2.rectangle(
                frame, (x1, max(0, y1 - th - 8)), (x1 + tw + 4, y1), color, -1
            )
            cv2.putText(
                frame,
                label,
                (x1 + 2, max(th, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                (255, 255, 255),  # White text on coloured background
                2,
            )
        return frame


# ── Module-level singleton ─────────────────────────────────────────────────────
# Import and use this instance everywhere instead of creating new objects.
engine = VisionEngine()


# ── Standalone test ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from camera import RTSPCamera

    logger.remove()
    logger.add(sys.stderr, level="DEBUG")
    logger.info("Initialising VisionEngine…")

    engine.initialize()

    logger.info("Starting camera for live recognition test (no DB persons loaded)…")
    cam = RTSPCamera()
    cam.start()

    try:
        while True:
            ok, frame = cam.read()
            if not ok or frame is None:
                time.sleep(0.01)
                continue
            results = engine.process_frame(frame)
            frame = engine.draw_results(frame, results)
            cv2.imshow("VisionEngine Test — press Q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cam.stop()
        cv2.destroyAllWindows()
        logger.info("Test complete.")
