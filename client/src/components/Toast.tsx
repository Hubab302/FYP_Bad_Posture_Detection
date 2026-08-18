import { useState } from 'react';

interface ToastProps {
  message: string;
  suggestion?: string;
  postureType?: string;
  onClose: () => void;
}

export default function Toast({ message, suggestion, postureType, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);

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
