import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileMenu from './MobileMenu';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function Navbar() {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-green-400' : 'text-slate-300 hover:text-white'
    }`;

  return (
    <nav className="bg-slate-900 sticky top-0 z-20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/dashboard" className="flex items-center gap-3 flex-shrink-0">
          <img
            src="/logo.svg"
            alt="PickleTracker"
            className="h-9 w-9 object-contain"
          />
          <div className="hidden sm:flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-green-400">Pickle</span>
            <span className="text-lg font-bold text-orange-400">Tracker</span>
          </div>
        </NavLink>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/tournaments" className={linkClass}>Tournaments</NavLink>
          <NavLink to="/expenses" className={linkClass}>Expenses</NavLink>
          <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? 'text-purple-400' : 'text-purple-300 hover:text-purple-200'}`
            }>
              Admin
            </NavLink>
          )}
        </div>

        {/* Desktop User + Logout */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-slate-400">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-md font-medium transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Mobile Menu */}
        <MobileMenu />
      </div>
    </nav>
  );
}
