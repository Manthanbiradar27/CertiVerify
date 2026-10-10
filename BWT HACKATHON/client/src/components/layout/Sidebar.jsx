import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeSelector from '../common/ThemeSelector';
import toast from 'react-hot-toast';

const OrgNav = () => (
  <>
    <div className="sidebar-section">
      <div className="sidebar-section-label">Organization</div>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/dashboard">
        <span className="icon">⊞</span> Dashboard
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/recipients">
        <span className="icon">👥</span> Recipients
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/certificates">
        <span className="icon">📜</span> Certificates
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/certificates/issue">
        <span className="icon">✚</span> Issue Certificate
      </NavLink>
    </div>
    <div className="sidebar-section">
      <div className="sidebar-section-label">Settings</div>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/profile">
        <span className="icon">⚙</span> Profile & Settings
      </NavLink>
    </div>
  </>
);

const AdminNav = () => (
  <>
    <div className="sidebar-section">
      <div className="sidebar-section-label">Administration</div>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/admin/dashboard">
        <span className="icon">⊞</span> Dashboard
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/admin/organizations">
        <span className="icon">🏛</span> Organizations
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/admin/certificates">
        <span className="icon">📜</span> Certificates
      </NavLink>
      <NavLink className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} to="/admin/audit">
        <span className="icon">📋</span> Audit Logs
      </NavLink>
    </div>
  </>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">C</div>
        <div>
          <div className="sidebar-logo-text">Certi<span>Verify</span></div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginTop: '1px' }}>
            {user?.role === 'admin' ? 'Administrator' : 'Organization'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {user?.role === 'admin' ? <AdminNav /> : <OrgNav />}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Theme</span>
          <ThemeSelector compact />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </div>
        <button className="btn btn-ghost btn-sm w-full" onClick={handleLogout}>
          ⎋ Log Out
        </button>
      </div>
    </aside>
  );
}
