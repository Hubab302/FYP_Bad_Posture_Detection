# AI-Based Personal Posture & Ergonomics Coach

> A web application that monitors and corrects sitting posture in real-time using AI and a laptop's built-in webcam.

**Final Year Project** — Department of Computer Science, Quaid-i-Azam University Islamabad

**Submitted By:** Hubab Masood Chaudhary  
**Supervisor:** Dr. Syed Muhammad Naqi

---

## Overview

This application helps office workers, remote employees, and students maintain healthy sitting posture during extended computer use. It uses **MediaPipe Pose Landmarker (Heavy)** for real-time skeletal pose detection through the laptop webcam, classifies posture as good or bad, and provides alerts with ergonomic recommendations when bad posture persists beyond 60 seconds.

### Six Primary Use Cases

1. **Signup** — Create a new user account
2. **Login** — Authenticate with email or username
3. **Track Posture** — Real-time posture monitoring with live graph and alerts
4. **Generate Report** — Weekly posture report with statistics
5. **View History** — 7-day posture history with daily breakdowns
6. **Logout** — Secure session termination with confirmation

---

## Architecture

```
React (Vite + TypeScript) ←→ Express (Node.js) ←→ MongoDB
        ↕ WebSocket                    ↑
Python FastAPI Vision Service ─────────┘
   (MediaPipe Heavy, OpenCV, plyer)
```

- **React Frontend** — UI, routing, auth context, real-time graph (Recharts)
- **Express Backend** — Authentication, session management, API, database persistence, backup
- **Python Vision Service** — Webcam, pose detection, classification, state machine, notifications
- **MongoDB** — Users, sessions, segments, alerts, daily history, weekly reports

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, React Router, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| AI/Vision | Python 3.10+, FastAPI, MediaPipe, OpenCV |
| Notifications | plyer (native OS), in-app toasts |
| Security | bcrypt, express-session, Helmet, CORS, rate limiting |

---

## Installation & Setup (Windows)

### Prerequisites

- **Node.js** v18+ (https://nodejs.org/)
- **MongoDB** v6+ (https://www.mongodb.com/try/download/community)
- **Python** 3.10+ (https://www.python.org/downloads/)
- **Git** (optional)

### Step 1: MongoDB

Start MongoDB on the default port:
```bash
# If installed as a service, it should be running already.
# Otherwise:
mongod --dbpath C:\data\db
```

### Step 2: Environment Variables

Copy the environment template:
```bash
copy .env.example .env
```

Edit `.env` if needed (defaults work for development).

### Step 3: Express Backend

```bash
cd server
npm install
npm start
```

Server runs on **http://localhost:5000**

### Step 4: React Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### Step 5: Python Vision Service

```bash
cd vision-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Vision service runs on **http://localhost:8000**

The MediaPipe Heavy model (~30MB) downloads automatically on first run.

### Quick Start (All Services)

```bash
start-all.bat
```

Then start the vision service separately as described in Step 5.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/posture_coach` | MongoDB connection string |
| `SESSION_SECRET` | — | Express session secret (required) |
| `PORT` | `5000` | Express server port |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin for React |
| `BAD_ALERT_THRESHOLD_SECONDS` | `60` | Bad posture alert threshold |
| `BAD_ALERT_REPEAT_SECONDS` | `120` | Repeat alert interval |
| `BACKUP_CRON` | `0 3 * * *` | Daily backup schedule |

### Development Overrides

For faster testing, set in `.env`:
```
BAD_ALERT_THRESHOLD_SECONDS=5
BAD_ALERT_REPEAT_SECONDS=10
```

⚠️ The system logs when development overrides are active.

---

## Testing

### Express API Tests
```bash
cd server
npm test
```

### Python Unit Tests
```bash
cd vision-service
venv\Scripts\activate
pytest tests/ -v
```

---

## Troubleshooting

### Webcam Issues
- Ensure no other application is using the webcam
- Check Windows Settings → Privacy → Camera permissions
- Try different camera index: set `CAMERA_INDEX=1` environment variable

### Native Notifications
- Windows: Ensure Focus Assist is not blocking notifications
- plyer requires the `plyer` package: `pip install plyer`
- Notification failures never crash posture tracking

### MongoDB Connection
- Ensure MongoDB is running: `mongod --dbpath C:\data\db`
- Check `MONGODB_URI` in `.env`

### Vision Service Not Starting
- Ensure Python 3.10+ is installed
- Activate virtual environment: `venv\Scripts\activate`
- Reinstall dependencies: `pip install -r requirements.txt`
- Check port 8000 is not in use

---

## Manual Backup

```bash
cd server
node jobs/runBackup.js
```

Backups are saved as gzip-compressed JSON in the `/backups` directory.

---

## Disclaimer

This application provides computer-vision based posture classification and ergonomic recommendations. It is not a medical diagnostic device and should not replace professional medical advice.

---

## License

This project is an academic Final Year Project and is not licensed for commercial use.
