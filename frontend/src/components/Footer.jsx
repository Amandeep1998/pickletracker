import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a01] mt-auto">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">

          {/* Brand */}
          <div>
            <div className="flex items-baseline gap-0.5 mb-3">
              <span className="text-lg font-bold text-[#91BE4D]">Pickle</span>
              <span className="text-lg font-bold text-[#ec9937]">Tracker</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              India's tournament finance tracker for pickleball players. Log matches, track earnings, and grow your game.
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Explore</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/dashboard" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Tournaments
                </Link>
              </li>
              <li>
                <Link to="/calendar" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Calendar
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy-policy" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">
            &copy; {year} PickleTracker. Built for the community.
          </p>
          <p className="text-xs text-gray-600">
            Made with love for Indian pickleball players
          </p>
        </div>
      </div>
    </footer>
  );
}
