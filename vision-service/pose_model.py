"""
Pose Model — MediaPipe Pose Landmarker wrapper.
Downloads the heavy model on first run.
"""
import os
import logging
import urllib.request
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import numpy as np

from config import MODEL_COMPLEXITY, MODEL_DIR

logger = logging.getLogger(__name__)

# Model download URLs (official MediaPipe)
MODEL_URLS = {
    "heavy": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
}

# Official MediaPipe Pose Landmark indices
# https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
class LandmarkIndex:
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10  # NOT forehead!
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28


def ensure_model_downloaded(complexity: str = None) -> str:
    """Download the model if not present. Returns local path."""
    complexity = complexity or MODEL_COMPLEXITY
    os.makedirs(MODEL_DIR, exist_ok=True)
    filename = f"pose_landmarker_{complexity}.task"
    local_path = os.path.join(MODEL_DIR, filename)

    if os.path.exists(local_path):
        logger.info(f"Model found: {local_path}")
        return local_path

    url = MODEL_URLS.get(complexity)
    if not url:
        raise ValueError(f"Unknown model complexity: {complexity}")

    logger.info(f"Downloading {complexity} model from {url}...")
    urllib.request.urlretrieve(url, local_path)
    logger.info(f"Model downloaded: {local_path}")
    return local_path


class PoseModel:
    """Wraps MediaPipe Pose Landmarker for synchronous (VIDEO mode) inference."""

    def __init__(self, complexity: str = None):
        self.complexity = complexity or MODEL_COMPLEXITY
        self._landmarker: mp_vision.PoseLandmarker | None = None
        self._timestamp_ms = 0

    def initialize(self):
        """Load the model."""
        model_path = ensure_model_downloaded(self.complexity)
        logger.info(f"Initializing PoseLandmarker ({self.complexity})...")

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_segmentation_masks=False,
        )
        self._landmarker = mp_vision.PoseLandmarker.create_from_options(options)
        logger.info(f"PoseLandmarker ({self.complexity}) initialized successfully")

    def detect(self, frame_rgb: np.ndarray) -> tuple:
        """
        Run pose detection on an RGB frame.
        Returns (pose_landmarks, world_landmarks) or (None, None) if no pose detected.
        """
        if self._landmarker is None:
            raise RuntimeError("Model not initialized. Call initialize() first.")

        self._timestamp_ms += 33  # ~30fps timestamp increment
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        result = self._landmarker.detect_for_video(mp_image, self._timestamp_ms)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            return None, None

        landmarks = result.pose_landmarks[0]
        world_landmarks = result.pose_world_landmarks[0] if result.pose_world_landmarks else None

        return landmarks, world_landmarks

    def close(self):
        """Release model resources."""
        if self._landmarker:
            self._landmarker.close()
            self._landmarker = None
            logger.info("PoseLandmarker closed")
