# Posture Detection Algorithm

## Overview

The posture detection system uses **MediaPipe Pose Landmarker (BlazePose GHUM Heavy)** to detect 33 body landmarks from webcam frames, then applies a deterministic rule-based classifier to categorize posture relative to a personalized calibrated baseline.

## MediaPipe Landmarks Used

| Landmark | Index | Purpose |
|----------|-------|---------|
| Nose | 0 | Head vertical/horizontal position |
| Left Eye | 2 | Face scale reference |
| Right Eye | 5 | Face scale reference |
| Left Ear | 7 | Head forward displacement |
| Right Ear | 8 | Head forward displacement |
| Left Shoulder | 11 | Shoulder geometry, tilt |
| Right Shoulder | 12 | Shoulder geometry, tilt |
| Left Hip | 23 | Torso geometry (when visible) |
| Right Hip | 24 | Torso geometry (when visible) |

> **Note:** Landmark 10 (Mouth Right) was incorrectly labeled as "forehead" in an early reference implementation. This has been corrected.

## Calibration

At tracking start, the user sits in their normal comfortable working posture for ~4 seconds while the system collects baseline measurements.

**Process:**
1. Collect feature samples at ~15 FPS for 4 seconds
2. Reject samples with landmark confidence < 0.6
3. Require minimum 20 good samples
4. Apply trimmed median (remove top/bottom 10%) for each feature
5. Store baseline values for the session

**Baseline features:**
- Shoulder width (normalization reference)
- Shoulder tilt angle (degrees)
- Head forward displacement (normalized)
- Ear-to-shoulder ratio
- Head horizontal offset
- Face scale (eye distance / shoulder width)
- Torso compression (when hips visible)
- Torso lean
- Nose-shoulder vertical distance
- World coordinate head forward displacement

## Feature Normalization

All features are normalized relative to the user's shoulder width to ensure consistency across different:
- Camera distances
- Body sizes
- Webcam positions

This avoids fixed pixel thresholds that would break with different setups.

## Classification Rules

Each frame, the system computes deviations from the calibrated baseline and applies EMA smoothing (α=0.3) before classification:

### Forward Head
Triggered when ear-shoulder displacement or head forward displacement exceeds threshold (0.12 × shoulder width) relative to baseline. Also uses 3D world coordinates when available.

### Slouching
Requires multiple concurrent signals (≥2 of 3):
- Torso compression change > threshold
- Nose vertical drop > threshold
- Head forward displacement > threshold × 0.8

### Leaning Left / Right
Combines head horizontal offset and torso lean. Triggered when average exceeds 0.08 × shoulder width.

### Shoulder Tilt
Triggered when shoulder angle exceeds 8° from calibrated baseline.

### Too Close / Leaning Back
Based on face scale change relative to baseline:
- Increased scale → too close
- Decreased scale → leaning back

## Smoothing & Hysteresis

- **EMA (Exponential Moving Average):** α=0.3, smooths all feature deviations
- **State Persistence:** 1.5 seconds of stable evidence required before visual classification changes
- **Confidence Threshold:** Landmarks below 0.5 visibility are not trusted
- **Unobserved State:** Missing landmarks never classified as bad posture

## State Machine

```
CALIBRATING → GOOD → BAD_PENDING → BAD_CONFIRMED
                ↑          ↑              │
                └──────────┴──────────────┘
                        (correction)

Any state → UNOBSERVED (person leaves / landmarks lost)
UNOBSERVED → GOOD/BAD (person returns)
```

### Alert Timing
- **1.5 seconds:** Visual classification changes (BAD_PENDING)
- **60 seconds continuous:** First alert generated (BAD_CONFIRMED)
- **Every 120 seconds:** Repeat alert while still bad
- **Correction to good:** All timers reset

## Posture Score

A continuous 0-100 score derived from total normalized deviations:
- 100 = perfectly aligned with calibrated baseline
- Lower = greater deviation
- Used for the real-time line graph visualization
- Does NOT replace the deterministic GOOD/BAD classification

## Limitations

1. **Camera angle sensitivity:** System works best with a front-facing laptop camera
2. **Lighting conditions:** Poor lighting reduces landmark detection confidence
3. **Partial occlusion:** Arms crossing body or objects blocking view reduce accuracy
4. **Lower body:** Hip landmarks are less reliable when seated, especially with desk occlusion
5. **Threshold sensitivity:** Fixed thresholds may need adjustment for extreme body proportions
6. **Single person:** System detects only one person at a time
