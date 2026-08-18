# ROLE

Act as a **Senior Full-Stack Software Engineer, Computer Vision Engineer, Software Architect, UI/UX Engineer, Database Engineer, Security Engineer, and QA Engineer**.

You are responsible for implementing my Final Year Project completely, not merely generating a prototype or explaining how it could be built.

The project is:

# AI-Based Personal Posture & Ergonomics Coach

This is a university FYP and the implementation must be stable, professional, explainable in a viva, demonstrable on a normal laptop, and consistent with the approved FYP documentation.

Do not stop after planning.

Do not give me pseudocode instead of implementation.

Do not leave major TODOs.

Do not replace required functionality with mock data.

Do not fabricate model accuracy, ROC-AUC, datasets, test results, or database records.

Inspect the existing repository first. Preserve working code where appropriate, refactor poor architecture where necessary, and implement the complete system.

If this is a greenfield repository, create the full project structure.

---

# 1. NON-NEGOTIABLE PROJECT SCOPE

There are exactly **6 primary use cases** for the FYP:

1. Signup
2. Login
3. Track Posture
4. Generate Posture Report
5. View Posture History
6. Logout

Do not invent additional primary use cases.

Features such as:

- posture detection
- calibration
- alerts
- ergonomic recommendations
- live graph
- database storage
- automatic backup
- native notifications

are supporting system functions, not additional use cases.

The main target platform is a **laptop**.

The web application must use the laptop webcam.

---

# 2. REQUIRED ARCHITECTURE

The main application must remain a MERN-stack application, with Python added only for the AI/computer-vision subsystem.

Use this architecture:

## Frontend

React web application.

Prefer:

- React
- TypeScript
- Vite
- React Router
- a professional component architecture
- a reliable chart library such as Recharts
- accessible reusable UI components
- CSS/Tailwind or the project's existing styling system

Do not unnecessarily rewrite an existing frontend if one already works.

## Main Backend

Node.js + Express.

Responsibilities:

- authentication
- authorization
- users
- tracking-session lifecycle
- secure API
- MongoDB persistence
- history queries
- report generation
- report aggregation
- automatic backup scheduling
- validation
- audit/error logging

## Database

MongoDB using Mongoose.

## AI / Computer Vision Service

Create a separate local Python service, preferably:

- Python 3.10+
- FastAPI
- MediaPipe Tasks Vision
- OpenCV
- NumPy
- WebSocket support
- native desktop notification abstraction

The Python service runs locally on the same laptop as the user.

This architecture is intentional.

Do NOT try to force the supplied Python OpenCV program directly into React or Node.

The React application controls the local Python vision service through HTTP/WebSocket APIs.

The Python process owns the webcam while tracking is active.

This allows tracking to continue when the user minimizes the browser and works in another application.

## Communication

Use:

React ↔ Express REST APIs

React ↔ Python WebSocket for live telemetry

Python → Express authenticated internal API for posture-state transitions/checkpoints

The Python service must never connect directly to MongoDB.

Only the Node/Express backend owns database access.

---

# 3. REPOSITORY STRUCTURE

Use a clean monorepo-style structure similar to:

- `/client`
- `/server`
- `/vision-service`
- `/docs`
- `/scripts`
- `/backups`
- root README
- root environment examples

If an existing structure exists, adapt this architecture intelligently rather than breaking everything simply to match these folder names.

Provide one simple development command or launcher to start all required services.

The final README must contain exact Windows setup instructions because the FYP is likely to be demonstrated on a laptop.

Include:

- Node setup
- MongoDB setup
- Python virtual environment
- Python dependencies
- model setup/download
- environment variables
- frontend startup
- Express startup
- Python vision-service startup
- complete combined startup
- troubleshooting webcam permissions
- troubleshooting native notifications

---

# 4. AUTHENTICATION — IMPLEMENT PROFESSIONALLY

Implement Signup, Login and Logout like a proper professional web application while staying within FYP scope.

## Signup fields

Required:

- username
- email
- password
- confirm password in UI

Rules:

- trim username
- normalize email
- case-insensitive unique email
- unique username
- validate email format
- enforce sensible password requirements
- never store plaintext passwords
- never log passwords

Hash passwords securely.

Use Argon2id if compatible with the environment; otherwise use a properly configured current bcrypt implementation.

## Authentication strategy

For this FYP, prefer secure server-side sessions because frontend and backend are the same application ecosystem.

Use:

- express-session
- Mongo-backed session store
- HttpOnly cookies
- SameSite protection
- Secure cookies in production
- proper session regeneration after login
- secure secret from environment variables
- CSRF protection where applicable
- Helmet
- input validation
- rate limiting on authentication endpoints

The approved documentation expects a user to log in when opening the application again, so a non-persistent browser session cookie is acceptable and preferable.

## Login

Allow login with:

- email OR username
- password

This reconciles documentation screens where username is used and test scenarios where an email is used.

Provide:

- proper validation
- invalid-credential error
- loading state
- no user-enumeration style messages
- redirect to Dashboard after success

## Protected routes

Unauthenticated users must never access:

- Dashboard
- Track Posture
- History
- Report

If authentication expires, redirect cleanly to Login.

## Logout

Logout must:

1. ask for confirmation
2. if Cancel/No → remain on the current page
3. if Yes → destroy the server session
4. clear cookie
5. disconnect active authenticated frontend channels
6. redirect to Login/Signup

If posture tracking is active, warn the user before logout and stop/finalize the active tracking session safely before destroying authentication.

---

# 5. MAIN DASHBOARD

After successful signup/login, display a professional main dashboard.

The three dominant actions must be:

- Track Posture
- View History
- Generate Report

Logout is available in the application navigation/profile menu.

Design this as a real application dashboard rather than four plain buttons.

Use a professional laptop-first responsive design.

Include:

- application logo/name
- short welcome
- navigation/sidebar/header
- three main feature cards
- current tracking status if applicable
- clean empty states
- accessible buttons
- loading/error states

Do not overcrowd the FYP with irrelevant SaaS functionality.

---

# 6. TRACK POSTURE — MOST IMPORTANT MODULE

This is the core FYP functionality.

When the authenticated user clicks **Track Posture**:

1. create a tracking session through Express
2. initialize/connect to the local Python service
3. request webcam access
4. open the webcam
5. perform calibration
6. continuously detect posture
7. stream status/metrics to React
8. display the real-time graph
9. continue until the user explicitly clicks Stop Tracking
10. persist tracking statistics safely throughout the session
11. finalize statistics when tracking stops

Do not save raw webcam video or raw photographs to MongoDB.

Process frames locally.

Only save derived posture information/statistics unless an explicit debugging mode has been intentionally enabled.

This improves privacy and keeps database usage reasonable.

---

# 7. USE MEDIAPIPE POSE LANDMARKER HEAVY

Use:

**MediaPipe Pose Landmarker — BlazePose GHUM Heavy**

as the primary pose model.

The supplied Python code should be treated as a starting/reference implementation, not blindly copied.

Refactor it into proper classes/modules.

Possible structure:

- camera manager
- pose model
- calibration manager
- landmark smoother
- feature extractor
- posture classifier
- posture state machine
- notification manager
- recommendation engine
- session statistics manager
- backend client
- WebSocket telemetry manager

Use MediaPipe Tasks Vision.

Prefer LIVE\_STREAM processing if it is stable for the environment.

Use asynchronous processing/frame skipping so that a slow inference frame does not create an ever-growing queue.

Target smooth real-time functionality rather than unnecessarily processing 60 FPS.

A 640×480 or appropriate laptop-webcam resolution is acceptable if it significantly improves reliability.

Accuracy has priority, but the application must remain real-time.

Heavy is primary.

Provide a configuration-only fallback to MediaPipe Full if the target laptop genuinely cannot sustain usable Heavy-model performance.

Do NOT silently switch models.

Log which model is active.

---

# 8. FIX PROBLEMS IN THE PROVIDED PYTHON ALGORITHM

Do not copy incorrect landmark assumptions.

In particular, verify every MediaPipe landmark index from the official definition.

The supplied code labels landmark 10 as a "forehead" point. Do not assume this is correct.

Build posture measurements from anatomically valid landmarks.

Prefer combinations involving:

- nose
- eyes
- ears
- left/right shoulders
- left/right hips when visible
- 3D/world coordinates when reliable
- landmark visibility/presence confidence

The original code should inspire the following useful ideas:

- calibration
- shoulder tilt
- head/neck displacement
- face scale
- persistence filtering
- notification cooldown

but improve them.

---

# 9. CALIBRATION

At the beginning of a tracking session show a professional calibration state:

"Sit upright in your normal comfortable working posture and face the camera."

Do not rely on one frame.

Collect stable samples for approximately 3–5 seconds.

Use robust statistics such as:

- median
- trimmed mean

instead of a naive average where appropriate.

Discard samples with poor landmark visibility.

Require a minimum number of good samples.

Store baseline measurements for the current tracking session.

Calibration should establish personal baseline values such as:

- shoulder angle
- shoulder width
- torso orientation
- ear-to-shoulder displacement
- head distance/face scale
- head orientation
- trunk orientation

Provide a visible **Recalibrate** button while tracking.

Recalibration must reset baseline values safely without ending the tracking session.

---

# 10. POSTURE CATEGORIES

At minimum detect the project-relevant categories:

## Good Posture

Normal alignment relative to calibrated baseline.

## Forward Head / Forward Neck

Head/ear geometry moves significantly forward relative to the shoulders/baseline.

## Slouching

Use multiple signals where possible rather than only neck angle.

Consider:

- head-forward displacement
- shoulder/torso geometry
- shoulder-to-hip orientation
- vertical compression
- world landmark relationships

## Leaning Left / Right

Use torso and/or shoulder midpoint relative to hip midpoint when hips are reliable.

Also consider shoulder tilt.

## Excessive Shoulder Tilt / Side Lean

Detect meaningful imbalance relative to calibrated baseline.

## Leaning Back / Too Far

Use face distance/scale and torso geometry relative to calibration.

A posture can have multiple active labels where appropriate, for example:

"Forward Head + Slouching"

Do not create random labels that the report cannot explain.

---

# 11. NORMALIZATION AND ACCURACY

Avoid fixed raw pixel thresholds as the only method.

Normalize measurements using person-specific/reference dimensions such as:

- shoulder width
- torso length
- face scale
- calibrated baseline

Use:

- temporal smoothing
- EMA or equivalent filtering
- hysteresis
- confidence thresholds
- landmark visibility checks

Avoid rapid GOOD/BAD flickering.

Require approximately 1–2 seconds of stable evidence before changing the **visual classification state**.

However, this is NOT the alert threshold.

The documented bad-posture alert threshold remains **60 continuous seconds**.

---

# 12. MISSING/UNRELIABLE PERSON HANDLING

Never classify missing landmarks as bad posture.

If the user:

- leaves the chair
- moves outside the camera frame
- becomes heavily occluded
- webcam fails
- landmark confidence becomes insufficient

show:

"Posture temporarily unavailable — please remain visible to the camera."

Pause good/bad duration accounting during unobservable intervals.

Maintain an internal `unobservedDuration` for debugging/statistics if useful, but do not incorrectly add it to good or bad posture.

For report calculations:

`monitoringDuration = goodDuration + badDuration`

Use the observed duration for good/bad percentages.

---

# 13. BAD POSTURE STATE MACHINE

Build a deterministic state machine.

Possible states:

- CALIBRATING
- GOOD
- BAD\_PENDING
- BAD\_CONFIRMED
- UNOBSERVED
- STOPPED

When a bad posture is first recognized reliably:

- change visual state
- begin bad-posture timer
- show the current posture type in the Track page

When continuous bad posture reaches **60 seconds**:

- create an Alert
- generate the correct ergonomic suggestion
- display notification
- persist the alert

If the user remains in bad posture:

- repeat notification every **120 seconds**
- do not spam faster than this

If the user returns to good posture:

- cancel/reset bad-alert countdown
- transition to GOOD
- stop repeated alerts

If a different bad posture replaces the previous posture, update the active posture type intelligently without creating notification spam.

---

# 14. ERGONOMIC RECOMMENDATION ENGINE

Create deterministic recommendations mapped to posture type.

Recommendations must be concise, actionable, and non-medical.

Examples of the style required:

### Forward Head / Forward Neck

"Move your head gently back until your ears are closer to alignment with your shoulders. Keep your chin neutral and consider raising the screen toward eye level."

### Slouching

"Sit back into the chair, lengthen your spine and relax your shoulders. Keep both feet supported and bring the screen to a comfortable viewing height."

### Leaning Left / Right

"Return your torso toward the center of the chair, keep your weight evenly distributed and level your shoulders."

### Too Close / Forward Lean

"Move slightly away from the screen, keep your back supported and maintain a comfortable viewing distance."

### Excessive Lean Back

"Bring your torso toward a neutral upright position while keeping your back supported."

Centralize these recommendations in one service/configuration file.

Do not scatter text across components.

Show a small disclaimer:

"Ergonomic guidance only; this application is not a medical diagnostic device."

---

# 15. NOTIFICATIONS WHEN USER IS USING ANOTHER APP

This requirement is essential.

Do not attempt to inject HTML into another application.

The desired behavior is an operating-system-level toast/slide notification displayed over the currently active application.

Use the local Python notification manager.

The supplied code uses `plyer.notification`; retain the concept but make it robust and non-blocking.

Notifications must not block computer-vision inference.

Run notification delivery asynchronously if necessary.

If the website is currently visible/focused:

- show a professional in-app slide-in toast/panel
- show posture name
- show correction suggestion
- show bad-duration information

If the website is minimized or the user is working in another application:

- send a native OS notification through Python

The React client should send browser visibility/focus state to the vision service so it can avoid unnecessary duplicate notifications.

Handle:

- `visibilitychange`
- window focus
- window blur

The primary bad-posture notification should be silent/non-disturbing to match the approved FYP requirements.

Do not spam.

A notification failure must never crash posture tracking.

---

# 16. TRACK POSTURE PAGE UI

Make this page look like a polished AI monitoring application.

It should contain:

- tracking status
- webcam/pose preview if appropriate
- skeleton overlay
- calibration indicator
- current posture: Good / Bad
- bad posture category
- live timer
- current ergonomic suggestion
- real-time line graph
- Recalibrate button
- Stop Tracking button
- webcam/system-health message

Use visual indicators such as:

GOOD

BAD — Forward Head

CALIBRATING

POSE NOT VISIBLE

Do not rely only on color; include text/icons for accessibility.

---

# 17. REAL-TIME POSTURE LINE GRAPH

The documentation specifically requires a real-time simple line graph.

Implement it.

A useful approach is a `postureScore` from 0–100 derived from normalized posture deviations.

Example meaning:

- high score = close to calibrated alignment
- lower score = larger deviation

Do not let this visualization replace the deterministic posture classification.

Graph requirements:

- X axis = elapsed tracking time
- Y axis = posture score
- append new values in real time
- do not allow infinite browser memory growth
- maintain a reasonable rolling viewport/downsampling strategy
- clearly indicate current posture state
- responsive display

The graph should continue receiving data while the Track page is active.

---

# 18. STOP TRACKING

When user clicks Stop Tracking:

1. stop webcam safely
2. finalize the active posture segment
3. stop inference loop
4. stop alert timers
5. calculate final statistics
6. send/finalize data through Express
7. set session status to completed
8. update daily history aggregate
9. close live WebSocket safely
10. return user to a session summary or dashboard

Do not lose the final few seconds of data.

Handle duplicate Stop requests idempotently.

---

# 19. DATABASE STRATEGY — DO NOT WRITE EVERY FRAME

Do not insert every webcam frame or every inference result into MongoDB.

That would be inefficient and unnecessary.

Use event/segment-based storage plus periodic checkpoints.

Persist:

- session start immediately
- posture state transitions
- important classification changes
- alerts
- approximately every 15–30 seconds as a recovery checkpoint
- session end/finalization

This satisfies real-time persistence without abusing MongoDB.

If the application crashes, the latest checkpoint should significantly reduce data loss.

---

# 20. MONGODB MODELS

Implement clean Mongoose models.

## User

Include:

- `_id`
- username
- email
- passwordHash
- createdAt
- updatedAt

Never return passwordHash to frontend.

## PostureSession / PostureTracker

Include:

- userId
- startedAt
- endedAt
- status: active/completed/interrupted
- modelUsed
- calibrationCompleted
- monitoringDurationSeconds
- goodDurationSeconds
- badDurationSeconds
- unobservedDurationSeconds
- dominantBadPosture
- postureTypeDurations
- alertCount
- createdAt
- updatedAt

## PostureSegment

Include:

- userId
- sessionId
- state
- postureTypes[]
- startedAt
- endedAt
- durationSeconds
- averageConfidence
- optional summarized metrics

Do not store raw frames.

## Alert

Include:

- userId
- sessionId
- timestamp
- postureTypes[]
- message
- suggestion
- badDurationAtAlertSeconds
- repeatNumber

## PostureHistory

Maintain one daily aggregate per user/date.

Include:

- userId
- localDate
- monitoringDurationSeconds
- goodDurationSeconds
- badDurationSeconds
- postureTypeDurations
- postureTypes[]
- badPosturePercentage
- goodPosturePercentage
- mostFrequentBadPosture

Use a unique compound index for `userId + localDate`.

## PostureReport

A weekly report can be calculated from PostureHistory.

For compatibility with the project domain model, a generated report can also be saved/upserted as a snapshot containing:

- userId
- fromDate
- toDate
- generatedAt
- totalMonitoringDurationSeconds
- totalBadDurationSeconds
- totalGoodDurationSeconds
- badPosturePercentage
- goodPosturePercentage
- mostFrequentBadPosture

Avoid duplicate stale reports.

---

# 21. TIME HANDLING

Store timestamps in UTC.

Display dates/times in the user's local timezone.

Never store formatted strings such as `"1h 52min"` as the source of truth.

Store integer seconds.

Create one shared formatter.

History durations must show seconds, for example:

- `01:52:14`
- `00:50:37`
- `02:00:00`

Percentages can display up to 1–2 decimal places.

Ensure:

`Good % + Bad % = approximately 100%`

for observed monitoring time.

---

# 22. HISTORY USE CASE

The History page must be significantly more professional than the original mockup while preserving its required fields.

Required table columns:

1. Date
2. Monitoring Duration
3. Posture Types
4. Bad Posture Duration
5. Bad Posture %
6. Good Posture %

Posture Types should contain detected bad-posture categories such as:

- Slouching
- Forward Head
- Leaning Left
- Leaning Right

If several were detected, show a concise list.

## Default range

Show only **7 days at a time**, including the current day in the newest window.

Use the current rolling window:

`today - 6 days → today`

for the default history view.

Previous week shows the previous 7-day window.

Never load the entire history table at once.

## Navigation

Provide:

- Previous Week
- Next Week
- Month/date navigation
- visible From date
- visible To date

The month selector is only navigation.

Do NOT turn this into a monthly-report use case.

## Disable invalid navigation

Get available data range from backend.

If user has never tracked posture:

- disable Previous
- disable Next
- disable date/month controls
- display a professional empty state:

"No posture history yet. Start your first tracking session to begin building your history."

If first available data is 10 August:

- do not permit navigating to July
- disable dates/windows entirely before the first available record

Never allow dates after today.

Disable Next when current 7-day window is displayed.

Disable months/date ranges that cannot contain valid data.

Do not merely show an API error after clicking an invalid date; prevent the invalid selection in the UI.

## Missing days

Within a valid 7-day window, if a particular day has no tracking session, show that date clearly as:

"No monitoring data"

instead of pretending data exists.

Provide Current Day and Weekly modes if useful to remain compatible with the approved interface/use-case text, but the professional default should be the 7-day history view.

---

# 23. WEEKLY REPORT USE CASE

Reports are **weekly only** for the approved FYP scope.

Do not implement a monthly report simply because month navigation exists.

Default report range:

`today - 6 days → today`

so the current day is included.

Allow navigation to previous valid 7-day ranges.

Include:

- From date
- To date
- Total Monitoring Duration
- Total Bad Posture Duration
- Bad Posture %
- Good Posture %
- Most Frequent Bad Posture

Also internally calculate Good Posture Duration even if the original visual mockup does not make it the primary displayed field.

All durations must include seconds.

Example:

`Total Monitoring Duration: 08:31:42`

## Calculations

`totalMonitoring = totalGood + totalBad`

`badPercentage = totalBad / totalMonitoring × 100`

`goodPercentage = totalGood / totalMonitoring × 100`

Most Frequent Bad Posture must mean the bad-posture category with the greatest accumulated duration, NOT simply the category with the highest number of event rows.

## Report eligibility

The approved requirements state that insufficient data should prevent a weekly report.

Use a professional interpretation:

Before the account has accumulated a seven-day history span from its first recorded date, the Report page shows:

"Not sufficient data to generate a weekly report. A weekly report becomes available after seven days of posture history."

Disable Generate when not eligible.

After the account becomes eligible, allow the current rolling 7-day report even if the present day's data is partial.

Do not allow:

- future ranges
- ranges completely before the user's first available history

Provide clear disabled-state tooltips/messages.

---

# 24. REPORT DESIGN

Reproduce the information from the approved mockup but upgrade its visual quality.

Use a clean report card.

Top-right:

From: dd-mm-yyyy
To: dd-mm-yyyy

Body:

Total Monitoring Duration
Total Bad Posture Duration
Bad Posture %
Good Posture %
Most Frequent Bad Posture

Use good spacing, clear hierarchy, professional typography and print-friendly layout.

Do not add meaningless charts simply to make the page look busy.

---

# 25. TRACKING API

Create REST APIs approximately equivalent to:

## Authentication

`POST /api/auth/signup`

`POST /api/auth/login`

`POST /api/auth/logout`

`GET /api/auth/me`

## Tracking

`POST /api/tracking/sessions`

Create authenticated active tracking session.

`POST /api/tracking/sessions/:sessionId/stop`

Finalize session.

`GET /api/tracking/sessions/:sessionId`

Get session status.

`POST /api/internal/tracking/:sessionId/event`

Authenticated endpoint used by Python service for state transitions/checkpoints.

Protect internal endpoints with a short-lived signed tracking token created when the tracking session begins.

Do not expose a permanent internal secret to the React bundle.

## History

`GET /api/history/range`

Return:

- hasData
- firstDataDate
- lastDataDate
- reportEligibleDate

`GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

Validate maximum 7-day range.

## Reports

`POST /api/reports/weekly`

or an equivalent clean API.

Validate requested range server-side even if frontend controls are disabled.

Never trust client dates.

---

# 26. PYTHON VISION-SERVICE API

Implement endpoints such as:

`GET /health`

`GET /status`

`POST /tracking/start`

`POST /tracking/stop`

`POST /tracking/recalibrate`

WebSocket:

`/ws/telemetry`

Start request receives:

- sessionId
- short-lived tracking token
- authenticated backend event URL/configuration

Prevent two simultaneous tracking sessions from taking ownership of the same webcam.

Return clear errors such as:

- camera unavailable
- camera already in use
- model failed to load
- tracking already active
- invalid token

---

# 27. LIVE TELEMETRY SCHEMA

Send lightweight structured messages rather than webcam frames wherever possible.

Example fields:

- timestamp
- state
- postureScore
- postureTypes
- suggestion
- badDurationSeconds
- sessionElapsedSeconds
- landmarkConfidence
- current deviations
- calibration status
- camera status

If frontend displays skeleton overlay, send normalized landmarks rather than encoding entire JPEG frames unless absolutely necessary.

Keep local bandwidth and CPU usage reasonable.

---

# 28. DATA CONSISTENCY

Posture duration logic must not rely solely on frontend timers.

Python/backend timestamps are authoritative.

Frontend timers are display-only.

On every state transition:

1. close previous segment
2. calculate exact elapsed seconds
3. start new segment

When session stops:

- close active segment
- recalculate/validate totals
- ensure no negative duration
- ensure segments do not overlap
- ensure good + bad equals observed monitoring duration
- update daily aggregates

Sessions crossing midnight must correctly split contributions into separate local calendar days.

This is important for accurate History and Reports.

---

# 29. DAILY AUTOMATIC BACKUP

The approved requirements include automatic backup every 24 hours.

Implement a simple FYP-appropriate daily backup job in the Node backend.

Back up critical collections such as:

- users excluding passwordHash where appropriate for human-readable export
- posture sessions
- daily posture history
- reports
- alerts

Prefer a machine-restorable JSON backup, optionally gzip-compressed.

Do not expose backup controls as another primary use case.

Log:

- backup start
- success
- failure
- output location
- timestamp

Keep secrets/password hashes out of any casual CSV/human-readable backup.

Also provide a manual backup script for demonstration/testing.

---

# 30. MODEL EVALUATION — CRITICAL FOR FYP/VIVA

Do not claim "99% accuracy" without actual measured evidence.

Create an `/evaluation` section/tooling.

Pose-estimation model evaluation and final posture-classification evaluation are separate problems.

## Pose landmark model

Document why MediaPipe Heavy was chosen.

Benchmark available model variants on the actual FYP laptop if possible:

- Heavy
- Full
- Lite

Measure:

- average inference latency
- FPS
- dropped frames

Use published pose-model metrics only as reference.

Do not invent ROC-AUC for the MediaPipe landmark model.

## FYP posture classifier

For the system's final GOOD/BAD classification, create an evaluation pipeline that can calculate:

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix
- ROC-AUC for binary GOOD vs BAD, where probability/continuous score is available

For posture subtype classification calculate:

- per-class precision
- per-class recall
- per-class F1
- macro F1
- confusion matrix

Create a labeled validation manifest format for:

- Good
- Slouching
- Forward Head
- Leaning Left
- Leaning Right
- other supported category

Do not fabricate a dataset.

If no real labeled dataset has been supplied, provide the evaluation scripts and a clear data-collection protocol, then leave real evaluation results pending until actual samples are collected.

The README must clearly distinguish:

1. official pose-model benchmark
2. our FYP's own posture-classification evaluation

This distinction is valuable for the viva.

---

# 31. IMPROVE THE PROVIDED POSE CODE

Refactor and retain the useful concepts from the supplied implementation:

- Heavy model auto-download or controlled model setup
- asynchronous notification manager
- baseline calibration
- shoulder tilt
- relative geometry
- face scale
- persistence
- cooldown
- visual skeleton
- recalibration

But change the following:

## Current 1.5-second alert logic

1.5 seconds may be used for smoothing/confirming the visible classification.

It must NOT trigger the actual ergonomic alert.

Actual alert:

**60 seconds continuous bad posture**

Repeated:

**every 120 seconds while still bad**

## Bad head landmark assumption

Verify pose indices and remove the invalid "forehead = landmark 10" assumption.

## Use additional torso geometry

Use hips when sufficiently visible.

## Use visibility

Do not trust landmarks with poor visibility/presence.

## Use world coordinates when beneficial

2D alone can be sensitive to camera placement.

Use 3D/world landmark information where it improves robustness, while retaining normalized 2D fallback.

## Improve calibration

Use more than two seconds if necessary.

Reject unstable calibration samples.

---

# 32. USER EXPERIENCE DURING TRACKING

User must always know whether monitoring is actually running.

Show persistent indicator:

"Posture monitoring active"

When browser is minimized, Python service continues.

When user returns to site, reconnect UI telemetry without creating another tracking session.

If React WebSocket disconnects temporarily:

- Python monitoring must not immediately crash
- backend checkpoints continue
- reconnect with backoff
- UI restores current state after reconnection

If Python service is not running:

Display:

"Posture Engine is not running."

Then provide exact local startup instructions instead of failing silently.

---

# 33. CAMERA PRIVACY

Show a clear first-use explanation:

"The camera is used locally for real-time posture analysis. Raw video is not stored."

Do not secretly activate the camera before user clicks Track Posture.

Turn camera off immediately when tracking stops.

Show camera errors professionally.

---

# 34. NAVIGATION

Create a professional authenticated app shell.

Suggested navigation:

- Dashboard
- Track Posture
- History
- Report
- Logout

Active route must be obvious.

Browser Back/Forward should work correctly.

Protected route guards must work after page refresh.

No dead-end screens.

Every feature page should provide an intuitive path back to Dashboard.

Do not use separate random "Home" buttons on every screen if a consistent app navigation bar/sidebar solves the problem better.

---

# 35. VISUAL DESIGN

Modernize the original purple/light interface rather than copying it literally.

The result should feel like a polished health/ergonomic productivity application.

Use:

- light neutral backgrounds
- restrained purple/indigo accent based on documentation
- clean cards
- clear status colors
- consistent spacing
- responsive laptop layout
- readable typography
- subtle animations only
- slide-in alerts
- skeleton/camera overlay
- good empty states
- accessible contrast

Avoid:

- excessive gradients
- gaming-style graphics
- giant animations
- unnecessary glassmorphism
- fake statistics
- dashboard clutter

This is an academic FYP, not a marketing landing page.

---

# 36. ERROR HANDLING

Handle at minimum:

- MongoDB disconnected
- Express unavailable
- Python service unavailable
- webcam denied
- webcam disconnected
- webcam already in use
- model file missing
- model download failure
- no person detected
- poor landmark confidence
- duplicate signup
- invalid login
- expired session
- WebSocket disconnect
- invalid date range
- no history data
- report not eligible
- backup failure
- duplicate Stop Tracking
- active session after crash/restart

Do not display raw stack traces to the user.

Log useful developer errors server-side.

---

# 37. SECURITY

Implement reasonable FYP-grade professional security:

- Helmet
- exact CORS origins
- secure session cookies
- server-side authorization
- request validation
- sanitized inputs
- authentication rate limiting
- generic login failure messages
- password hashing
- `.env`
- `.env.example`
- no committed secrets
- no database credentials in frontend
- internal Python event authentication
- maximum request body sizes
- safe error handling

Use current Express security practices.

---

# 38. TESTING

Testing is part of completion, not optional.

Implement automated tests where practical.

## Auth tests

Signup:

- valid signup
- duplicate username
- duplicate email
- invalid email
- weak/missing password
- missing fields

Login:

- correct credentials
- wrong credentials
- missing fields
- protected route without authentication

Logout:

- confirmation UI behavior
- server session destroyed
- protected route inaccessible after logout

## Tracking unit tests

Python tests for:

- angle calculations
- normalization
- baseline calculations
- posture decision logic
- state transitions
- 60-second alert threshold
- 120-second repeat cooldown
- correction reset
- missing landmarks
- low-confidence landmarks
- recalibration

Do not require a real webcam for unit tests.

Use recorded/synthetic landmark sequences for logic tests.

## Tracking integration test

Verify:

Track Posture → calibration → BAD persists for threshold → alert produced → recommendation produced → GOOD → timer reset → Stop → session saved.

## History tests

Verify:

- 7-day range
- seconds are correct
- percentages correct
- first data boundary
- future dates disabled/rejected
- empty user
- missing day
- month/week navigation

## Report tests

Verify:

- correct From/To
- correct total monitoring
- correct bad duration
- correct percentages
- correct most frequent posture by accumulated time
- insufficient-data rule
- invalid future week

---

# 39. ACCEPTANCE TESTS FROM APPROVED FYP

The completed implementation must satisfy these six demonstration scenarios:

## TC1 Signup

User supplies valid signup information.

Expected:

account created → Dashboard shown.

## TC2 Login

Existing user enters correct credentials.

Expected:

successful login → Dashboard shown.

## TC3 Track Posture

Authenticated user starts tracking and webcam works.

User remains in bad posture for one minute.

Expected:

bad posture detected → alert shown → ergonomic recommendation shown.

## TC4 Generate Weekly Posture Report

Eligible authenticated user selects an available week.

Expected:

weekly report displays correct total monitoring duration, total bad duration, bad percentage and most frequent bad posture.

## TC5 View History

Authenticated user with recorded data opens History.

Expected:

current/weekly posture history displays correct good/bad information.

## TC6 Logout

Authenticated user requests logout and confirms.

Expected:

session destroyed → Login/Signup shown.

Do not declare the project complete until these end-to-end scenarios pass.

---

# 40. PERFORMANCE

The computer-vision loop must not freeze the React UI or Express server.

Use:

- dedicated Python process
- asynchronous inference where suitable
- frame skipping/backpressure
- bounded queues
- smoothing rather than excessive frame rate
- minimal database writes
- WebSocket telemetry rather than REST request per frame

If the model is busy, drop obsolete frames instead of processing an old queue.

For posture monitoring, the newest frame is more valuable than stale queued frames.

---

# 41. FINAL REPORT/HISTORY CALCULATION QUALITY

Use one centralized backend aggregation service for all calculations.

Do not calculate one percentage differently on Dashboard, History and Report.

Create shared calculation logic.

Round only for presentation.

Use raw seconds internally.

Unit test all aggregation.

---

# 42. PROFESSIONAL CODE QUALITY

Use:

- clear naming
- small services
- separation of concerns
- type definitions
- meaningful comments
- no giant 2,000-line components
- no duplicated posture threshold logic
- no duplicated date calculations
- central config
- centralized API client
- centralized error handling
- proper cleanup
- dependency injection where it meaningfully improves testability

Avoid unnecessary enterprise complexity.

The code must remain understandable for an FYP viva.

---

# 43. DOCUMENTATION

Create/update:

## README.md

Explain:

- project purpose
- architecture
- six use cases
- technology stack
- installation
- startup
- environment variables
- MongoDB
- Python environment
- MediaPipe model
- notifications
- testing
- troubleshooting

## ARCHITECTURE.md

Explain:

React → Express → MongoDB

React → Python AI service

Python → Express tracking events

Python → OS notification

## POSTURE\_ALGORITHM.md

Explain:

- landmarks
- calibration
- normalized features
- classification
- smoothing
- alert threshold
- recommendations
- limitations

This document is important for viva preparation.

## MODEL\_EVALUATION.md

Explain:

- why Heavy chosen
- Heavy/Full/Lite benchmark distinction
- runtime benchmark
- FYP classification evaluation
- Accuracy
- Precision
- Recall
- F1
- ROC-AUC
- dataset/validation protocol
- no fabricated values

## API.md

Document main API endpoints.

---

# 44. DO NOT OVERCLAIM AI CAPABILITIES

This system is an AI-enabled posture coaching FYP.

Do not describe it as:

- a medical diagnosis system
- injury prevention guarantee
- spinal disease detector
- physiotherapy replacement

Use wording such as:

"posture classification"

"ergonomic recommendation"

"posture coaching"

"computer-vision based posture monitoring"

---

# 45. IMPLEMENTATION ORDER

Execute the implementation in this dependency order:

1. Repository audit and architecture
2. MongoDB models and Express base
3. Signup/Login/session authentication
4. Protected React application shell and Dashboard
5. Python vision service
6. MediaPipe Heavy integration
7. calibration and posture classifier
8. tracking state machine
9. Python ↔ Express persistence
10. Python ↔ React telemetry
11. live Tracking UI and graph
12. native + in-app alerts
13. ergonomic recommendation engine
14. Stop/finalize logic
15. daily aggregates
16. History
17. weekly Report
18. date-range disabling
19. daily backup
20. automated tests
21. performance/error handling
22. documentation
23. final end-to-end testing

Do not work on Report before tracking data is trustworthy.

---

# 46. REQUIRED FINAL VERIFICATION

Before claiming completion, run the project yourself.

Verify:

### Authentication

- signup works
- duplicate handling works
- login works
- invalid login works
- refresh preserves authenticated session
- logout works
- protected routes work

### Tracking

- Track Posture opens webcam
- calibration completes
- Heavy model loads
- skeleton landmarks work
- good posture works
- forward head works
- slouching works
- side leaning works
- visual status does not flicker rapidly
- bad timer works
- alert does NOT appear prematurely
- alert appears after configured 60-second threshold
- repeat behavior is 120 seconds
- correction resets timer
- in-app alert works
- minimized/browser-unfocused native notification works
- Recalibrate works
- Stop Tracking works
- webcam releases

### Persistence

- active session saved
- state segments saved
- checkpoint works
- final seconds are not lost
- daily history correct

### History

- correct six columns
- durations include seconds
- current 7-day range
- previous range
- next disabled at present
- pre-first-data range disabled
- future range disabled
- no-data user handled

### Report

- weekly range correct
- current day included
- total monitoring correct
- total bad duration correct
- percentages correct
- most frequent bad posture correct
- insufficient-data state correct
- past valid reports selectable

### Background behavior

Explicitly test:

1. Start tracking.
2. Keep Python service active.
3. Minimize the FYP browser.
4. Open another application such as VS Code or Word.
5. Sit in a reliably detected bad posture.
6. Maintain the posture for the configured threshold.
7. Confirm a native slide/toast notification appears over the current application.
8. Confirm recommendation identifies the actual bad-posture category.
9. Return to the website.
10. Confirm the tracking session remained active and accumulated time correctly.

This is a mandatory acceptance test.

---

# 47. DEVELOPMENT-ONLY THRESHOLD

Production/FYP behavior must remain:

`BAD_ALERT_THRESHOLD_SECONDS = 60`

`BAD_ALERT_REPEAT_SECONDS = 120`

For developer testing, allow environment/config overrides such as:

`BAD_ALERT_THRESHOLD_SECONDS=5`

so automated/manual tests do not require waiting one minute.

Never hardcode the testing threshold into production behavior.

Display/log when development override is being used.

---

# 48. DEFINITION OF DONE

The project is NOT done when:

- pages merely exist
- buttons only navigate
- dummy graph moves
- mock posture data is displayed
- notifications are simulated
- history uses hard-coded data
- report uses random percentages
- Python works only as an isolated script
- webcam stops when switching tabs
- MongoDB does not contain real session data
- authentication is insecure
- tests are not run

The project is complete only when the MERN web application, Python vision engine, MongoDB persistence, posture classification, ergonomic recommendations, desktop alerts, History, weekly Report, authentication and all six documented use cases work together as one integrated system.

---

# 49. FINAL DELIVERY FORMAT

After implementation, return a concise engineering completion report containing:

## Implemented

What was completed.

## Architecture

Actual final architecture.

## Files Changed

Major files/folders added or changed.

## Pose Detection

Actual implemented posture logic.

## Database

Collections/models and indexes.

## Notifications

How foreground and cross-application notifications work.

## Testing

Commands executed and actual results.

## Model Evaluation

What was actually measured and what still requires real validation data.

## How to Run

Exact commands.

## Remaining Limitations

Only genuine limitations.

Do not claim anything passed unless you actually tested it.

---

# MOST IMPORTANT INSTRUCTION

Treat this as a university Final Year Project that must survive a live demonstration and technical viva.

Optimize for:

**Correctness → reliability → explainability → accuracy → clean architecture → professional UI**

rather than unnecessary feature count.

Preserve the six approved use cases.

Use MediaPipe Heavy + Python as the primary computer-vision engine.

Use MERN for the web application and business/data layer.

Implement real native cross-application bad-posture alerts.

Store accurate posture durations in MongoDB.

Generate History and Weekly Reports from actual recorded statistics.

Do not fabricate AI evaluation results.

Do not finish until the complete integrated application works.