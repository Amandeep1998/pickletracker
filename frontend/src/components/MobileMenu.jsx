import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileMenu() {
  const { user, handleLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogoutClick = () => {
    handleLogout();
    setIsOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `block px-4 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'text-[#91BE4D] bg-[#91BE4D]/10 border-l-4 border-[#91BE4D]'
        : 'text-gray-700 hover:bg-[#F3F8F9] hover:text-[#ec9937]'
    }`;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2 rounded hover:bg-[#3a3a00] transition-colors"
        aria-label="Toggle menu"
      >
        <span className={`h-0.5 w-6 bg-white transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`h-0.5 w-6 bg-white transition-all ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`h-0.5 w-6 bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-16 h-[calc(100dvh-64px)] w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header row with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold text-[#91BE4D]">Pickle</span>
            <span className="text-base font-bold text-[#ec9937]">Tracker</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 pt-2 space-y-1 overflow-y-auto">
          <NavLink
            to="/dashboard"
            className={navLinkClass}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/tournaments"
            className={navLinkClass}
            onClick={() => setIsOpen(false)}
          >
            Tournaments
          </NavLink>
          <NavLink
            to="/expenses"
            className={navLinkClass}
            onClick={() => setIsOpen(false)}
          >
            Expenses
          </NavLink>
          <NavLink
            to="/calendar"
            className={navLinkClass}
            onClick={() => setIsOpen(false)}
          >
            Calendar
          </NavLink>
        </nav>

        {/* User Info & Logout - Always at Bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-4">
          {user && (
            <>
              <p className="text-xs text-gray-500 mb-2">Logged in as</p>
              <p className="text-sm font-medium text-gray-900 mb-4 truncate">{user.name}</p>
            </>
          )}
          <button
            onClick={handleLogoutClick}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 min-h-[40px] rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
