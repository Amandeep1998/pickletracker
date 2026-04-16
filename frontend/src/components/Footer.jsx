import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const supportEmail = 'pickletracker.app@gmail.com';
  const instagramUrl = 'https://www.instagram.com/pickletracker/';

  return (
    <footer className="bg-[#1c1c02] mt-auto">
      {/* Mobile */}
      <div className="sm:hidden px-5 py-8 space-y-6">
        <div className="rounded-[28px] bg-[#121c2c] px-5 py-6">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white mb-4">Get in touch</p>
          <a href={`mailto:${supportEmail}`} className="block text-[15px] text-slate-300 break-all hover:text-white transition-colors">
            {supportEmail}
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-lg font-medium text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
          >
            <InstagramIcon />
            <span>Follow us</span>
          </a>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-600">&copy; {year} PickleTracker</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-[#91BE4D] transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-gray-500 hover:text-[#91BE4D] transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:block max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-12">
          <div>
            <div className="mb-4">
              <BrandLogo size="lg" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              India's pickleball performance journal. Log sessions, track tournaments, manage gear, and grow your game.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] mb-4">Explore</p>
            <ul className="space-y-2.5">
              {[['Dashboard', '/dashboard'], ['Tournaments', '/tournaments'], ['Calendar', '/calendar'], ['Journal', '/sessions'], ['Gear', '/expenses']].map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="rounded-[28px] bg-[#121c2c] px-6 py-6">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-white mb-4">Get in touch</p>
              <a href={`mailto:${supportEmail}`} className="block text-[15px] text-slate-300 break-all hover:text-white transition-colors">
                {supportEmail}
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 text-lg font-medium text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
              >
                <InstagramIcon />
                <span>Follow us</span>
              </a>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <Link to="/privacy-policy" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-400 hover:text-[#91BE4D] transition-colors">Terms of Service</Link>
            </div>
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
