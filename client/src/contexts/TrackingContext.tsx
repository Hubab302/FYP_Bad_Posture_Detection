import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const VISION_SERVICE_URL = 'http://localhost:8000';

export interface TrackingContextState {
  isTracking: boolean;
  trackingState: string;
  postureState: string;
  postureScore: number;
  postureTypes: string[];
  suggestion: string;
  badStreakSeconds: number;
  currentSessionGoodSeconds: number;
  currentSessionBadSeconds: number;
  calibrationStatus: string;
  calibrationProgress?: number;
  landmarkConfidence: number;
  startLiveTracking: () => void;
  stopLiveTracking: () => void;
  updateTrackingState: (state: string) => void;
}

const TrackingContext = createContext<TrackingContextState | undefined>(undefined);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingState, setTrackingState] = useState('IDLE');
  
  const [postureState, setPostureState] = useState('GOOD');
  const [postureScore, setPostureScore] = useState(100);
  const [postureTypes, setPostureTypes] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState('');
  
  const [badStreakSeconds, setBadStreakSeconds] = useState(0);
  const [currentSessionGoodSeconds, setCurrentSessionGoodSeconds] = useState(0);
  const [currentSessionBadSeconds, setCurrentSessionBadSeconds] = useState(0);
  
  const [calibrationStatus, setCalibrationStatus] = useState('IDLE');
  const [calibrationProgress, setCalibrationProgress] = useState<number | undefined>(undefined);
  const [landmarkConfidence, setLandmarkConfidence] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  const startLiveTracking = () => {
    setIsTracking(true);
    setTrackingState('READY');
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = VISION_SERVICE_URL.replace(/^http/, 'ws') + '/ws/telemetry';
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'telemetry') {
          if (data.trackingState) setTrackingState(data.trackingState);
          setPostureState(data.state || 'GOOD');
          if (data.postureScore !== undefined) setPostureScore(data.postureScore);
          if (data.postureTypes) setPostureTypes(data.postureTypes);
          if (data.suggestion) setSuggestion(data.suggestion);
          
          if (data.badStreakSeconds !== undefined) setBadStreakSeconds(data.badStreakSeconds);
          if (data.goodSeconds !== undefined) setCurrentSessionGoodSeconds(data.goodSeconds);
          if (data.badSeconds !== undefined) setCurrentSessionBadSeconds(data.badSeconds);
          
          if (data.calibrationStatus) setCalibrationStatus(data.calibrationStatus);
          if (data.calibrationProgress !== undefined) setCalibrationProgress(data.calibrationProgress);
          if (data.landmarkConfidence !== undefined) setLandmarkConfidence(data.landmarkConfidence);
        }
      } catch (err) {
        console.error('Failed to parse telemetry', err);
      }
    };

    wsRef.current = ws;
  };

  const stopLiveTracking = () => {
    setIsTracking(false);
    setCurrentSessionGoodSeconds(0);
    setCurrentSessionBadSeconds(0);
    setBadStreakSeconds(0);
    setPostureTypes([]);
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const updateTrackingState = (state: string) => {
    setTrackingState(state);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <TrackingContext.Provider value={{
      isTracking,
      trackingState,
      postureState,
      postureScore,
      postureTypes,
      suggestion,
      badStreakSeconds,
      currentSessionGoodSeconds,
      currentSessionBadSeconds,
      calibrationStatus,
      calibrationProgress,
      landmarkConfidence,
      startLiveTracking,
      stopLiveTracking,
      updateTrackingState
    }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}
