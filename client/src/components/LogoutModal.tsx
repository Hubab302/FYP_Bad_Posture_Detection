interface LogoutModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutModal({ onConfirm, onCancel }: LogoutModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirm Logout</h3>
        <p>Are you sure you want to log out? Any active tracking session will be stopped.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            No, Stay
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}
