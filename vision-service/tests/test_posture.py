"""
Python unit tests for posture classification, state machine, and recommendations.
No webcam required — uses synthetic landmark data.
"""
import sys
import os
import time
import pytest

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from posture_state_machine import PostureStateMachine
from posture_classifier import PostureClassifier
from recommendation_engine import get_recommendation, get_alert_message, RECOMMENDATIONS


class TestPostureStateMachine:
    def test_initial_state_is_calibrating(self):
        sm = PostureStateMachine()
        assert sm.state == "CALIBRATING"

    def test_calibration_to_good(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        assert sm.state == "GOOD"

    def test_good_to_bad_pending(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        alert = sm.transition("BAD", ["Forward Head"], 0.9)
        assert sm.state == "BAD_PENDING"
        assert alert is None  # No alert yet

    def test_bad_pending_to_confirmed_after_threshold(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()

        # Override threshold for testing
        import config
        original = config.BAD_ALERT_THRESHOLD_SECONDS
        config.BAD_ALERT_THRESHOLD_SECONDS = 1  # 1 second for test

        sm.transition("BAD", ["Slouching"], 0.9)
        time.sleep(1.1)
        alert = sm.transition("BAD", ["Slouching"], 0.9)

        config.BAD_ALERT_THRESHOLD_SECONDS = original

        assert sm.state == "BAD_CONFIRMED"
        assert alert is not None
        assert "Slouching" in alert["postureTypes"]
        assert alert["suggestion"] != ""

    def test_good_resets_timer(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        sm.transition("BAD", ["Forward Head"], 0.9)
        sm.transition("GOOD", [], 0.9)
        assert sm.state == "GOOD"
        assert sm.bad_duration_current == 0

    def test_unobserved_does_not_count_as_bad(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        sm.transition("UNOBSERVED", [], 0)
        assert sm.state == "UNOBSERVED"
        stats = sm.get_stats()
        assert stats["badDurationSeconds"] == 0

    def test_finalize_returns_stats(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        time.sleep(0.1)
        stats = sm.finalize()
        assert "goodDurationSeconds" in stats
        assert "badDurationSeconds" in stats
        assert "alertCount" in stats
        assert sm.state == "STOPPED"

    def test_stats_include_posture_type_durations(self):
        sm = PostureStateMachine()
        sm.on_calibration_complete()
        sm.transition("BAD", ["Forward Head"], 0.9)
        time.sleep(0.1)
        stats = sm.get_stats()
        assert "postureTypeDurations" in stats


class TestRecommendationEngine:
    def test_forward_head_recommendation(self):
        rec = get_recommendation(["Forward Head"])
        assert "head" in rec.lower() or "ear" in rec.lower()

    def test_slouching_recommendation(self):
        rec = get_recommendation(["Slouching"])
        assert "spine" in rec.lower() or "chair" in rec.lower()

    def test_leaning_recommendation(self):
        rec = get_recommendation(["Leaning Left"])
        assert "center" in rec.lower() or "weight" in rec.lower()

    def test_multiple_types(self):
        rec = get_recommendation(["Forward Head", "Slouching"])
        assert len(rec) > 0

    def test_unknown_type_returns_empty(self):
        rec = get_recommendation(["UnknownType"])
        assert rec == ""

    def test_alert_message_format(self):
        msg = get_alert_message(["Forward Head"], 65)
        assert "Forward Head" in msg
        assert "1m" in msg

    def test_all_types_have_recommendations(self):
        for type_name in RECOMMENDATIONS:
            rec = get_recommendation([type_name])
            assert len(rec) > 0, f"Missing recommendation for {type_name}"


class TestPostureClassifier:
    def test_good_posture_with_matching_baseline(self):
        pc = PostureClassifier()
        baseline = {
            "shoulder_width": 0.3,
            "shoulder_tilt_deg": 0.0,
            "head_forward_displacement": -0.1,
            "ear_shoulder_ratio": -0.1,
            "head_horizontal_offset": 0.0,
            "face_scale": 0.2,
            "torso_compression": 0.5,
            "torso_lean": 0.0,
            "nose_shoulder_vertical": -0.15,
            "world_head_forward": 0.0,
        }
        # Features matching baseline = GOOD
        features = dict(baseline)  # copy
        state, types, score = pc.classify(features, baseline)
        # Initially should be GOOD (no deviation)
        assert score >= 50

    def test_bad_posture_with_forward_head(self):
        pc = PostureClassifier()
        baseline = {
            "shoulder_width": 0.3,
            "shoulder_tilt_deg": 0.0,
            "head_forward_displacement": -0.1,
            "ear_shoulder_ratio": -0.1,
            "head_horizontal_offset": 0.0,
            "face_scale": 0.2,
            "torso_compression": 0.5,
            "torso_lean": 0.0,
            "nose_shoulder_vertical": -0.15,
            "world_head_forward": 0.0,
        }
        features = dict(baseline)
        features["head_forward_displacement"] = 0.1  # significant forward shift
        features["ear_shoulder_ratio"] = 0.1

        # Need multiple frames due to hysteresis
        for _ in range(20):
            state, types, score = pc.classify(features, baseline)

        # After persistence, should detect forward head
        assert score < 90


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
