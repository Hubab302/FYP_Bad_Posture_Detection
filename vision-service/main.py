"""
AI-Based Personal Posture & Ergonomics Coach — Python Vision Service
FastAPI application with WebSocket telemetry, camera management, and pose detection.
"""
import asyncio
import json
import logging
import time
import threading
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import (
    MODEL_COMPLEXITY, TARGET_FPS, CHECKPOINT_INTERVAL_SECONDS,
    BAD_ALERT_THRESHOLD_SECONDS, BAD_ALERT_REPEAT_SECONDS,
)
from camera_manager import CameraManager
from pose_model import PoseModel
from feature_extractor import extract_features
from calibration_manager import CalibrationManager
from posture_classifier import PostureClassifier
from posture_state_machine import PostureStateMachine
from notification_manager import NotificationManager
from recommendation_engine import get_recommendation
from backend_client import BackendClient

# ─── Logging ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("vision-service")

# ─── FastAPI App ───
app = FastAPI(title="PostureCoach Vision Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ───
camera = CameraManager()
pose_model = PoseModel(MODEL_COMPLEXITY)
calibration = CalibrationManager()
classifier = PostureClassifier()
state_machine = PostureStateMachine()
notifier = NotificationManager()
backend = BackendClient()

tracking_active = False
tracking_lock = threading.Lock()
tracking_thread: threading.Thread | None = None
ws_clients: list[WebSocket] = []
latest_frame_jpeg: bytes | None = None


# ─── Request Models ───
class StartRequest(BaseModel):
    sessionId: str
    trackingToken: str
    backendEventUrl: str


# ─── Endpoints ───
@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_COMPLEXITY}


@app.get("/status")
def status():
    return {
        "tracking": tracking_active,
        "camera": camera.is_open,
        "model": MODEL_COMPLEXITY,
        "calibrated": calibration.is_completed,
        "state": state_machine.state,
    }


@app.post("/tracking/start")
async def start_tracking(req: StartRequest):
    global tracking_active, tracking_thread

    with tracking_lock:
        already_active = tracking_active

    if already_active:
        logger.warning("Tracking already active. Forcefully stopping previous session before starting new one.")
        await stop_tracking()

    # Configure backend client
    backend.configure(req.backendEventUrl, req.trackingToken)

    # Open camera
    if not camera.open():
        return {"error": "Camera unavailable. Please check webcam permissions."}, 500

    # Reset components for a fresh tracking period
    calibration.start()
    classifier.reset()
    state_machine.__init__()
    state_machine.state = "CALIBRATING"

    tracking_active = True

    # Start inference loop in background thread
    tracking_thread = threading.Thread(target=_inference_loop, daemon=True)
    tracking_thread.start()

    logger.info(f"Tracking session setup started (session: {req.sessionId}, model: {MODEL_COMPLEXITY})")
    return {"status": "started", "model": MODEL_COMPLEXITY}


@app.post("/tracking/begin_monitoring")
async def begin_monitoring():
    """Transition from READY_TO_START to active monitoring."""
    if not tracking_active:
        return {"error": "Tracking session not active. Please calibrate first."}, 400

    if state_machine.state != "READY_TO_START":
        return {"error": f"Cannot start monitoring from state: {state_machine.state}."}, 400

    state_machine.start_monitoring()
    return {"status": "tracking"}


@app.post("/tracking/stop")
async def stop_tracking():
    global tracking_active, latest_frame_jpeg

    with tracking_lock:
        if not tracking_active:
            return {"status": "already_stopped", "stats": state_machine.get_stats()}
        tracking_active = False

    # Wait briefly for inference thread to exit
    if tracking_thread and tracking_thread.is_alive():
        tracking_thread.join(timeout=2.0)

    # Finalize stats
    final_stats = state_machine.finalize()

    # Send final checkpoint to backend
    try:
        await backend.send_checkpoint(final_stats)
    except Exception as e:
        logger.error(f"Final checkpoint failed: {e}")

    # Release camera
    camera.release()
    latest_frame_jpeg = None

    # Close backend session
    try:
        await backend.close()
    except Exception as e:
        logger.error(f"Backend close failed: {e}")

    # Broadcast stop to WebSocket clients
    await _broadcast({
        "state": "STOPPED",
        "postureScore": 0,
        "postureTypes": [],
        "suggestion": "",
        "badStreakSeconds": 0,
        "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
        "goodSeconds": round(final_stats.get("goodDurationSeconds", 0), 1),
        "badSeconds": round(final_stats.get("badDurationSeconds", 0), 1),
        "landmarkConfidence": 0,
        "calibrationStatus": "stopped",
        "cameraStatus": "off",
    })

    logger.info("Tracking stopped")
    return {"status": "stopped", "stats": final_stats}


@app.post("/tracking/recalibrate")
async def recalibrate():
    if not tracking_active:
        return {"error": "Tracking not active"}, 400

    state_machine.reset_for_recalibration()
    classifier.reset()
    calibration.start()
    logger.info("Recalibration started")
    return {"status": "recalibrating"}


# ─── Video Feed ───
# The MJPEG stream stays available as long as the camera has a frame.
# The frontend <img> element naturally handles the stream lifecycle.

async def _video_stream():
    """Generator for MJPEG stream."""
    # Pre-compute a 1x1 black JPEG frame to serve as a valid placeholder
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    _, blank_jpg = cv2.imencode('.jpg', blank_frame)
    blank_bytes = blank_jpg.tobytes()

    while True:
        if latest_frame_jpeg is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + latest_frame_jpeg + b'\r\n')
        else:
            # Send a valid black pixel as placeholder to keep connection alive and avoid broken image icon
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + blank_bytes + b'\r\n')
        await asyncio.sleep(0.05)


@app.get("/video_feed")
async def video_feed():
    """MJPEG stream endpoint. Returns stream regardless of tracking state
    so the <img> element never shows a broken image icon."""
    return StreamingResponse(
        _video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ─── WebSocket ───
@app.websocket("/ws/telemetry")
async def websocket_telemetry(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    logger.info(f"WebSocket client connected ({len(ws_clients)} total)")

    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "visibility":
                    notifier.set_browser_state(
                        visible=msg.get("visible", True),
                        focused=msg.get("focused", True),
                    )
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        if ws in ws_clients:
            ws_clients.remove(ws)
        logger.info(f"WebSocket client disconnected ({len(ws_clients)} remaining)")


async def _broadcast(data: dict):
    """Broadcast telemetry to all connected WebSocket clients."""
    if not ws_clients:
        return
    msg = json.dumps(data)
    disconnected = []
    for ws in ws_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        if ws in ws_clients:
            ws_clients.remove(ws)


def _broadcast_sync(data: dict):
    """Broadcast from sync context (inference thread)."""
    loop = None
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()

    if loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast(data), loop)
    else:
        asyncio.run(_broadcast(data))


# ─── Inference Loop ───
def _inference_loop():
    """Main computer vision loop running in a background thread."""
    global tracking_active, latest_frame_jpeg

    logger.info("Inference loop started")
    frame_interval = 1.0 / TARGET_FPS
    last_checkpoint = time.time()
    prev_state = "CALIBRATING"

    loop = asyncio.new_event_loop()

    # Initialize model in inference thread to prevent XNNPACK crashes
    try:
        pose_model.initialize()
    except Exception as e:
        logger.error(f"Pose model init failed in inference thread: {e}")
        tracking_active = False
        return

    while tracking_active:
        loop_start = time.time()

        # ─── Check calibration timeout independently of frames ───
        if calibration.is_calibrating:
            timeout_status = calibration.check_timeout()
            if timeout_status == "TIMEOUT":
                state_machine.on_calibration_timeout()
                _send_telemetry_sync(loop, {
                    "state": "IDLE",
                    "postureScore": 0,
                    "postureTypes": [],
                    "suggestion": "Calibration couldn't be completed. Make sure your face and upper body are visible, then try again.",
                    "badStreakSeconds": 0,
                    "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
                    "goodSeconds": 0,
                    "badSeconds": 0,
                    "landmarkConfidence": 0,
                    "calibrationStatus": "failed",
                    "cameraStatus": "ok",
                })
                logger.info("Calibration timed out (landmarks missing or low confidence)")
                time.sleep(frame_interval)
                continue

        # Read frame
        success, frame = camera.read_frame()
        if not success or frame is None:
            _send_telemetry_sync(loop, {
                "state": "UNOBSERVED",
                "postureScore": 0,
                "postureTypes": [],
                "suggestion": "Camera frame unavailable.",
                "badStreakSeconds": 0,
                "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
                "goodSeconds": 0,
                "badSeconds": 0,
                "landmarkConfidence": 0,
                "calibrationStatus": "completed" if calibration.is_completed else "in_progress",
                "cameraStatus": "error",
            })
            time.sleep(frame_interval)
            continue

        # Encode frame for MJPEG stream (mirror for selfie-view)
        preview_frame = cv2.flip(frame, 1)
        ret, buffer = cv2.imencode('.jpg', preview_frame)
        if ret:
            latest_frame_jpeg = buffer.tobytes()

        # Convert to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Run pose detection
        try:
            landmarks, world_landmarks = pose_model.detect(frame_rgb)
        except Exception as e:
            logger.error(f"Pose detection error: {e}")
            time.sleep(frame_interval)
            continue



        if landmarks is None:
            state_machine.transition("UNOBSERVED", [], 0)
            _send_telemetry_sync(loop, {
                "state": state_machine.state,
                "postureScore": 0,
                "postureTypes": [],
                "suggestion": "",
                "badStreakSeconds": 0,
                "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
                "goodSeconds": 0,
                "badSeconds": 0,
                "landmarkConfidence": 0,
                "calibrationStatus": "completed" if calibration.is_completed else "in_progress",
                "cameraStatus": "ok",
            })
            time.sleep(frame_interval)
            continue

        # Extract features
        features = extract_features(landmarks, world_landmarks)
        if features is None:
            state_machine.transition("UNOBSERVED", [], 0)
            time.sleep(frame_interval)
            continue

        # ─── Calibration phase ───
        if calibration.is_calibrating:
            status = calibration.add_sample(features)
            progress = calibration.get_progress()

            _send_telemetry_sync(loop, {
                "state": "CALIBRATING",
                "postureScore": 100,
                "postureTypes": [],
                "suggestion": "Sit upright and face the camera.",
                "badStreakSeconds": 0,
                "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
                "goodSeconds": 0,
                "badSeconds": 0,
                "landmarkConfidence": round(features["avg_confidence"], 2),
                "calibrationStatus": "in_progress",
                "calibrationProgress": round(progress, 2),
                "cameraStatus": "ok",
            })

            if status == "SUCCESS":
                state_machine.on_calibration_complete()
                loop.run_until_complete(backend.send_calibration(MODEL_COMPLEXITY))
                logger.info("Calibration completed")

            time.sleep(frame_interval)
            continue

        # ─── Classification phase ───
        baseline = calibration.baseline
        if baseline is None:
            time.sleep(frame_interval)
            continue

        posture_state, posture_types, posture_score = classifier.classify(features, baseline)

        # State machine transition
        alert = state_machine.transition(posture_state, posture_types, features["avg_confidence"])

        # Handle alert
        alert_triggered = False
        if alert:
            alert_triggered = True
            loop.run_until_complete(backend.send_alert(alert))
            if notifier.should_use_native:
                notifier.send_native_notification(
                    title="PostureCoach Alert",
                    message=f"{alert['message']}\n{alert['suggestion'][:100]}",
                )

        # Get recommendation
        suggestion = get_recommendation(posture_types) if posture_types else ""

        # Current period stats
        stats = state_machine.get_stats()

        # Build telemetry
        telemetry = {
            "state": state_machine.state,
            "postureScore": posture_score,
            "postureTypes": posture_types,
            "suggestion": suggestion,
            "badStreakSeconds": round(state_machine.bad_streak_duration, 1),
            "sessionElapsedSeconds": round(state_machine.session_elapsed, 1),
            "goodSeconds": round(stats["goodDurationSeconds"], 1),
            "badSeconds": round(stats["badDurationSeconds"], 1),
            "landmarkConfidence": round(features["avg_confidence"], 2),
            "calibrationStatus": "completed",
            "cameraStatus": "ok",
        }

        if alert_triggered:
            telemetry["alertTriggered"] = True
            telemetry["alertMessage"] = alert["message"]
            telemetry["alertSuggestion"] = alert["suggestion"]
            telemetry["alertPostureTypes"] = alert["postureTypes"]

        _send_telemetry_sync(loop, telemetry)

        # State change → backend event
        if state_machine.state != prev_state:
            normalized_prev_state = prev_state.lower().replace("bad_pending", "bad").replace("bad_confirmed", "bad")
            if normalized_prev_state in ("good", "bad", "unobserved"):
                loop.run_until_complete(backend.send_state_change(
                    previous_segment={
                        "state": normalized_prev_state,
                        "postureTypes": posture_types,
                        "startedAt": time.time() - 1,
                        "endedAt": time.time(),
                        "durationSeconds": 1,
                        "averageConfidence": features["avg_confidence"],
                    },
                    session_stats=stats,
                ))
            prev_state = state_machine.state

        # Periodic checkpoint
        now = time.time()
        if now - last_checkpoint >= CHECKPOINT_INTERVAL_SECONDS:
            loop.run_until_complete(backend.send_checkpoint(stats))
            last_checkpoint = now

        # Frame rate control
        elapsed = time.time() - loop_start
        sleep_time = max(0, frame_interval - elapsed)
        if sleep_time > 0:
            time.sleep(sleep_time)

    pose_model.close()
    loop.close()
    logger.info("Inference loop ended")


def _send_telemetry_sync(loop: asyncio.AbstractEventLoop, data: dict):
    """Send telemetry from sync inference thread."""
    try:
        loop.run_until_complete(_broadcast(data))
    except Exception:
        pass


# ─── Run ───
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Vision Service (model: {MODEL_COMPLEXITY})")
    logger.info(f"Alert threshold: {BAD_ALERT_THRESHOLD_SECONDS}s, Repeat: {BAD_ALERT_REPEAT_SECONDS}s")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
