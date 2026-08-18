# API Documentation

## Base URL
Express: `http://localhost:5000/api`  
Vision Service: `http://localhost:8000`

---

## Authentication

### POST `/api/auth/signup`
Create a new user account.

**Body:**
```json
{
  "username": "hubab",
  "email": "hubab@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "_id": "...",
    "username": "hubab",
    "email": "hubab@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST `/api/auth/login`
Login with email OR username.

**Body:**
```json
{
  "identifier": "hubab@example.com",
  "password": "password123"
}
```

### POST `/api/auth/logout`
Destroy session and clear cookie. Requires authentication.

### GET `/api/auth/me`
Get current authenticated user.

---

## Tracking

### POST `/api/tracking/sessions`
Create a new tracking session. Requires authentication.

**Response (201):**
```json
{
  "sessionId": "...",
  "trackingToken": "jwt...",
  "backendEventUrl": "http://localhost:5000/api/internal/tracking/.../event"
}
```

### POST `/api/tracking/sessions/:sessionId/stop`
Finalize a tracking session. Idempotent. Requires authentication.

### GET `/api/tracking/sessions/:sessionId`
Get session status and statistics. Requires authentication.

---

## Internal (Python → Express)

### POST `/api/internal/tracking/:sessionId/event`
Authenticated with Bearer tracking token.

**Event Types:**
- `calibration` — `{ type: "calibration", modelUsed: "heavy" }`
- `state_change` — `{ type: "state_change", previousSegment: {...}, sessionStats: {...} }`
- `checkpoint` — `{ type: "checkpoint", sessionStats: {...} }`
- `alert` — `{ type: "alert", postureTypes: [...], message: "...", suggestion: "...", badDurationAtAlertSeconds: 60, repeatNumber: 1 }`

---

## History

### GET `/api/history/range`
Get the user's data range for UI navigation controls. Requires authentication.

**Response:**
```json
{
  "hasData": true,
  "firstDataDate": "2024-01-01",
  "lastDataDate": "2024-01-15",
  "reportEligibleDate": "2024-01-07"
}
```

### GET `/api/history?from=YYYY-MM-DD&to=YYYY-MM-DD`
Get history records for a date range (max 7 days). Requires authentication.

**Response:**
```json
{
  "history": [
    {
      "localDate": "2024-01-10",
      "monitoringDurationSeconds": 3600,
      "goodDurationSeconds": 2800,
      "badDurationSeconds": 800,
      "postureTypes": ["Forward Head", "Slouching"],
      "badPosturePercentage": 22.2,
      "goodPosturePercentage": 77.8,
      "mostFrequentBadPosture": "Forward Head"
    }
  ]
}
```

---

## Reports

### POST `/api/reports/weekly`
Generate or retrieve a weekly posture report. Requires authentication.

**Body:**
```json
{
  "from": "2024-01-08",
  "to": "2024-01-14"
}
```

**Response:**
```json
{
  "report": {
    "fromDate": "2024-01-08",
    "toDate": "2024-01-14",
    "generatedAt": "2024-01-14T15:30:00.000Z",
    "totalMonitoringDurationSeconds": 25200,
    "totalBadDurationSeconds": 5040,
    "totalGoodDurationSeconds": 20160,
    "badPosturePercentage": 20.0,
    "goodPosturePercentage": 80.0,
    "mostFrequentBadPosture": "Slouching"
  }
}
```

---

## Vision Service

### GET `/health`
Health check.

### GET `/status`
Current tracking status.

### POST `/tracking/start`
Start posture tracking.

**Body:**
```json
{
  "sessionId": "...",
  "trackingToken": "jwt...",
  "backendEventUrl": "http://localhost:5000/api/internal/tracking/.../event"
}
```

### POST `/tracking/stop`
Stop posture tracking and release webcam.

### POST `/tracking/recalibrate`
Reset calibration during active tracking.

### WebSocket `/ws/telemetry`
Live telemetry stream. Receives posture data at ~15 FPS.

**Message format:**
```json
{
  "state": "GOOD",
  "postureScore": 85,
  "postureTypes": [],
  "suggestion": "",
  "badDurationSeconds": 0,
  "sessionElapsedSeconds": 120.5,
  "landmarkConfidence": 0.92,
  "calibrationStatus": "completed",
  "cameraStatus": "ok"
}
```
