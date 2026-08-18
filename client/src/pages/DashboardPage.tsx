import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Welcome, {user?.username}!</h1>
        <p>Monitor and improve your sitting posture with AI-powered analysis.</p>
      </div>

      <div className="dashboard-info" style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="info-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Getting Started</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Use the navigation sidebar to access your workspace. 
            <strong> Track Posture</strong> uses your local camera to analyze your ergonomics in real-time. 
            View your <strong>History</strong> and <strong>Reports</strong> to see your improvements over time.
          </p>
        </div>

        <div className="info-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>How It Works</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Our AI analyzes your body posture using local pose detection. When bad posture persists for a continuous duration, you'll receive a non-intrusive alert with a single ergonomic recommendation.
          </p>
        </div>

        <div className="info-card" style={{ padding: '24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Privacy</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            The camera is used entirely locally for real-time posture analysis. Raw video is never stored or transmitted to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
