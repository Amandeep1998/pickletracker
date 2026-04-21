import { useState, useEffect } from 'react';

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  useEffect(() => {
    if (isStandalone) { setInstalled(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone]);

  const trigger = async (onAccepted) => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); onAccepted?.(); }
    setDeferredPrompt(null);
  };

  const available = !installed && !isStandalone && (isIOS || !!deferredPrompt);
  return { available, isIOS, trigger };
}

function IOSModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Install PickleTracker</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5">Add PickleTracker to your home screen in two quick steps:</p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-[#91BE4D] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tap the Share button</p>
              <p className="text-xs text-gray-500 mt-0.5">The share icon at the bottom of Safari</p>
              <svg className="w-7 h-7 mt-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-[#91BE4D] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tap "Add to Home Screen"</p>
              <p className="text-xs text-gray-500 mt-0.5">Scroll down in the share sheet to find it</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add to Home Screen
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/** Compact button — used in Navbar and MobileMenu */
export default function InstallAppButton({ variant = 'default' }) {
  const { available, isIOS, trigger } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!available) return null;

  const handleClick = () => {
    if (isIOS) { setShowIOSModal(true); return; }
    trigger();
  };

  const inner = (
    <>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>Install App</span>
    </>
  );

  return (
    <>
      {variant === 'menu' ? (
        <button
          onClick={handleClick}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] transition-colors text-left text-sm font-semibold text-[#4a6e10]"
        >
          {inner}
        </button>
      ) : (
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] text-[#4a6e10] transition-colors whitespace-nowrap"
        >
          {inner}
        </button>
      )}
      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

/** Rich install card — used on the Dashboard */
export function InstallAppCard() {
  const { available, isIOS, trigger } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('installCardDismissed') === '1'
  );

  if (!available || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('installCardDismissed', '1');
    setDismissed(true);
  };

  const handleInstall = () => {
    if (isIOS) { setShowIOSModal(true); return; }
    trigger(dismiss);
  };

  return (
    <>
      <div className="relative rounded-2xl border border-[#91BE4D]/30 bg-[#f4f8e8] px-4 py-4 mb-4 flex items-center gap-4 overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute right-0 top-0 w-32 h-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 50%, #91BE4D, transparent 70%)' }} />

        {/* App icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1c350a, #2d6e05)' }}>
          <svg width="28" height="28" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <circle cx="40" cy="40" r="32" fill="#C8D636" opacity="0.3" />
            {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52]].map(([cx,cy],i)=>(
              <circle key={i} cx={cx} cy={cy} r="3" fill="#C8D636" opacity="0.9"/>
            ))}
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1c350a]">Get the PickleTracker app</p>
          <p className="text-xs text-[#4a6e10] mt-0.5 leading-snug">
            {isIOS
              ? 'Add to your Home Screen for a full-screen experience'
              : 'Install for faster load times and offline access'}
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 60%, #ec9937)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {isIOS ? 'How to install' : 'Install'}
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-[#4a6e10]/50 hover:text-[#4a6e10] p-1 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
    </>
  );
}
