"""
Posture State Machine — deterministic state transitions with alert timing.

Timer concepts:
  - session_elapsed: time since start_monitoring() was called, paused during recalibration.
    This is the CURRENT tracking period's monitoring duration. The frontend adds
    previous daily totals to get the cumulative daily monitoring duration.
  - bad_streak_duration: current UNINTERRUPTED bad posture duration. Resets on GOOD,
    stop, recalibration, or any interruption. Used for 60-second alert threshold.
  - _good_seconds / _bad_seconds: accumulated durations for THIS tracking period,
    persisted to MongoDB for history/report.
"""
import time
import logging
import config
from recommendation_engine import get_recommendation, get_alert_message

logger = logging.getLogger(__name__)


class PostureStateMachine:
    def __init__(self):
        self.state = "CALIBRATING"
        self._bad_streak_start: float | None = None
        self._last_alert_time: float | None = None
        self._alert_count = 0
        self._current_posture_types: list[str] = []

        # Duration accounting for the current tracking period
        self._segment_start = time.time()
        self._good_seconds = 0.0
        self._bad_seconds = 0.0
        self._unobserved_seconds = 0.0
        self._posture_type_durations: dict[str, float] = {}

        # Monitoring clock (pauses during recalibration)
        self._monitoring_start: float | None = None
        self._monitoring_accumulated = 0.0  # seconds accumulated before recalibration
        self._monitoring_paused = True

        self._auto_resume = False

    @property
    def session_elapsed(self) -> float:
        """Current tracking period's monitoring duration (excludes calibration/recalibration)."""
        if self._monitoring_start is None or self._monitoring_paused:
            return self._monitoring_accumulated
        return self._monitoring_accumulated + (time.time() - self._monitoring_start)

    @property
    def bad_streak_duration(self) -> float:
        """Current continuous bad posture streak duration."""
        if self._bad_streak_start is None:
            return 0
        return time.time() - self._bad_streak_start

    def transition(self, classifier_state: str, posture_types: list[str], confidence: float) -> dict | None:
        """Process a new classification result. Returns alert dict if triggered."""
        if self.state not in ("GOOD", "BAD_PENDING", "BAD_CONFIRMED", "UNOBSERVED"):
            return None

        now = time.time()
        segment_duration = now - self._segment_start

        if classifier_state == "UNOBSERVED":
            return self._handle_unobserved(now, segment_duration)
        if classifier_state == "GOOD":
            return self._handle_good(now, segment_duration)
        if classifier_state == "BAD":
            return self._handle_bad(now, segment_duration, posture_types)
        return None

    def _close_segment(self, now: float, segment_duration: float):
        """Close current segment and account duration."""
        if self.state == "GOOD":
            self._good_seconds += segment_duration
        elif self.state in ("BAD_PENDING", "BAD_CONFIRMED"):
            self._bad_seconds += segment_duration
            for pt in self._current_posture_types:
                self._posture_type_durations[pt] = self._posture_type_durations.get(pt, 0) + segment_duration
        elif self.state == "UNOBSERVED":
            self._unobserved_seconds += segment_duration
        self._segment_start = now

    def _handle_unobserved(self, now, segment_duration):
        if self.state != "UNOBSERVED":
            self._close_segment(now, segment_duration)
            prev = self.state
            self.state = "UNOBSERVED"
            self._bad_streak_start = None
            self._current_posture_types = []
            logger.info(f"State: {prev} -> UNOBSERVED")
        return None

    def _handle_good(self, now, segment_duration):
        if self.state != "GOOD":
            self._close_segment(now, segment_duration)
            prev = self.state
            self.state = "GOOD"
            self._bad_streak_start = None
            self._last_alert_time = None
            self._current_posture_types = []
            logger.info(f"State: {prev} -> GOOD (streak reset)")
        return None

    def _handle_bad(self, now, segment_duration, posture_types):
        alert = None

        if self.state in ("GOOD", "UNOBSERVED"):
            self._close_segment(now, segment_duration)
            self.state = "BAD_PENDING"
            self._bad_streak_start = now
            self._current_posture_types = posture_types
            logger.info(f"State: -> BAD_PENDING ({', '.join(posture_types)})")

        elif self.state == "BAD_PENDING":
            # Update posture types but do NOT reset streak timer
            self._current_posture_types = posture_types
            streak = self.bad_streak_duration
            if streak >= config.BAD_ALERT_THRESHOLD_SECONDS:
                self._close_segment(now, segment_duration)
                self.state = "BAD_CONFIRMED"
                self._alert_count += 1
                self._last_alert_time = now
                alert = self._make_alert(posture_types, streak, self._alert_count)
                logger.info(f"State: BAD_PENDING -> BAD_CONFIRMED (alert #{self._alert_count})")

        elif self.state == "BAD_CONFIRMED":
            # Update types for suggestion display
            if self._current_posture_types != posture_types:
                self._current_posture_types = posture_types

            # Check for repeat alert based on continuous Bad Streak
            streak = self.bad_streak_duration
            time_since_last = now - self._last_alert_time if self._last_alert_time else 0
            if time_since_last >= config.BAD_ALERT_REPEAT_SECONDS:
                self._alert_count += 1
                self._last_alert_time = now
                alert = self._make_alert(posture_types, streak, self._alert_count)
                logger.info(f"State: BAD_CONFIRMED -> repeat alert #{self._alert_count}")

        return alert

    def _make_alert(self, posture_types, bad_duration, repeat_number):
        return {
            "postureTypes": posture_types,
            "message": get_alert_message(posture_types, bad_duration),
            "suggestion": get_recommendation(posture_types),
            "badDurationAtAlertSeconds": round(bad_duration),
            "repeatNumber": repeat_number,
            "timestamp": time.time(),
        }

    def get_stats(self, cutoff: float | None = None) -> dict:
        """Get current tracking period statistics (includes ongoing segment)."""
        now = cutoff if cutoff is not None else time.time()
        ongoing = max(0, now - self._segment_start)

        good = self._good_seconds
        bad = self._bad_seconds
        unobs = self._unobserved_seconds

        if self.state == "GOOD":
            good += ongoing
        elif self.state in ("BAD_PENDING", "BAD_CONFIRMED"):
            bad += ongoing
        elif self.state == "UNOBSERVED":
            unobs += ongoing

        return {
            "goodDurationSeconds": round(good, 1),
            "badDurationSeconds": round(bad, 1),
            "unobservedDurationSeconds": round(unobs, 1),
            "postureTypeDurations": {k: round(v, 1) for k, v in self._posture_type_durations.items()},
            "alertCount": self._alert_count,
        }

    def finalize(self, cutoff: float | None = None) -> dict:
        """Close last segment, stop monitoring clock, return final stats."""
        now = cutoff if cutoff is not None else time.time()
        final_stats = self.get_stats(cutoff=now)
        
        segment_duration = max(0, now - self._segment_start)
        if self.state in ("GOOD", "BAD_PENDING", "BAD_CONFIRMED", "UNOBSERVED"):
            self._close_segment(now, segment_duration)

        # Stop monitoring clock
        if not self._monitoring_paused and self._monitoring_start is not None:
            self._monitoring_accumulated += max(0, now - self._monitoring_start)
            self._monitoring_paused = True

        self.state = "STOPPED"
        self._bad_streak_start = None
        return final_stats

    def on_calibration_complete(self):
        """Transition from CALIBRATING to READY_TO_START or resume TRACKING."""
        if self._auto_resume:
            now = time.time()
            self._segment_start = now
            self.state = "GOOD"
            self._monitoring_start = now
            self._monitoring_paused = False
            self._bad_streak_start = None
            self._auto_resume = False
            logger.info("State: CALIBRATING -> GOOD (resumed after recalibration)")
        else:
            self.state = "READY_TO_START"
            logger.info("State: CALIBRATING -> READY_TO_START")

    def on_calibration_timeout(self):
        """Transition from CALIBRATING to IDLE on timeout."""
        self.state = "IDLE"
        self._auto_resume = False
        logger.info("State: CALIBRATING -> IDLE (timeout)")

    def reset_for_recalibration(self):
        """Recalibrate without losing accumulated stats. Pauses monitoring clock."""
        now = time.time()
        segment_duration = now - self._segment_start
        if self.state in ("GOOD", "BAD_PENDING", "BAD_CONFIRMED", "UNOBSERVED"):
            self._close_segment(now, segment_duration)

        # Pause monitoring clock
        if not self._monitoring_paused and self._monitoring_start is not None:
            self._monitoring_accumulated += now - self._monitoring_start
            self._monitoring_paused = True

        self.state = "CALIBRATING"
        self._bad_streak_start = None
        self._last_alert_time = None
        self._current_posture_types = []
        self._auto_resume = True

    def start_monitoring(self, previous_daily_monitoring: float = 0.0):
        """Start tracking from READY_TO_START. Previous daily monitoring is for display only."""
        now = time.time()
        self.state = "GOOD"
        self._segment_start = now
        self._monitoring_start = now
        self._monitoring_paused = False
        self._monitoring_accumulated = 0.0
        self._bad_streak_start = None
        logger.info(f"State: READY_TO_START -> GOOD (monitoring started)")
