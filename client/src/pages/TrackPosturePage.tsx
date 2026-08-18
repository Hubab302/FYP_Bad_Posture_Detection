import { useState, useEffect, useRef, useCallback } from 'react';
import { trackingApi } from '../services/api';
import { formatDuration } from '../services/formatters';
import Toast from '../components/Toast';
import { Activity, Clock, AlertTriangle, Loader2 } from 'lucide-react';

// ─── Types ───
type TrackingState =
  | 'IDLE'
  | 'STARTING_CAMERA'
  | 'CALIBRATING'
  | 'READY'
  | 'TRACKING'
  | 'RECALIBRATING'
  | 'STOPPING'
  | 'CAMERA_UNAVAILABLE'
  | 'ENGINE_UNAVAILABLE'
  | 'ERROR';

interface TelemetryData {
  state: string;
  postureScore: number;
  postureTypes: string[];
  suggestion: string;
  badStreakSeconds: number;
  sessionElapsedSeconds: number;
  goodSeconds: number;
  badSeconds: number;
  landmarkConfidence: number;
  calibrationStatus: string;
  calibrationProgress?: number;
  cameraStatus: string;
  alertTriggered?: boolean;
  alertMessage?: string;
  alertSuggestion?: string;
  alertPostureTypes?: string[];
}

// ─── Constants ───
const VISION_SERVICE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/telemetry';

// ─── Suggestion Mapping ───
function getSuggestionForState(
  trackingState: TrackingState,
  postureState: string,
  liveSuggestion: string
): string {
  if (trackingState === 'IDLE' || trackingState === 'STOPPING')
    return 'No suggestion yet. Start tracking to receive posture guidance.';
  if (trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING')
    return 'Sit upright and face the camera.';
  if (trackingState === 'READY')
    return 'Baseline ready. Start tracking when you are comfortable.';
  if (trackingState === 'CAMERA_UNAVAILABLE')
    return 'Camera is unavailable. Check your webcam.';
  if (trackingState === 'ENGINE_UNAVAILABLE')
    return 'Vision service is offline.';

  // During TRACKING
  if (postureState === 'UNOBSERVED')
    return 'Make sure your upper body is visible.';
  if (postureState === 'GOOD')
    return 'Keep this position.';
  if (liveSuggestion) return liveSuggestion;

  return 'Monitoring your posture.';
}

// ─── Posture Label Mapping ───
function getPostureLabel(trackingState: TrackingState, postureState: string, postureTypes: string[]): string {
  if (trackingState === 'IDLE' || trackingState === 'STOPPING') return 'Not Tracking';
  if (trackingState === 'CALIBRATING') return 'Calibrating Baseline';
  if (trackingState === 'RECALIBRATING') return 'Recalibrating Baseline';
  if (trackingState === 'READY') return 'Ready to Start';
  if (trackingState === 'CAMERA_UNAVAILABLE') return 'Camera Unavailable';
  if (trackingState === 'ENGINE_UNAVAILABLE') return 'Service Offline';

  switch (postureState) {
    case 'GOOD': return 'Good Posture';
    case 'BAD_PENDING':
    case 'BAD_CONFIRMED': return postureTypes.length > 0 ? postureTypes.join(', ') : 'Bad Posture';
    case 'UNOBSERVED': return 'Pose Not Visible';
    case 'CALIBRATING': return 'Calibrating Baseline';
    case 'READY_TO_START': return 'Ready to Start';
    default: return 'Monitoring';
  }
}

function getPostureColor(trackingState: TrackingState, postureState: string): string {
  const NEUTRAL = '#94a3b8';
  if (trackingState === 'IDLE' || trackingState === 'STOPPING') return NEUTRAL;
  if (trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING') return 'var(--warning)';
  if (trackingState === 'READY') return NEUTRAL;
  if (trackingState === 'CAMERA_UNAVAILABLE' || trackingState === 'ENGINE_UNAVAILABLE') return NEUTRAL;

  switch (postureState) {
    case 'GOOD': return 'var(--success)';
    case 'BAD_PENDING':
    case 'BAD_CONFIRMED': return 'var(--danger)';
    case 'UNOBSERVED': return NEUTRAL;
    default: return NEUTRAL;
  }
}

// ─── Component ───
export default function TrackPosturePage() {
  console.log("TRACK_POSTURE_BUILD_CURRENT");
  // Authoritative UI state machine
  const [trackingState, setTrackingState] = useState<TrackingState>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cameraSessionKey, setCameraSessionKey] = useState<number>(Date.now());

  // Daily accumulated totals from backend (previous tracking periods today)
  const [dailyBaseMonitoring, setDailyBaseMonitoring] = useState(0);

  // Live telemetry from current tracking period
  const [postureState, setPostureState] = useState('');
  const [postureTypes, setPostureTypes] = useState<string[]>([]);
  const [liveSuggestion, setLiveSuggestion] = useState('');
  const [badStreakSeconds, setBadStreakSeconds] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; suggestion: string; postureType: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const toastIdRef = useRef(0);
  const cameraImgRef = useRef<HTMLImageElement | null>(null);

  // ─── Load today's accumulated monitoring on mount ───
  useEffect(() => {
    const init = async () => {
      // Check vision service status to recover background tracking
      try {
        const res = await fetch(`${VISION_SERVICE_URL}/status`);
        if (!res.ok) {
          setTrackingState('ENGINE_UNAVAILABLE');
          return;
        }
        const data = await res.json();
        
        if (data.tracking) {
          if (data.state === 'READY_TO_START') {
            setTrackingState('READY');
          } else if (data.state === 'CALIBRATING') {
            setTrackingState('CALIBRATING');
          } else {
            setTrackingState('TRACKING');
          }
          // Force a fresh preview connection when returning
          setCameraSessionKey(Date.now());
          connectWebSocket();
        }
      } catch {
        setTrackingState('ENGINE_UNAVAILABLE');
        return;
      }

      // Fetch today's accumulated totals
      try {
        const totals = await trackingApi.getDailyTotals();
        setDailyBaseMonitoring(totals.dailyMonitoringSeconds);
        if (totals.activeSessionId) {
          setSessionId(totals.activeSessionId);
        }
      } catch (err) {
        console.error('Failed to load daily totals:', err);
      }
    };
    init();
  }, []);

  // ─── Ref for authoritative unmount/visibility cancellation ───
  const trackingStateRef = useRef(trackingState);
  useEffect(() => {
    trackingStateRef.current = trackingState;
  }, [trackingState]);

  // ─── Visibility change for notifications & cancellation ───
  useEffect(() => {
    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'visibility',
          visible: isVisible,
          focused: document.hasFocus(),
        }));
      }

      // If active calibration is hidden, cancel it immediately.
      if (!isVisible) {
        const state = trackingStateRef.current;
        if (state === 'CALIBRATING' || state === 'RECALIBRATING' || state === 'STARTING_CAMERA') {
          // Force stop calibration, discard partial samples, return to IDLE
          stopTracking();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('blur', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
    };
  }, []);

  // ─── WebSocket Connection ───
  const connectWebSocket = useCallback((onConnected?: () => void) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'visibility',
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
      }));
      if (onConnected) onConnected();
    };

    ws.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);

        setPostureState(data.state || '');
        setPostureTypes(data.postureTypes || []);
        setLiveSuggestion(data.suggestion || '');
        setBadStreakSeconds(data.badStreakSeconds || 0);
        setSessionElapsedSeconds(data.sessionElapsedSeconds || 0);
        if (data.calibrationProgress !== undefined) {
          setCalibrationProgress(data.calibrationProgress);
        }

        // Derive tracking state from telemetry
        setTrackingState(prev => {
          if (data.state === 'STOPPED') return 'IDLE';
          if (data.state === 'CALIBRATING') {
            if (prev === 'STARTING_CAMERA' || prev === 'IDLE' || prev === 'ERROR') return 'CALIBRATING';
            return prev === 'TRACKING' || prev === 'RECALIBRATING' ? 'RECALIBRATING' : prev;
          }
          if (data.state === 'READY_TO_START' && prev !== 'TRACKING') return 'READY';
          if (['GOOD', 'BAD_PENDING', 'BAD_CONFIRMED', 'UNOBSERVED'].includes(data.state)) {
            if (prev === 'READY' || prev === 'TRACKING') return 'TRACKING';
          }
          return prev;
        });

        // Handle alerts
        if (data.alertTriggered) {
          const id = ++toastIdRef.current;
          setToasts([{
            id,
            message: data.alertMessage || 'Bad posture detected',
            suggestion: data.alertSuggestion || data.suggestion || '',
            postureType: (data.alertPostureTypes || data.postureTypes || []).join(', '),
          }]);
        } else if (data.state === 'GOOD') {
          setToasts([]);
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }, []);

  // ─── Cleanup on unmount (Navigation Cancellation) ───
  useEffect(() => {
    return () => {
      // If user leaves the Track route while actively calibrating, cancel attempt
      const state = trackingStateRef.current;
      if (state === 'CALIBRATING' || state === 'RECALIBRATING' || state === 'STARTING_CAMERA') {
        fetch(`${VISION_SERVICE_URL}/tracking/stop`, { method: 'POST', keepalive: true }).catch(() => {});
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ─── Computed Values ───
  const totalMonitoringDuration = dailyBaseMonitoring + sessionElapsedSeconds;
  const liveBadDuration = badStreakSeconds;

  // Camera should be active during calibration, ready, tracking, and recalibration
  const isCameraActive = ['STARTING_CAMERA', 'CALIBRATING', 'READY', 'TRACKING', 'RECALIBRATING'].includes(trackingState);

  // ─── Actions ───
  const calibrateBaseline = async () => {
    setError('');
    try {
      // Create a new session each time calibration is started
      const session = await trackingApi.createSession();
      setSessionId(session.sessionId);
      setCameraSessionKey(Date.now());

      connectWebSocket(() => {
        fetch(`${VISION_SERVICE_URL}/tracking/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            trackingToken: session.trackingToken,
            backendEventUrl: session.backendEventUrl,
          }),
        }).then(res => {
          if (!res.ok) {
            setError('Failed to start camera. Please check webcam permissions.');
            setTrackingState('CAMERA_UNAVAILABLE');
          }
        }).catch(() => {
          setError('Vision service is not responding.');
          setTrackingState('ENGINE_UNAVAILABLE');
        });
      });
      setTrackingState('STARTING_CAMERA');
      setCalibrationProgress(0);
      setBadStreakSeconds(0);
      setSessionElapsedSeconds(0);
    } catch (err: any) {
      setError('Failed to create tracking session. Is the backend running?');
    }
  };

  const startTracking = async () => {
    setError('');
    try {
      await fetch(`${VISION_SERVICE_URL}/tracking/begin_monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setTrackingState('TRACKING');
    } catch (err) {
      console.error('Start error:', err);
      setError('Failed to start monitoring.');
    }
  };



  const stopTracking = async () => {
    setError('');
    
    // CRITICAL: Clear the MJPEG stream src before unmounting to prevent Chrome "Aw Snap!" crash
    if (cameraImgRef.current) {
      cameraImgRef.current.src = '';
    }
    
    setTrackingState('STOPPING');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${VISION_SERVICE_URL}/tracking/stop`, { 
        method: 'POST',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      // Persist this tracking period to backend
      if (sessionId) {
        try {
          await trackingApi.stopSession(sessionId);
        } catch (err) {
          console.error('Failed to persist session to backend:', err);
          setError('Tracking stopped, but the session could not be saved.');
        }
      }

      // Update daily base with the newly completed period
      const periodGood = data.stats?.goodDurationSeconds || 0;
      const periodBad = data.stats?.badDurationSeconds || 0;
      setDailyBaseMonitoring(prev => prev + periodGood + periodBad);

      // Reset live values
      setBadStreakSeconds(0);
      setSessionElapsedSeconds(0);
      setPostureState('');
      setPostureTypes([]);
      setLiveSuggestion('');
      setSessionId(null);
      setToasts([]);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setTrackingState('IDLE');
    } catch (err) {
      console.error('Stop error:', err);
      setError('Failed to stop tracking. Please try again.');
      setTrackingState('TRACKING');
    }
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ─── Derived UI ───
  const postureLabel = getPostureLabel(trackingState, postureState, postureTypes);
  const postureColor = getPostureColor(trackingState, postureState);
  const suggestionText = getSuggestionForState(trackingState, postureState, liveSuggestion);

  // Visual State Variables
  const NEUTRAL_BORDER = '#94a3b8';
  const isActualBadState = trackingState === 'TRACKING' && (postureState === 'BAD_PENDING' || postureState === 'BAD_CONFIRMED');

  // ─── Engine Unavailable View ───
  if (trackingState === 'ENGINE_UNAVAILABLE') {
    return (
      <div style={{ padding: '2rem', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Track Posture</h1>
        </div>
        <div style={{
          textAlign: 'center', maxWidth: '500px', margin: '4rem auto',
          background: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)'
        }}>
          <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>Vision Service Offline</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            The Python vision service must be started before tracking.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // ─── Main View ───
  return (
    <div className="track-page" style={{
      padding: '1.25rem 1.5rem',
      boxSizing: 'border-box',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Track Posture</h1>
        {trackingState === 'TRACKING' && (
          <span className="tracking-badge">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Monitoring
          </span>
        )}
        {(trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING' || trackingState === 'STARTING_CAMERA') && (
          <span style={{
            background: 'var(--warning-bg)', color: '#92400e',
            padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '6px'
          }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {trackingState === 'STARTING_CAMERA' ? 'Starting Camera...' : 'Calibrating'}
          </span>
        )}
      </div>

      {error && (
        <div className="error-message" style={{ flexShrink: 0, marginBottom: '0.75rem' }}>{error}</div>
      )}

      {/* Main Grid: Camera + Side Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 280px',
        gap: '1rem',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left Column: Camera + Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, minHeight: 0 }}>
          {/* Camera Container */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '0.75rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            flex: 1, minHeight: 0,
          }}>
            {/* Camera Preview */}
            <div style={{
              background: '#0a0a0a', borderRadius: '8px', overflow: 'hidden',
              flex: 1, minHeight: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', position: 'relative', aspectRatio: '16/9',
              maxHeight: 'calc(100vh - 260px)',
            }}>
              {isCameraActive ? (
                <>
                  <img
                    ref={cameraImgRef}
                    src={`${VISION_SERVICE_URL}/video_feed?t=${cameraSessionKey}`}
                    alt=""
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain',
                      display: 'block', background: '#0a0a0a',
                    }}
                  />
                  {/* Calibration overlay */}
                  {(trackingState === 'STARTING_CAMERA' || trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING') && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', background: 'rgba(0,0,0,0.35)',
                    }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.75)', color: 'white',
                        padding: '16px 28px', borderRadius: '12px',
                        textAlign: 'center',
                      }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
                          {trackingState === 'STARTING_CAMERA' ? 'Starting Camera...' : trackingState === 'RECALIBRATING' ? 'Recalibrating...' : 'Calibrating...'}
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                          {trackingState === 'STARTING_CAMERA' ? 'Please wait while we turn on the camera' : 'Sit upright and face the camera'}
                        </div>
                        {calibrationProgress > 0 && (
                          <div style={{
                            marginTop: '10px', background: 'rgba(255,255,255,0.15)',
                            borderRadius: '4px', height: '4px', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', background: 'var(--accent-light)',
                              borderRadius: '4px', width: `${Math.round(calibrationProgress * 100)}%`,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  color: '#666', fontSize: '0.9rem', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                }}>
                  <Activity size={32} color="#555" />
                  <span>Calibrate your baseline to begin</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexShrink: 0 }}>
              {/* Calibration Button */}
              {(trackingState === 'IDLE' || trackingState === 'ERROR') && (
                <button
                  className="btn btn-secondary track-btn"
                  onClick={calibrateBaseline}
                  style={{ minWidth: '160px' }}
                >
                  Calibrate Baseline
                </button>
              )}
              {(trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING') && (
                <button
                  className="btn btn-secondary track-btn"
                  disabled
                  style={{ minWidth: '160px' }}
                >
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Calibrating...
                </button>
              )}
              {trackingState === 'READY' && (
                <button
                  className="btn btn-secondary track-btn"
                  onClick={calibrateBaseline}
                  style={{ minWidth: '160px' }}
                >
                  Recalibrate Baseline
                </button>
              )}
              {trackingState === 'TRACKING' && (
                <button
                  className="btn btn-secondary track-btn"
                  disabled
                  title="Stop tracking to recalibrate."
                  style={{ minWidth: '160px', opacity: 0.6, cursor: 'not-allowed' }}
                >
                  Recalibrate Baseline
                </button>
              )}

              {/* Start/Stop Button */}
              {(trackingState === 'IDLE' || trackingState === 'ERROR' || trackingState === 'CALIBRATING' || trackingState === 'RECALIBRATING') && (
                <button className="btn btn-primary track-btn" disabled style={{ minWidth: '160px' }}>
                  Start Tracking
                </button>
              )}
              {trackingState === 'READY' && (
                <button
                  className="btn btn-primary track-btn"
                  onClick={startTracking}
                  style={{ minWidth: '160px' }}
                >
                  Start Tracking
                </button>
              )}
              {trackingState === 'TRACKING' && (
                <button
                  className="btn btn-danger track-btn"
                  onClick={stopTracking}
                  style={{ minWidth: '160px' }}
                >
                  Stop Tracking
                </button>
              )}
              {trackingState === 'STOPPING' && (
                <button className="btn btn-danger track-btn" disabled style={{ minWidth: '160px' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Stopping...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, overflow: 'hidden' }}>
          {/* Posture Guidance */}
          <div className="status-card" style={{
            background: 'var(--surface)',
            padding: '1.25rem', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${postureColor}`,
            height: '270px',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Activity size={16} color="var(--text-secondary)" />
              <h3 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Posture Guidance
              </h3>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
              {trackingState === 'TRACKING' && (postureState === 'BAD_PENDING' || postureState === 'BAD_CONFIRMED') && postureTypes.length > 0 ? (
                postureTypes.slice(0, 3).map((pt) => {
                  const RECOMMENDATIONS: Record<string, string> = {
                    "Forward Head": "Move your head back.",
                    "Too Close": "Move slightly away from the screen.",
                    "Too Far": "Come a little closer.",
                    "Face Tilt": "Keep your face straight.",
                    "Head Tilt": "Keep your face straight.",
                    "Slouching": "Straighten your back.",
                    "Leaning Left": "Sit straight and move slightly right.",
                    "Leaning Right": "Sit straight and move slightly left.",
                    "Leaning Back": "Bring your torso toward a neutral upright position.",
                    "Shoulder Tilt": "Level your shoulders.",
                    "Chin Too High": "Lower your chin slightly.",
                    "Chin Too Low": "Raise your chin slightly."
                  };
                  return (
                    <div key={pt}>
                      <div style={{ color: postureColor, fontWeight: 700, fontSize: '1rem', marginBottom: '0px', lineHeight: '1.2' }}>
                        {pt}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', lineHeight: '1.4' }}>
                        {RECOMMENDATIONS[pt] || "Adjust your posture."}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div>
                  <div style={{ color: postureColor, fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px', lineHeight: '1.2' }}>
                    {postureLabel}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', lineHeight: '1.4' }}>
                    {suggestionText}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: 1, minHeight: 0 }}>
            {/* Monitoring Duration */}
            <div className="status-card" style={{
              background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${trackingState === 'TRACKING' ? 'var(--accent)' : NEUTRAL_BORDER}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Clock size={14} color="var(--text-secondary)" />
                <h3 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Monitoring
                </h3>
              </div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>
                {formatDuration(totalMonitoringDuration)}
              </div>
            </div>

            {/* Bad Posture Streak */}
            <div className="status-card" style={{
              background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${isActualBadState ? 'var(--danger)' : NEUTRAL_BORDER}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertTriangle size={14} color={isActualBadState ? 'var(--danger)' : 'var(--text-secondary)'} />
                <h3 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Bad Streak
                </h3>
              </div>
              <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: isActualBadState ? 'var(--danger)' : 'var(--text)' }}>
                {formatDuration(liveBadDuration)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            suggestion={t.suggestion}
            postureType={t.postureType}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
