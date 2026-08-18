"""
Feature Extractor — extracts normalized posture features from MediaPipe landmarks.
All features are normalized relative to body proportions (shoulder width, torso length).
"""
import math
import numpy as np
from pose_model import LandmarkIndex as LM
from config import CONFIDENCE_THRESHOLD


def _get_point(landmarks, idx):
    """Get landmark as (x, y, z, visibility)."""
    lm = landmarks[idx]
    return lm.x, lm.y, lm.z, lm.visibility


def _is_visible(landmarks, idx, threshold=None):
    """Check if a landmark has sufficient visibility."""
    threshold = threshold or CONFIDENCE_THRESHOLD
    return landmarks[idx].visibility >= threshold


def _distance_2d(p1, p2):
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def _midpoint(p1, p2):
    return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)


def extract_features(landmarks, world_landmarks=None) -> dict | None:
    """
    Extract normalized posture features from pose landmarks.
    Returns None if key landmarks are not sufficiently visible.
    """
    # Check visibility of critical landmarks
    critical = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.NOSE]
    for idx in critical:
        if not _is_visible(landmarks, idx):
            return None

    # Get key points
    nose = _get_point(landmarks, LM.NOSE)
    left_eye = _get_point(landmarks, LM.LEFT_EYE)
    right_eye = _get_point(landmarks, LM.RIGHT_EYE)
    left_ear = _get_point(landmarks, LM.LEFT_EAR)
    right_ear = _get_point(landmarks, LM.RIGHT_EAR)
    left_shoulder = _get_point(landmarks, LM.LEFT_SHOULDER)
    right_shoulder = _get_point(landmarks, LM.RIGHT_SHOULDER)

    # Check if hips are visible for additional features
    hips_visible = (_is_visible(landmarks, LM.LEFT_HIP) and
                    _is_visible(landmarks, LM.RIGHT_HIP))

    left_hip = _get_point(landmarks, LM.LEFT_HIP) if hips_visible else None
    right_hip = _get_point(landmarks, LM.RIGHT_HIP) if hips_visible else None

    # ─── Reference dimensions for normalization ───
    shoulder_width = _distance_2d(left_shoulder, right_shoulder)
    if shoulder_width < 0.01:
        return None  # Degenerate

    shoulder_mid = _midpoint(left_shoulder, right_shoulder)

    # Ear midpoint (for head position)
    ear_available = _is_visible(landmarks, LM.LEFT_EAR) and _is_visible(landmarks, LM.RIGHT_EAR)
    if ear_available:
        ear_mid = _midpoint(left_ear, right_ear)
    else:
        ear_mid = nose  # fallback

    # Eye distance (face scale reference)
    eye_distance = _distance_2d(left_eye, right_eye)

    # ─── Feature: Head forward displacement ───
    # Normalized by shoulder width
    head_forward_displacement = (ear_mid[1] - shoulder_mid[1]) / shoulder_width if ear_available else (nose[1] - shoulder_mid[1]) / shoulder_width

    # ─── Feature: Ear-to-shoulder vertical offset (forward head indicator) ───
    ear_shoulder_ratio = 0.0
    if ear_available:
        # In normalized coordinates, a forward head means ear.y < shoulder.y (higher up)
        # but more importantly, the z-depth or x-offset changes
        ear_shoulder_ratio = (ear_mid[1] - shoulder_mid[1]) / shoulder_width

    # ─── Feature: Shoulder tilt angle (degrees) ───
    dy = right_shoulder[1] - left_shoulder[1]
    dx = right_shoulder[0] - left_shoulder[0]
    shoulder_tilt_deg = math.degrees(math.atan2(dy, dx))

    # ─── Feature: Head-shoulder horizontal offset (leaning) ───
    head_horizontal_offset = (nose[0] - shoulder_mid[0]) / shoulder_width

    # ─── Feature: Face scale (distance indicator) ───
    face_scale = eye_distance / shoulder_width if eye_distance > 0.001 else 0

    # ─── Feature: Torso vertical compression (slouching) ───
    torso_compression = 0.0
    if hips_visible:
        hip_mid = _midpoint(left_hip, right_hip)
        torso_length = _distance_2d(shoulder_mid, hip_mid)
        torso_compression = torso_length / shoulder_width

        # Torso horizontal offset (leaning)
        torso_lean = (shoulder_mid[0] - hip_mid[0]) / shoulder_width
    else:
        torso_lean = head_horizontal_offset  # fallback

    # ─── Feature: Nose-to-shoulder-midpoint vertical distance ───
    nose_shoulder_vertical = (nose[1] - shoulder_mid[1]) / shoulder_width

    # ─── World landmark features (when available) ───
    world_head_forward = 0.0
    if world_landmarks:
        try:
            w_nose = world_landmarks[LM.NOSE]
            w_ls = world_landmarks[LM.LEFT_SHOULDER]
            w_rs = world_landmarks[LM.RIGHT_SHOULDER]
            w_shoulder_mid_z = (w_ls.z + w_rs.z) / 2
            w_shoulder_width = math.sqrt(
                (w_ls.x - w_rs.x) ** 2 + (w_ls.y - w_rs.y) ** 2 + (w_ls.z - w_rs.z) ** 2
            )
            if w_shoulder_width > 0.01:
                world_head_forward = (w_nose.z - w_shoulder_mid_z) / w_shoulder_width
        except (IndexError, AttributeError):
            pass

    # ─── Average confidence ───
    confidences = [landmarks[i].visibility for i in critical]
    if ear_available:
        confidences.extend([landmarks[LM.LEFT_EAR].visibility, landmarks[LM.RIGHT_EAR].visibility])
    avg_confidence = sum(confidences) / len(confidences)

    return {
        "shoulder_width": shoulder_width,
        "shoulder_tilt_deg": shoulder_tilt_deg,
        "head_forward_displacement": head_forward_displacement,
        "ear_shoulder_ratio": ear_shoulder_ratio,
        "head_horizontal_offset": head_horizontal_offset,
        "face_scale": face_scale,
        "torso_compression": torso_compression,
        "torso_lean": torso_lean,
        "nose_shoulder_vertical": nose_shoulder_vertical,
        "world_head_forward": world_head_forward,
        "hips_visible": hips_visible,
        "avg_confidence": avg_confidence,
    }
