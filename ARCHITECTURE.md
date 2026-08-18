# Architecture

## System Overview

The AI-Based Personal Posture & Ergonomics Coach uses a three-service architecture:

```
┌──────────────────┐     REST API      ┌──────────────────┐     Mongoose      ┌──────────────┐
│                  │ ←──────────────→  │                  │ ←──────────────→  │              │
│   React Client   │   (credentials)   │  Express Backend │   (persistence)   │   MongoDB    │
│   (Vite + TS)    │                   │   (Node.js)      │                   │              │
│                  │                   │                  │                   │              │
└────────┬─────────┘                   └────────┬─────────┘                   └──────────────┘
         │                                      ↑
         │  WebSocket                           │  Authenticated
         │  (live telemetry)                    │  Internal API
         │                                      │  (JWT token)
         ↓                                      │
┌──────────────────┐                            │
│                  │ ───────────────────────────→┘
│  Python Vision   │
│  Service         │   → OS Native Notifications (plyer)
│  (FastAPI)       │   → MediaPipe Pose Landmarker
│                  │   → OpenCV Webcam
└──────────────────┘
```

## Communication Flow

### Authentication (React ↔ Express)
- REST API with HttpOnly session cookies
- express-session backed by MongoDB (connect-mongo)
- Session regeneration on login, destruction on logout

### Live Tracking (React ↔ Python)
- WebSocket connection at `ws://localhost:8000/ws/telemetry`
- Lightweight JSON messages (~50 bytes) sent at ~15 FPS
- Contains: state, postureScore, postureTypes, suggestion, durations
- Browser sends visibility/focus state for notification routing

### Data Persistence (Python → Express → MongoDB)
- Python sends events to Express via authenticated internal API
- JWT tracking token created per session (12h expiry)
- Event types: calibration, state_change, checkpoint, alert
- Checkpoints every ~20 seconds for crash recovery
- Express owns all database access — Python never connects to MongoDB

### Native Notifications (Python → OS)
- plyer library sends Windows toast notifications
- Dispatched in background thread (non-blocking)
- Only triggered when browser is not visible/focused
- Rate-limited to prevent spam

## Data Flow During Tracking

1. User clicks "Start Tracking" in React
2. React → Express: `POST /api/tracking/sessions` (creates session, returns token)
3. React → Python: `POST /tracking/start` (passes sessionId + token)
4. Python opens webcam and starts calibration (3-5 seconds)
5. Python → Express: calibration complete event
6. Python inference loop runs at ~15 FPS:
   - Read frame → MediaPipe → Extract features → Classify → State machine
   - Python → React WebSocket: telemetry every frame
   - Python → Express: state changes, checkpoints every 20s, alerts
7. User clicks "Stop Tracking"
8. React → Python: `POST /tracking/stop` (finalizes, releases webcam)
9. React → Express: `POST /api/tracking/sessions/:id/stop` (saves final stats, updates daily aggregate)

## Database Collections

| Collection | Purpose |
|-----------|---------|
| users | User accounts (username, email, passwordHash) |
| sessions | Express sessions (connect-mongo) |
| posturesessions | Tracking session records with duration stats |
| posturesegments | Individual posture state segments |
| alerts | Bad posture alerts with suggestions |
| posturehistories | Daily aggregated posture data (unique per user+date) |
| posturereports | Weekly report snapshots |
