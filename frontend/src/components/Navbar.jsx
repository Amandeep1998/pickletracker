import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import MobileMenu from './MobileMenu';
import BrandLogo from './BrandLogo';
import LocationModal from './LocationModal';
import InstallAppButton from './InstallAppButton';
import NotificationBell from './NotificationBell';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

/** Desktop nav — compact enough to fit; safe-center avoids clipping when the row must scroll */
const navLinkBase =
  'text-xs sm:text-sm lg:text-sm xl:text-[0.9375rem] font-medium transition-colors whitespace-nowrap px-1 lg:px-1.5 xl:px-2 py-1 lg:py-1.5 rounded-md';


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
    } catch {
      /* ignore */
    }
    setLocationOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `${navLinkBase} ${isActive ? 'text-[#91BE4D]' : 'text-[#272702]/60 hover:text-[#91BE4D]'}`;

  return (
    <nav className="bg-white sticky top-0 z-20 shadow-sm border-b border-gray-100">
      {/* Full-width row: logo flush left, utilities flush right — center column gets all space between */}
      <div className="w-full px-2 sm:px-3 lg:px-4">
        <div className="flex items-center gap-2 min-h-[3.5rem] sm:min-h-16 py-1.5 sm:py-0 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-x-2 xl:gap-x-3 min-w-0">
          {/* Brand — left edge of bar (padding only from page gutter above) */}
          <NavLink to="/home" className="relative z-10 flex-shrink-0 bg-white lg:justify-self-start lg:max-w-[min-content]">
            <span className="lg:hidden">
              <BrandLogo size="md" />
            </span>
            <span className="hidden lg:inline 2xl:hidden">
              <BrandLogo size="lg" />
            </span>
            <span className="hidden 2xl:inline">
              <BrandLogo size="xl" />
            </span>
          </NavLink>

          {/* Outer flex + safe center: centered row when it fits; left-aligned scroll when it overflows (no clipped ends) */}
          <div className="hidden lg:flex min-w-0 justify-self-stretch items-center justify-[safe_center] overflow-x-auto overflow-y-visible overscroll-x-contain touch-pan-x py-1 px-0.5 [scrollbar-width:thin]">
            <nav
              className="flex w-max shrink-0 flex-nowrap items-center gap-x-1 lg:gap-x-1.5 xl:gap-x-2"
              aria-label="Main navigation"
            >
              <NavLink to="/home" className={linkClass}>
                Home
              </NavLink>
              <NavLink to="/achievements" className={linkClass}>
                Trophies
              </NavLink>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/tournaments" className={linkClass}>
                Tournaments
              </NavLink>
              <NavLink to="/calendar" className={linkClass}>
                Calendar
              </NavLink>
              <NavLink to="/players" className={linkClass}>
                <span className="2xl:hidden">Nearby</span>
                <span className="hidden 2xl:inline">Nearby Players</span>
              </NavLink>
              <NavLink to="/sessions" className={linkClass}>
                <span className="2xl:hidden">Journal</span>
                <span className="hidden 2xl:inline">Performance Journal</span>
              </NavLink>
              <NavLink to="/coach-hub" className={linkClass}>
                Coach Hub
              </NavLink>
              <NavLink to="/coach" className={linkClass}>
                AI Coach
              </NavLink>
              <NavLink to="/expenses" className={linkClass}>
                Gear
              </NavLink>
              <NavLink to="/support" className={linkClass}>
                Support
              </NavLink>
            </nav>
          </div>

          {/* Desktop: pinned to right edge of bar */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-shrink-0 relative z-10 bg-white justify-self-end border-l border-gray-100/90 pl-2 xl:pl-3 min-w-0">
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-full border border-gray-200 hover:border-[#91BE4D] hover:bg-[#f4f8e8] transition-colors text-[11px] xl:text-xs font-semibold text-gray-500 hover:text-[#4a6e10] max-w-[5rem] xl:max-w-[9rem] 2xl:max-w-[11rem]"
              title={user?.city ? 'Change location' : 'Set your location'}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate min-w-0">{user?.city || 'Location'}</span>
              <svg className="w-3 h-3 flex-shrink-0 text-gray-400 hidden xl:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <NotificationBell />
            <InstallAppButton compact />
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${navLinkBase} flex-shrink-0 ${isActive ? 'text-purple-500' : 'text-purple-400 hover:text-purple-500'}`
                }
              >
                Admin
              </NavLink>
            )}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs xl:text-sm font-medium transition-colors px-1 xl:px-2 py-1 rounded-lg hover:bg-gray-100 max-w-[8rem] xl:max-w-none ${
                  isActive ? 'text-[#91BE4D]' : 'text-[#272702]/60 hover:text-[#272702]'
                }`
              }
              title="Your profile"
            >
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.name || ''} className="w-7 h-7 xl:w-8 xl:h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-[#91BE4D]/40" />
              ) : (
                <span
                  className="w-7 h-7 xl:w-8 xl:h-8 rounded-full flex items-center justify-center text-[11px] xl:text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                >
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
              <span className="truncate hidden xl:inline">{user?.name?.split(' ')[0]}</span>
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="text-xs xl:text-sm px-2.5 xl:px-3 py-1.5 xl:py-2 hover:opacity-90 text-white rounded-lg font-semibold transition-opacity tracking-wide whitespace-nowrap"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              Logout
            </button>
          </div>

          {/* Mobile / tablet: bell + avatar + menu (drawer contains full nav) */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2 ml-auto flex-shrink-0">
            <NotificationBell />
            <NavLink to="/profile" className="flex-shrink-0 p-0.5" aria-label="Profile">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.name || ''} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#91BE4D]/40" />
              ) : (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                >
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </NavLink>
            <MobileMenu onOpenLocationModal={() => setLocationOpen(true)} />
          </div>
        </div>
      </div>

      {locationOpen && (
        <LocationModal onSave={handleLocationSave} onSkip={() => setLocationOpen(false)} />
      )}
    </nav>
  );
}
