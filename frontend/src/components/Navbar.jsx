import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, handleLogout } = useAuth();
  const navigate = useNavigate();

  const logout = () => {
    handleLogout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-green-600' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand with Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-3 flex-shrink-0">
          <img
            src="/logo.svg"
            alt="PickleTracker"
            className="h-10 w-10 object-contain"
          />
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold text-green-600">Pickle</span>
            <span className="text-lg font-bold text-orange-500">Tracker</span>
          </div>
        </NavLink>

        {/* Links */}
        <div className="flex items-center gap-8">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/tournaments" className={linkClass}>
            Tournaments
          </NavLink>
          <NavLink to="/calendar" className={linkClass}>
            Calendar
          </NavLink>
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user?.username}
          </span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-md font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
