import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import InstallAppButton from './InstallAppButton';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export default function MobileMenu({ onOpenLocationModal }) {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase());

  const handleLogoutClick = () => {
    handleLogout();
    setIsOpen(false);
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `block px-5 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'text-[#91BE4D] bg-[#91BE4D]/8 border-l-4 border-[#91BE4D]'
        : 'text-[#272702]/70 hover:bg-gray-50 hover:text-[#91BE4D] border-l-4 border-transparent'
    }`;

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        <span className={`h-0.5 w-6 bg-[#272702] rounded transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`h-0.5 w-6 bg-[#272702] rounded transition-all ${isOpen ? 'opacity-0' : ''}`} />
        <span className={`h-0.5 w-6 bg-[#272702] rounded transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-16 h-[calc(100dvh-64px)] w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 md:hidden flex flex-col border-r border-gray-100 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header — brand + user identity */}
        <div className="flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between px-5 py-3">
            <BrandLogo size="md" />
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Profile row — sits in the header so it's always visible */}
          {user && (
            <NavLink
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-5 pb-3 hover:opacity-80 transition-opacity"
            >
              {user.profilePhoto
                ? <img src={user.profilePhoto} alt={user.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-[#91BE4D]/40" />
                : <span className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
                    {(user.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
              }
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#272702] truncate">{user.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
              </div>
            </NavLink>
          )}
        </div>

        {/* Nav Links — scrollable, with fade hint at bottom */}
        <div className="relative flex-1 min-h-0">
          <nav className="h-full overflow-y-auto pt-2 pb-2 space-y-0.5">
            <NavLink to="/dashboard"   className={navLinkClass} onClick={() => setIsOpen(false)}>Dashboard</NavLink>
            <NavLink to="/tournaments" className={navLinkClass} onClick={() => setIsOpen(false)}>Tournaments</NavLink>
            <NavLink to="/calendar"    className={navLinkClass} onClick={() => setIsOpen(false)}>Calendar</NavLink>
            <NavLink to="/sessions"    className={navLinkClass} onClick={() => setIsOpen(false)}>Performance Journal</NavLink>
            <NavLink to="/coach" onClick={() => setIsOpen(false)} className={({ isActive }) =>
              `flex items-center justify-between px-5 py-3 text-sm font-medium transition-colors border-l-4 ${
                isActive
                  ? 'text-[#91BE4D] bg-[#91BE4D]/8 border-[#91BE4D]'
                  : 'text-[#272702]/70 hover:bg-gray-50 hover:text-[#91BE4D] border-transparent'
              }`}>
              <span>AI Coach</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white leading-none"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>NEW</span>
            </NavLink>
            <NavLink to="/expenses"    className={navLinkClass} onClick={() => setIsOpen(false)}>Gear</NavLink>
            <NavLink to="/players"     className={navLinkClass} onClick={() => setIsOpen(false)}>Nearby Players</NavLink>
            <NavLink to="/profile"     className={navLinkClass} onClick={() => setIsOpen(false)}>Profile</NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) =>
                `block px-5 py-3 text-sm font-medium transition-colors border-l-4 ${
                  isActive ? 'text-purple-500 bg-purple-50 border-purple-400' : 'text-purple-400 hover:bg-purple-50 hover:text-purple-500 border-transparent'
                }`
              } onClick={() => setIsOpen(false)}>
                Admin
              </NavLink>
            )}
          </nav>
          {/* Fade gradient — tells the user there are items above/below */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* Footer — minimal: city + install + logout */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2">
          <button
            onClick={() => { setIsOpen(false); onOpenLocationModal?.(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:border-[#91BE4D] hover:bg-[#f4f8e8] transition-colors text-left"
          >
            <svg className="w-4 h-4 text-[#4a6e10] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="flex-1 text-sm font-semibold text-gray-700 truncate">
              {user?.city || 'Set your location'}
            </span>
            <span className="text-xs text-[#91BE4D] font-semibold flex-shrink-0">
              {user?.city ? 'Change' : 'Set'}
            </span>
          </button>
          <InstallAppButton variant="menu" />
          <button
            onClick={handleLogoutClick}
            className="w-full hover:opacity-90 text-white font-bold py-2.5 rounded-lg text-sm transition-opacity tracking-wide"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
