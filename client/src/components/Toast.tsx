import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  suggestion?: string;
  postureType?: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, suggestion, postureType, duration = 8000, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-header">
        <span className="toast-icon">⚠️</span>
        <span className="toast-title">{message}</span>
        <button className="toast-close" onClick={() => { setExiting(true); setTimeout(onClose, 300); }}>✕</button>
      </div>
      {postureType && (
        <div className="toast-posture-type">Detected: <strong>{postureType}</strong></div>
      )}
      {suggestion && <p className="toast-suggestion">{suggestion}</p>}
      <p className="toast-disclaimer">Ergonomic guidance only; this application is not a medical diagnostic device.</p>
    </div>
  );
}
