import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileMenu from './MobileMenu';
import BrandLogo from './BrandLogo';

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
      isActive ? 'text-[#91BE4D]' : 'text-[#272702]/60 hover:text-[#91BE4D]'
    }`;

  return (
    <nav className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <NavLink to="/dashboard" className="flex-shrink-0">
          <span className="sm:hidden"><BrandLogo size="md" /></span>
          <span className="hidden sm:inline"><BrandLogo size="lg" /></span>
        </NavLink>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-7">
          <NavLink to="/dashboard"   className={linkClass}>Dashboard</NavLink>
          <NavLink to="/tournaments" className={linkClass}>Tournaments</NavLink>
          <NavLink to="/calendar"    className={linkClass}>Calendar</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) =>
              `text-sm font-medium tracking-wide transition-colors ${isActive ? 'text-purple-500' : 'text-purple-400 hover:text-purple-500'}`
            }>
              Admin
            </NavLink>
          )}
        </div>

        {/* Desktop User + Logout */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-gray-400 font-medium">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm px-4 py-2 hover:opacity-90 text-white rounded-lg font-semibold transition-opacity tracking-wide"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
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
