import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import MobileMenu from './MobileMenu';
import BrandLogo from './BrandLogo';
import LocationModal from './LocationModal';
import InstallAppButton from './InstallAppButton';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export default function Navbar() {
  const { user, handleLogout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase());
  const [locationOpen, setLocationOpen] = useState(false);

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  const handleLocationSave = async (city) => {
    try {
      const res = await api.updateProfile({ city });
      refreshUser(res.data.data);
    } catch { /* ignore */ }
    setLocationOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors whitespace-nowrap ${
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
        <div className="hidden md:flex items-center gap-3 lg:gap-5 ml-6 lg:ml-10">
          <NavLink to="/dashboard"   className={linkClass}>Dashboard</NavLink>
          <NavLink to="/tournaments" className={linkClass}>Tournaments</NavLink>
          <NavLink to="/calendar"    className={linkClass}>Calendar</NavLink>
          <NavLink to="/sessions"   className={linkClass}>Performance Journal</NavLink>
          <NavLink to="/coach" className={({ isActive }) =>
            `text-sm font-medium tracking-wide transition-colors flex items-center gap-1 whitespace-nowrap ${
              isActive ? 'text-[#91BE4D]' : 'text-[#272702]/60 hover:text-[#91BE4D]'
            }`}>
            AI Coach
            <span className="text-[9px] font-bold px-1 py-0.5 rounded text-white leading-none"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>NEW</span>
          </NavLink>
          <NavLink to="/expenses"   className={linkClass}>Gear</NavLink>
          <NavLink to="/players"    className={linkClass}>Nearby Players</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) =>
              `text-sm font-medium tracking-wide transition-colors ${isActive ? 'text-purple-500' : 'text-purple-400 hover:text-purple-500'}`
            }>
              Admin
            </NavLink>
          )}
        </div>

        {/* Desktop User + Logout */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {/* City chip */}
          <button
            onClick={() => setLocationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#91BE4D] hover:bg-[#f4f8e8] transition-colors text-xs font-semibold text-gray-500 hover:text-[#4a6e10] max-w-[140px]"
            title={user?.city ? 'Change location' : 'Set your location'}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{user?.city || 'Set location'}</span>
            <svg className="w-3 h-3 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <InstallAppButton />
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2 text-sm font-medium transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 ${isActive ? 'text-[#91BE4D]' : 'text-[#272702]/60 hover:text-[#272702]'}`
            }
            title="Your profile"
          >
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-2 ring-[#91BE4D]/40" />
              : <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
            }
            <span>{user?.name?.split(' ')[0]}</span>
          </NavLink>
          <button
            onClick={logout}
            className="text-sm px-4 py-2 hover:opacity-90 text-white rounded-lg font-semibold transition-opacity tracking-wide"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            Logout
          </button>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <NavLink to="/profile" className="flex-shrink-0">
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#91BE4D]/40" />
              : <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
            }
          </NavLink>
          <MobileMenu onOpenLocationModal={() => setLocationOpen(true)} />
        </div>
      </div>

      {/* Location modal */}
      {locationOpen && (
        <LocationModal
          onSave={handleLocationSave}
          onSkip={() => setLocationOpen(false)}
        />
      )}
    </nav>
  );
}
