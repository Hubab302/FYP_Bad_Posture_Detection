# Model Evaluation

## Distinction Between Two Evaluations

This project involves two separate evaluation concerns:

### 1. Pose Landmark Model (MediaPipe)
The pose estimation model that detects body landmarks from webcam frames.

### 2. FYP Posture Classifier
Our rule-based system that classifies GOOD vs BAD posture from the detected landmarks.

---

## Pose Landmark Model Selection

**Chosen Model:** MediaPipe Pose Landmarker — BlazePose GHUM Heavy (float16)

### Why Heavy?

| Model | Parameters | Accuracy | Latency | Use Case |
|-------|-----------|----------|---------|----------|
| Lite | Smallest | Lower | ~5ms | Mobile/real-time on weak devices |
| Full | Medium | Good | ~15ms | Balanced |
| **Heavy** | **Largest** | **Highest** | **~30ms** | **Desktop/laptop — best accuracy** |

Heavy was chosen because:
1. FYP runs on a laptop (sufficient compute)
2. Posture detection accuracy is the primary goal
3. ~30ms latency at 640×480 is acceptable for 15 FPS
4. Higher landmark confidence improves classification reliability

### Fallback
If Heavy proves too slow on the target laptop, set `MODEL_COMPLEXITY=full` in environment variables. The system logs which model is active.

### Published Metrics (MediaPipe official)
- Heavy model achieves highest landmark accuracy among the three variants
- Specific benchmark numbers: refer to MediaPipe documentation
- We do not fabricate specific accuracy numbers

---

## FYP Posture Classifier Evaluation

### Evaluation Framework

The project includes an evaluation framework for measuring classifier performance, but **real evaluation requires a labeled validation dataset**.

### Metrics to Evaluate

**Binary (GOOD vs BAD):**
- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC (using postureScore as continuous variable)

**Multi-class (posture subtypes):**
- Per-class Precision, Recall, F1
- Macro F1
- Confusion Matrix

### Validation Protocol

1. **Data Collection:**
   - Record sessions with known posture states
   - Use the evaluation manifest format (JSON):
     ```json
     {
       "frames": [
         {"timestamp": 0.0, "label": "Good"},
         {"timestamp": 1.0, "label": "Slouching"},
         {"timestamp": 2.0, "label": "Forward Head"}
       ]
     }
     ```

2. **Labeling:**
   - Each frame labeled with ground-truth posture type
   - Categories: Good, Slouching, Forward Head, Leaning Left, Leaning Right, Leaning Back, Shoulder Tilt

3. **Evaluation:**
   - Run classifier on recorded landmark sequences
   - Compare predictions against ground truth
   - Calculate all metrics

### Current Status

⚠️ **No real labeled dataset has been supplied.** The evaluation scripts and protocol are provided, but actual evaluation results require collecting and labeling real posture data.

This is explicitly stated to avoid fabricating results.

---

## Runtime Benchmark

To benchmark on your laptop:

```bash
cd vision-service
python -c "
from pose_model import PoseModel
import time, cv2, numpy as np
model = PoseModel('heavy')
model.initialize()
frame = np.zeros((480, 640, 3), dtype=np.uint8)
times = []
for i in range(100):
    start = time.time()
    model.detect(frame)
    times.append(time.time() - start)
print(f'Average: {sum(times)/len(times)*1000:.1f}ms')
print(f'FPS: {1/(sum(times)/len(times)):.1f}')
"
```

Results will vary by laptop hardware.
