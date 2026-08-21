import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import LogoutModal from './LogoutModal';
import TrackPosturePage from '../pages/TrackPosturePage';
import { LayoutDashboard, Camera, History, FileText, LogOut, Activity } from 'lucide-react';

const VISION_SERVICE_URL = 'http://localhost:8000';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/track', label: 'Track Posture', icon: <Camera size={20} /> },
    { to: '/history', label: 'History', icon: <History size={20} /> },
    { to: '/report', label: 'Report', icon: <FileText size={20} /> },
  ];

  // Application-level Heartbeat watchdog
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch(`${VISION_SERVICE_URL}/heartbeat`, { method: 'POST', keepalive: true }).catch(() => { });
    };
    sendHeartbeat(); // Immediate on mount
    const interval = setInterval(sendHeartbeat, 2500);
    return () => clearInterval(interval);
  }, []);

  // Immediate page-exit signal
  useEffect(() => {
    const handlePageExit = () => {
      console.log("[LIFECYCLE_TRACE] beforeunload");
      navigator.sendBeacon(`${VISION_SERVICE_URL}/tracking/stop?debugReason=PAGE_EXIT_BEACON`);
    };
    window.addEventListener('beforeunload', handlePageExit);
    return () => {
      console.log("[LIFECYCLE_TRACE] AppLayout unmount");
      window.removeEventListener('beforeunload', handlePageExit);
    };
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon"><Activity size={28} /></span>
            <span className="logo-text">PostureCoach</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
            <span className="user-name">{user?.username}</span>
          </div>
          <button className="logout-btn" onClick={() => setShowLogout(true)} title="Logout">
            <span><LogOut size={20} /></span>
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          display: location.pathname === '/track' ? 'block' : 'none', 
          height: '100%', 
          width: '100%' 
        }}>
          <TrackPosturePage />
        </div>
        {location.pathname !== '/track' && <Outlet />}
      </main>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </div>
  );
}
