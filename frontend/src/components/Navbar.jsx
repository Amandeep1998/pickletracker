import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileMenu from './MobileMenu';
import { LogoIcon, LogoFull } from './Logo';

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
    `text-sm font-medium tracking-wide transition-colors ${
      isActive ? 'text-[#91BE4D]' : 'text-slate-300 hover:text-[#ec9937]'
    }`;

  return (
    <nav className="bg-[#272702] sticky top-0 z-20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <NavLink to="/dashboard" className="flex items-center flex-shrink-0">
          {/* Mobile: icon only */}
          <span className="sm:hidden">
            <LogoIcon size={36} />
          </span>
          {/* Desktop: full wordmark */}
          <span className="hidden sm:inline-block">
            <LogoFull height={34} />
          </span>
        </NavLink>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/tournaments" className={linkClass}>Tournaments</NavLink>
          <NavLink to="/expenses" className={linkClass}>Expenses</NavLink>
          <NavLink to="/calendar" className={linkClass}>Calendar</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) =>
              `text-sm font-medium tracking-wide transition-colors ${isActive ? 'text-purple-400' : 'text-purple-300 hover:text-purple-200'}`
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
            className="text-sm px-4 py-1.5 bg-[#ec9937] hover:bg-[#d4831f] text-white rounded font-semibold transition-colors tracking-wide"
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
