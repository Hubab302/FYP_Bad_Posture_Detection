"""
Configuration — central config with environment variable overrides.
"""
import os
import logging

logger = logging.getLogger(__name__)

# ─── Model Config ───
MODEL_COMPLEXITY = os.getenv("MODEL_COMPLEXITY", "heavy")  # heavy | full | lite
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# ─── Camera Config ───
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "640"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "480"))
TARGET_FPS = int(os.getenv("TARGET_FPS", "15"))

# ─── Calibration Config ───
CALIBRATION_DURATION_SECONDS = float(os.getenv("CALIBRATION_DURATION", "4.0"))
MIN_CALIBRATION_SAMPLES = int(os.getenv("MIN_CALIBRATION_SAMPLES", "20"))
CALIBRATION_CONFIDENCE_THRESHOLD = float(os.getenv("CALIBRATION_CONFIDENCE", "0.6"))

# ─── Posture Thresholds (relative to calibrated baseline) ───
FORWARD_HEAD_THRESHOLD = float(os.getenv("FORWARD_HEAD_THRESHOLD", "0.12"))
SLOUCH_THRESHOLD = float(os.getenv("SLOUCH_THRESHOLD", "0.10"))
LEAN_THRESHOLD = float(os.getenv("LEAN_THRESHOLD", "0.08"))
SHOULDER_TILT_THRESHOLD = float(os.getenv("SHOULDER_TILT_THRESHOLD", "8.0"))  # degrees
LEAN_BACK_THRESHOLD = float(os.getenv("LEAN_BACK_THRESHOLD", "0.15"))

# ─── Smoothing & Hysteresis ───
EMA_ALPHA = float(os.getenv("EMA_ALPHA", "0.3"))
STATE_PERSISTENCE_SECONDS = float(os.getenv("STATE_PERSISTENCE", "1.5"))
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))

# ─── Alert Thresholds ───
BAD_ALERT_THRESHOLD_SECONDS = int(os.getenv("BAD_ALERT_THRESHOLD_SECONDS", "60"))
BAD_ALERT_REPEAT_SECONDS = int(os.getenv("BAD_ALERT_REPEAT_SECONDS", "120"))

# ─── Backend Communication ───
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
CHECKPOINT_INTERVAL_SECONDS = int(os.getenv("CHECKPOINT_INTERVAL", "5"))

# ─── Development ───
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

if BAD_ALERT_THRESHOLD_SECONDS != 60:
    logger.warning(f"DEV OVERRIDE: BAD_ALERT_THRESHOLD_SECONDS = {BAD_ALERT_THRESHOLD_SECONDS}")
if BAD_ALERT_REPEAT_SECONDS != 120:
    logger.warning(f"DEV OVERRIDE: BAD_ALERT_REPEAT_SECONDS = {BAD_ALERT_REPEAT_SECONDS}")
