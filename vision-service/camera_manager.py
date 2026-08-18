"""
Camera Manager — owns the webcam lifecycle (OpenCV).
"""
import cv2
import threading
import time
import logging

from config import CAMERA_INDEX, CAMERA_WIDTH, CAMERA_HEIGHT

logger = logging.getLogger(__name__)


class CameraManager:
    def __init__(self):
        self._cap: cv2.VideoCapture | None = None
        self._lock = threading.Lock()
        self._is_open = False
        self._latest_frame = None
        self._capture_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    @property
    def is_open(self) -> bool:
        return self._is_open and self._cap is not None

    def open(self) -> bool:
        """Open the webcam. Returns True on success."""
        with self._lock:
            if self.is_open:
                logger.info("Camera already open")
                return True

            logger.info(f"Opening camera index {CAMERA_INDEX}...")
            # Try to open up to 3 times to avoid driver release race conditions
            for attempt in range(3):
                self._cap = cv2.VideoCapture(CAMERA_INDEX)
                if not self._cap.isOpened():
                    self._cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
                if self._cap.isOpened():
                    break
                logger.warning(f"Failed to open camera on attempt {attempt+1}. Retrying...")
                time.sleep(0.5)

            if not self._cap or not self._cap.isOpened():
                logger.error("Failed to open camera after multiple attempts")
                self._cap = None
                self._is_open = False
                return False

            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)
            self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self._is_open = True
            self._stop_event.clear()
            
            # Start capture thread
            self._capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
            self._capture_thread.start()
            
            logger.info(f"Camera opened: {CAMERA_WIDTH}x{CAMERA_HEIGHT}")
            return True

    def _capture_loop(self):
        """Continuously read frames in the background to empty the driver buffer."""
        while not self._stop_event.is_set() and self._is_open:
            if self._cap is not None and self._cap.isOpened():
                ret, frame = self._cap.read()
                if ret:
                    with self._lock:
                        self._latest_frame = frame
                else:
                    time.sleep(0.01)
            else:
                time.sleep(0.1)

    def read_frame(self):
        """Read the latest frame, without blocking on the driver."""
        if not self.is_open:
            return False, None

        with self._lock:
            if self._latest_frame is not None:
                return True, self._latest_frame.copy()
            return False, None

    def release(self):
        """Release the webcam and stop capture thread."""
        self._stop_event.set()
        
        with self._lock:
            self._is_open = False
            if self._cap is not None:
                self._cap.release()
                self._cap = None
            self._latest_frame = None
            
        if self._capture_thread is not None and self._capture_thread.is_alive():
            self._capture_thread.join(timeout=2.0)
            self._capture_thread = None
            
        time.sleep(0.5) # Allow driver to fully release hardware
        logger.info("Camera released")
