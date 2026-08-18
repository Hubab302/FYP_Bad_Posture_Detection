"""
Posture Classifier — deterministic rule-based classification using calibrated baseline.
Uses EMA smoothing and hysteresis to prevent flickering.
"""
import time
import logging
from config import (
    FORWARD_HEAD_THRESHOLD,
    SLOUCH_THRESHOLD,
    LEAN_THRESHOLD,
    SHOULDER_TILT_THRESHOLD,
    LEAN_BACK_THRESHOLD,
    EMA_ALPHA,
    STATE_PERSISTENCE_SECONDS,
)

logger = logging.getLogger(__name__)


class PostureClassifier:
    def __init__(self):
        self._smoothed: dict[str, float] = {}
        self._current_types: list[str] = []
        self._current_state: str = "GOOD"  # GOOD or BAD
        self._state_changed_at: float = time.time()
        self._pending_state: str | None = None
        self._pending_since: float | None = None

    def classify(self, features: dict, baseline: dict) -> tuple[str, list[str], float]:
        """
        Classify current posture relative to calibrated baseline.
        Returns (state: 'GOOD'|'BAD', posture_types: list, posture_score: float)
        """
        # Compute deviations from baseline
        deviations = {}
        for key in baseline:
            if key in features:
                deviations[key] = features[key] - baseline[key]

        # Apply EMA smoothing
        for key, val in deviations.items():
            if key in self._smoothed:
                self._smoothed[key] = EMA_ALPHA * val + (1 - EMA_ALPHA) * self._smoothed[key]
            else:
                self._smoothed[key] = val

        # ─── Detect posture issues ───
        detected_types: list[str] = []

        # Forward Head
        head_fwd = self._smoothed.get("head_forward_displacement", 0)
        ear_ratio = self._smoothed.get("ear_shoulder_ratio", 0)
        world_fwd = self._smoothed.get("world_head_forward", 0)

        if (abs(head_fwd) > FORWARD_HEAD_THRESHOLD or
            abs(ear_ratio) > FORWARD_HEAD_THRESHOLD or
            world_fwd < -FORWARD_HEAD_THRESHOLD):
            detected_types.append("Forward Head")

        # Slouching — multiple signals
        torso_comp = self._smoothed.get("torso_compression", 0)
        nose_vert = self._smoothed.get("nose_shoulder_vertical", 0)

        # Slouch detected if torso compression decreased or nose dropped
        slouch_signals = 0
        if abs(torso_comp) > SLOUCH_THRESHOLD:
            slouch_signals += 1
        if abs(nose_vert) > SLOUCH_THRESHOLD:
            slouch_signals += 1
        if abs(head_fwd) > SLOUCH_THRESHOLD * 0.8:
            slouch_signals += 1
        if slouch_signals >= 2:
            detected_types.append("Slouching")

        # Shoulder Tilt
        tilt = self._smoothed.get("shoulder_tilt_deg", 0)
        if abs(tilt) > SHOULDER_TILT_THRESHOLD:
            detected_types.append("Shoulder Tilt")

        # Leaning Left / Right
        h_offset = self._smoothed.get("head_horizontal_offset", 0)
        t_lean = self._smoothed.get("torso_lean", 0)
        combined_lean = (h_offset + t_lean) / 2

        if combined_lean > LEAN_THRESHOLD:
            detected_types.append("Leaning Left")
        elif combined_lean < -LEAN_THRESHOLD:
            detected_types.append("Leaning Right")

        # Leaning Back / Too Close
        face_scale = self._smoothed.get("face_scale", 0)
        if face_scale > LEAN_BACK_THRESHOLD:
            detected_types.append("Too Close")
        elif face_scale < -LEAN_BACK_THRESHOLD:
            detected_types.append("Leaning Back")

        # ─── Determine state with hysteresis ───
        raw_state = "BAD" if detected_types else "GOOD"

        # Apply persistence: require stable evidence before changing visual state
        now = time.time()
        if raw_state != self._current_state:
            if self._pending_state != raw_state:
                self._pending_state = raw_state
                self._pending_since = now
            elif now - self._pending_since >= STATE_PERSISTENCE_SECONDS:
                self._current_state = raw_state
                self._current_types = detected_types if raw_state == "BAD" else []
                self._state_changed_at = now
                self._pending_state = None
                self._pending_since = None
        else:
            self._pending_state = None
            self._pending_since = None
            if raw_state == "BAD":
                self._current_types = detected_types

        # ─── Calculate posture score (0-100) ───
        total_deviation = sum(abs(v) for v in self._smoothed.values())
        posture_score = max(0, min(100, int(100 - total_deviation * 200)))

        return self._current_state, self._current_types, posture_score

    def reset(self):
        """Reset classifier state for recalibration."""
        self._smoothed = {}
        self._current_types = []
        self._current_state = "GOOD"
        self._pending_state = None
        self._pending_since = None
