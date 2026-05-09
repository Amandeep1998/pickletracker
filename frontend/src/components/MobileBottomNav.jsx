import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomeIcon = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'text-[#91BE4D]' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    {active
      ? <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    }
  </svg>
);

const CalendarIcon = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'text-[#91BE4D]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    {active && <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />}
  </svg>
);

const ChartIcon = ({ active }) => (
  <svg className={`w-5 h-5 ${active ? 'text-[#91BE4D]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UserIcon = ({ photoUrl, name, active }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || ''}
        className={`w-6 h-6 rounded-full object-cover ${active ? 'ring-2 ring-[#91BE4D]' : 'ring-1 ring-gray-200'}`}
      />
    );
  }
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${active ? 'ring-2 ring-[#91BE4D]' : ''}`}
      style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  );
};

export default function MobileBottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false); }, [location.pathname]);

  // Close sheet on back gesture / hardware back
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e) => { e.preventDefault(); setSheetOpen(false); };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [sheetOpen]);

  const isActive = (path) => location.pathname === path;

  const navItem = (to, label, icon) => (
    <NavLink
      to={to}
      className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 min-w-0"
      aria-label={label}
    >
      {icon}
      <span className={`text-[9px] font-semibold leading-none ${isActive(to) ? 'text-[#91BE4D]' : 'text-gray-400'}`}>
        {label}
      </span>
    </NavLink>
  );

  return (
    <>
      {/* Action sheet backdrop */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Action sheet */}
      <div
        className={`fixed left-0 right-0 z-50 px-4 transition-all duration-300 ease-out lg:hidden ${
          sheetOpen ? 'bottom-[4.5rem] opacity-100 translate-y-0' : 'bottom-[4.5rem] opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-100">
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">What would you like to log?</p>
          </div>
          <div className="p-3 space-y-2">
            <button
              onClick={() => { setSheetOpen(false); navigate('/calendar', { state: { openAdd: 'tournament' } }); }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-[#f4f8e8] active:bg-[#e8f2d0] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1c350a]">Log Tournament</p>
                <p className="text-xs text-gray-500 mt-0.5">Entry fee, prize money, medals</p>
              </div>
            </button>

            <button
              onClick={() => { setSheetOpen(false); navigate('/calendar', { state: { openAdd: 'session' } }); }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ec9937, #f5c26b)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#1c350a]">Log Session</p>
                <p className="text-xs text-gray-500 mt-0.5">Practice, drills, court fees</p>
              </div>
            </button>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={() => setSheetOpen(false)}
              className="w-full py-2.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-end h-14 px-1">
          {navItem('/home', 'Home', <HomeIcon active={isActive('/home')} />)}
          {navItem('/calendar', 'Calendar', <CalendarIcon active={isActive('/calendar')} />)}

          {/* FAB — center, raised above bar */}
          <div className="flex flex-col items-center justify-end flex-1 pb-1">
            <button
              onClick={() => setSheetOpen((v) => !v)}
              aria-label="Log tournament or session"
              aria-expanded={sheetOpen}
              className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/25 transition-all duration-200 active:scale-95 mb-0.5 ${
                sheetOpen ? 'scale-90 shadow-none' : ''
              }`}
              style={{
                width: '52px',
                height: '52px',
                background: sheetOpen
                  ? 'linear-gradient(135deg, #1c350a, #2d7005)'
                  : 'linear-gradient(135deg, #2d7005, #91BE4D 60%, #ec9937)',
              }}
            >
              <svg
                className={`w-6 h-6 text-white transition-transform duration-200 ${sheetOpen ? 'rotate-45' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <span className={`text-[9px] font-semibold leading-none ${sheetOpen ? 'text-[#91BE4D]' : 'text-gray-400'}`}>Log</span>
          </div>

          {navItem('/dashboard', 'Stats', <ChartIcon active={isActive('/dashboard')} />)}
          {navItem('/profile', 'Profile', <UserIcon photoUrl={user?.profilePhoto} name={user?.name} active={isActive('/profile')} />)}
        </div>
      </nav>
    </>
  );
}
