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
        ? 'text-green-600 bg-green-50 border-l-4 border-green-600'
        : 'text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        <span className={`h-0.5 w-6 bg-gray-700 transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`h-0.5 w-6 bg-gray-700 transition-all ${isOpen ? 'opacity-0' : ''}`}></span>
        <span className={`h-0.5 w-6 bg-gray-700 transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
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
        className={`fixed left-0 top-16 h-screen w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>

        {/* Navigation Links */}
        <nav className="pt-8 space-y-1">
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
            to="/calendar"
            className={navLinkClass}
            onClick={() => setIsOpen(false)}
          >
            Calendar
          </NavLink>
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 p-4">
          {user && (
            <>
              <p className="text-xs text-gray-500 mb-3">Logged in as</p>
              <p className="text-sm font-medium text-gray-900 mb-4 truncate">{user.username}</p>
            </>
          )}
          <button
            onClick={handleLogoutClick}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
