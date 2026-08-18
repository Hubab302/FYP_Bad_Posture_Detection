import { useState } from 'react';

interface ToastProps {
  durationStr: string;
  suggestion?: string;
  postureTypes?: string[];
  onClose: () => void;
}

export default function Toast({ durationStr, postureTypes, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 300);
  };

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
    <div className={`toast ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-header">
        <span className="toast-icon">⚠️</span>
        <span className="toast-title">Poor posture detected <span className="toast-duration">· {durationStr}</span></span>
        <button className="toast-close" onClick={handleClose}>✕</button>
      </div>
      {postureTypes && postureTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--danger)', lineHeight: '1.3' }}>
            {postureTypes.join(' · ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
            {RECOMMENDATIONS[postureTypes[0]] || "Adjust your posture."}
          </div>
        </div>
      )}
    </div>
  );
}
