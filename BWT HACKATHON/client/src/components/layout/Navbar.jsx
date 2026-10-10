import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeSelector from '../common/ThemeSelector';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">C</div>
          <span className="navbar-logo-name">Certi<span>Verify</span></span>
        </Link>

        <nav className="navbar-links">
          <Link to="/verify" className="btn btn-ghost btn-sm">🔍 Verify</Link>
          <ThemeSelector />
          {user ? (
            <>
              <Link
                to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className="btn btn-secondary btn-sm"
              >
                Dashboard
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
