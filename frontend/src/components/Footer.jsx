import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1c1c02] mt-auto">
      {/* Mobile: compact single bar */}
      <div className="sm:hidden px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-600">&copy; {year} PickleTracker</p>
        <div className="flex items-center gap-4">
          <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-[#91BE4D] transition-colors">Privacy</Link>
          <Link to="/terms"          className="text-xs text-gray-500 hover:text-[#91BE4D] transition-colors">Terms</Link>
        </div>
      </div>

      {/* Desktop: full layout */}
      <div className="hidden sm:block max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-12">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <BrandLogo size="lg" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              India's tournament finance tracker for pickleball players. Log matches, track earnings, and grow your game.
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] mb-4">Explore</p>
            <ul className="space-y-2.5">
              {[['Dashboard', '/dashboard'], ['Tournaments', '/tournaments'], ['Calendar', '/calendar']].map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] mb-4">Legal</p>
            <ul className="space-y-2.5">
              {[['Privacy Policy', '/privacy-policy'], ['Terms of Service', '/terms']].map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">&copy; {year} PickleTracker. Built for the community.</p>
          <p className="text-xs text-gray-600">Made with love for Indian pickleball players.</p>
        </div>
      </div>
    </footer>
  );
}
