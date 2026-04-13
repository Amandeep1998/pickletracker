import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

export default function MobileMenu() {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;

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
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
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

        {/* Nav Links */}
        <nav className="flex-1 pt-2 space-y-0.5 overflow-y-auto">
          <NavLink to="/dashboard"   className={navLinkClass} onClick={() => setIsOpen(false)}>Dashboard</NavLink>
          <NavLink to="/tournaments" className={navLinkClass} onClick={() => setIsOpen(false)}>Tournaments</NavLink>
          <NavLink to="/calendar"    className={navLinkClass} onClick={() => setIsOpen(false)}>Calendar</NavLink>
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

        {/* User + Logout */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 p-4">
          {user && (
            <>
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-[#272702] mb-4 truncate">{user.name}</p>
            </>
          )}
          <button
            onClick={handleLogoutClick}
            className="w-full bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold py-2.5 rounded-lg text-sm transition-colors tracking-wide"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
