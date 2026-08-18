"""
Calibration Manager — collects baseline posture measurements during calibration phase.
Uses robust statistics (median, trimmed samples) and rejects low-confidence frames.
"""
import time
import logging
import numpy as np
from config import (
    CALIBRATION_DURATION_SECONDS,
    MIN_CALIBRATION_SAMPLES,
    CALIBRATION_CONFIDENCE_THRESHOLD,
)

logger = logging.getLogger(__name__)


class CalibrationManager:
    def __init__(self):
        self._samples: list[dict] = []
        self._start_time: float | None = None
        self._baseline: dict | None = None
        self._is_calibrating = False
        self._is_completed = False

    @property
    def is_calibrating(self) -> bool:
        return self._is_calibrating

    @property
    def is_completed(self) -> bool:
        return self._is_completed

    @property
    def baseline(self) -> dict | None:
        return self._baseline

    def start(self):
        """Begin calibration collection."""
        self._samples = []
        self._start_time = time.time()
        self._is_calibrating = True
        self._is_completed = False
        self._baseline = None
        logger.info("Calibration started")

    def add_sample(self, features: dict) -> str:
        """
        Add a feature sample. Returns "SUCCESS" when complete, "TIMEOUT" if it fails, or "PENDING" otherwise.
        """
        if not self._is_calibrating:
            return "PENDING"

        # Reject low-confidence samples
        if features.get("avg_confidence", 0) < CALIBRATION_CONFIDENCE_THRESHOLD:
            return "PENDING"

        self._samples.append(features)

        elapsed = time.time() - self._start_time
        if elapsed >= CALIBRATION_DURATION_SECONDS and len(self._samples) >= MIN_CALIBRATION_SAMPLES:
            self._compute_baseline()
            return "SUCCESS"

        return "PENDING"

    def check_timeout(self) -> str:
        """Check if calibration has timed out without relying on new samples."""
        if not self._is_calibrating:
            return "PENDING"
            
        elapsed = time.time() - self._start_time
        if elapsed > 10.0:
            self._is_calibrating = False
            logger.warning("Calibration timeout")
            return "TIMEOUT"
            
        return "PENDING"

    def _compute_baseline(self):
        """Compute robust baseline from collected samples."""
        if len(self._samples) < MIN_CALIBRATION_SAMPLES:
            logger.warning(f"Not enough calibration samples: {len(self._samples)}")
            return

        # Use median for robustness against outliers
        feature_keys = [
            "shoulder_width", "shoulder_tilt_deg", "head_forward_displacement",
            "ear_shoulder_ratio", "head_horizontal_offset", "face_scale",
            "torso_compression", "torso_lean", "nose_shoulder_vertical",
            "world_head_forward",
        ]

        self._baseline = {}
        for key in feature_keys:
            values = [s[key] for s in self._samples if key in s]
            if values:
                # Trim 10% outliers from each end
                trimmed = sorted(values)[len(values) // 10: -max(1, len(values) // 10)]
                self._baseline[key] = float(np.median(trimmed)) if trimmed else float(np.median(values))

        self._is_calibrating = False
        self._is_completed = True
        logger.info(f"Calibration complete ({len(self._samples)} samples)")
        logger.info(f"Baseline: {self._baseline}")

    def get_progress(self) -> float:
        """Get calibration progress as 0.0 to 1.0."""
        if not self._is_calibrating or self._start_time is None:
            return 1.0 if self._is_completed else 0.0
        elapsed = time.time() - self._start_time
        return min(1.0, elapsed / CALIBRATION_DURATION_SECONDS)

    def reset(self):
        """Reset calibration for recalibration."""
        self._samples = []
        self._start_time = None
        self._baseline = None
        self._is_calibrating = False
        self._is_completed = False
        logger.info("Calibration reset")
