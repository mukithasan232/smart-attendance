"""
config.py — Centralised configuration loaded from .env

All modules import from here instead of calling os.getenv directly.
Structured for SaaS multi-tenant readiness (CAMERA_ID, TENANT_ID).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Suppress albumentations SSL version-check warning (macOS cert issue — cosmetic only)
os.environ.setdefault("NO_ALBUMENTATIONS_UPDATE", "1")

# Load .env from the project root (same directory as this file)
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ── Camera ─────────────────────────────────────────────────────────────────────
RTSP_URL: str = os.getenv("RTSP_URL", "0")
FRAME_SKIP: int = int(os.getenv("FRAME_SKIP", "4"))
RTSP_RESIZE_WIDTH: int = int(os.getenv("RTSP_RESIZE_WIDTH", "640"))
RTSP_MAX_FPS: int = int(os.getenv("RTSP_MAX_FPS", "15"))

# ── Face Recognition ────────────────────────────────────────────────────────────
FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.5"))
FACE_DETECT_THRESHOLD: float = float(os.getenv("FACE_DETECT_THRESHOLD", "0.5"))

# ── Security / Alert Logic ──────────────────────────────────────────────────────
# Cooldown period (seconds) between repeated alerts for the same unknown face
UNKNOWN_COOLDOWN_SEC: int = int(os.getenv("UNKNOWN_COOLDOWN_SEC", "120"))  # 2 minutes

# Automatically enroll unknown faces into the database instead of requiring manual approval
AUTO_ENROLL_UNKNOWN_FACES: bool = os.getenv("AUTO_ENROLL_UNKNOWN_FACES", "False").lower() == "true"

# Use YOLOv8 person detection as a pre-filter before running heavy face recognition
USE_YOLO_PREFILTER: bool = os.getenv("USE_YOLO_PREFILTER", "True").lower() == "true"

# ── Telegram ────────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
_raw_admin_id = os.getenv("TELEGRAM_ADMIN_ID", "0")
TELEGRAM_ADMIN_ID: int = int(_raw_admin_id) if _raw_admin_id.lstrip("-").isdigit() else 0
TELEGRAM_WEBHOOK_URL: str = os.getenv("TELEGRAM_WEBHOOK_URL", "")

# ── SMTP Email Notifications ────────────────────────────────────────────────────
SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "False").lower() == "true"
SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "True").lower() == "true"
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM: str = os.getenv("SMTP_FROM", SMTP_USER)
# Comma-separated list of recipient email addresses
SMTP_TO_EMAILS: list[str] = [
    e.strip() for e in os.getenv("SMTP_TO_EMAILS", "").split(",") if e.strip()
]
SMTP_ALERT_UNKNOWN: bool = os.getenv("SMTP_ALERT_UNKNOWN", "True").lower() == "true"
SMTP_ALERT_KNOWN: bool = os.getenv("SMTP_ALERT_KNOWN", "False").lower() == "true"


# ── FastAPI Server ──────────────────────────────────────────────────────────────
SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

# ── Logging ────────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

import sys
from loguru import logger
logger.remove()
logger.add(sys.stderr, level=LOG_LEVEL)

# ── SaaS / Multi-tenant Identifiers ───────────────────────────────────────────
# Used to tag all DB records — makes it trivial to add per-tenant filtering later
CAMERA_ID: str = os.getenv("CAMERA_ID", "cam-01")
TENANT_ID: str = os.getenv("TENANT_ID", "default")

# ── Paths ──────────────────────────────────────────────────────────────────────
DB_PATH: Path = Path(os.getenv("DB_PATH", "./security.db"))
SNAPSHOTS_DIR: Path = Path(os.getenv("SNAPSHOTS_DIR", "./snapshots"))
MODEL_DIR: Path = Path(os.getenv("MODEL_DIR", "./models"))

# Ensure required directories exist at import time
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)
