import { useState, useEffect } from 'react';
import { isStandaloneDisplay } from '../utils/displayMode';

// ── PT logo — matches the app icon / FAB branding ────────────────────────────
function PTLogo({ size = 44 }) {
  return (
    <div
      className="flex-shrink-0 rounded-2xl flex items-center justify-center shadow-md"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #4a8c10 100%)',
        border: '1.5px solid rgba(145,190,77,0.35)',
      }}
    >
      <span
        style={{
          color: '#c8e875',
          fontSize: size * 0.34,
          fontWeight: 900,
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        PT
      </span>
    </div>
  );
}

// ── Browser detection ─────────────────────────────────────────────────────────
function detectBrowser() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChromeiOS = isIOS && /CriOS/i.test(ua);
  const isSafariIOS = isIOS && !isChromeiOS;
  const isAndroidFirefox = isAndroid && /Firefox/i.test(ua);
  const isStandalone = isStandaloneDisplay();
  return { isIOS, isAndroid, isChromeiOS, isSafariIOS, isAndroidFirefox, isStandalone };
}

// ── Install prompt hook ───────────────────────────────────────────────────────
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const { isAndroid, isChromeiOS, isSafariIOS, isAndroidFirefox, isStandalone } = detectBrowser();

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

  const browserType = isSafariIOS
    ? 'ios-safari'
    : isChromeiOS
      ? 'ios-chrome'
      : isAndroidFirefox
        ? 'android-firefox'
        : isAndroid
          ? 'android'
          : null;
  const action = installed || isStandalone ? null
    : deferredPrompt ? 'native'
    : browserType ? 'manual'
    : null;

  return { action, browserType, trigger };
}

// ── Step-by-step install modal ────────────────────────────────────────────────
const STEPS = {
  'ios-safari': {
    label: 'Safari on iPhone or iPad',
    steps: [
      {
        title: 'Tap the Share button',
        desc: 'The share icon (square with an arrow). On iPhone it is usually at the bottom of Safari; on iPad it is often at the top-right.',
        icon: (
          <div className="mt-2 w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Tap "Add to Home Screen"',
        desc: 'Scroll the share sheet if you do not see it right away — it is below the top actions.',
        chip: 'Add to Home Screen',
      },
      {
        title: 'Tap "Add"',
        desc: 'PickleTracker will appear on your home screen',
      },
    ],
  },
  'ios-chrome': {
    label: 'Chrome on iPhone',
    steps: [
      {
        title: 'Tap the three-dot menu',
        desc: 'Usually bottom-right on iPhone; top-right on iPad.',
        icon: (
          <div className="mt-2 w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Tap "Add to Home Screen"',
        desc: 'Scroll the menu if you do not see it immediately.',
        chip: 'Add to Home Screen',
      },
      {
        title: 'Tap "Add"',
        desc: 'PickleTracker will appear on your home screen',
      },
    ],
  },
  'android': {
    label: 'Chrome or Samsung Internet on Android',
    steps: [
      {
        title: 'Tap the three-dot menu',
        desc: 'Usually top-right in Chrome; on some phones the menu is at the bottom. Samsung Internet uses a similar menu icon.',
        icon: (
          <div className="mt-2 w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Tap "Install app", "Add to Home screen", or similar',
        desc: 'Wording varies by phone and browser; any option that adds PickleTracker to your home screen is correct.',
        chip: 'Install app',
      },
      {
        title: 'Confirm Install or Add',
        desc: 'PickleTracker will appear on your home screen like a native app.',
      },
    ],
  },
  'android-firefox': {
    label: 'Firefox on Android',
    steps: [
      {
        title: 'Tap the three-dot menu',
        desc: 'Top-right corner of Firefox.',
        icon: (
          <div className="mt-2 w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
        ),
      },
      {
        title: 'Tap "Install" or "Add to Home screen"',
        desc: 'If you only see "Add to Home screen", use that — it does the same job.',
        chip: 'Install',
      },
      {
        title: 'Confirm',
        desc: 'PickleTracker will appear on your home screen.',
      },
    ],
  },
};

function InstallModal({ browserType, onClose }) {
  const config = STEPS[browserType];
  if (!config) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 pt-6 pb-5 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #4a8c10 100%)' }}
        >
          <PTLogo size={48} />
          <div className="flex-1 min-w-0">
            <p id="install-modal-title" className="text-white font-bold text-base leading-tight">Install PickleTracker</p>
            <p className="text-[#91BE4D] text-xs font-medium mt-0.5">{config.label}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/50 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 space-y-5">
          {config.steps.map((s, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D)' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                {s.icon}
                {s.chip && (
                  <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {s.chip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — .install-modal-footer: cascade safe-area for older WebKit */}
        <div className="px-5 install-modal-footer">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact button (Navbar / MobileMenu) ──────────────────────────────────────
export default function InstallAppButton({ variant = 'default' }) {
  const { action, browserType, trigger } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (!action) return null;

  const handleClick = () => {
    if (action === 'native') { trigger(); return; }
    setShowModal(true);
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
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] transition-colors text-left text-sm font-semibold text-[#4a6e10]"
        >
          {inner}
        </button>
      ) : (
        <button
          onClick={handleClick}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] text-[#4a6e10] transition-colors whitespace-nowrap"
        >
          {inner}
        </button>
      )}
      {showModal && <InstallModal browserType={browserType} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ── Rich install card (Dashboard) ─────────────────────────────────────────────
function readInstallCardDismissed() {
  try {
    return sessionStorage.getItem('installCardDismissed') === '1';
  } catch {
    return false;
  }
}

function writeInstallCardDismissed() {
  try {
    sessionStorage.setItem('installCardDismissed', '1');
  } catch { /* private mode / storage blocked */ }
}

export function InstallAppCard() {
  const { action, browserType, trigger } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(readInstallCardDismissed);

  if (!action || dismissed) return null;

  const dismiss = () => {
    writeInstallCardDismissed();
    setDismissed(true);
  };

  const handleInstall = () => {
    if (action === 'native') { trigger(dismiss); return; }
    setShowModal(true);
  };

  const isIOS = browserType === 'ios-safari' || browserType === 'ios-chrome';

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm border border-[#91BE4D]/20"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 55%, #4a8c10 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute pointer-events-none" style={{ top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(145,190,77,0.12)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(236,153,55,0.1)' }} />

        <div className="relative flex items-center space-x-3 px-4 py-4">
          <PTLogo size={44} />

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold leading-tight">Get the PickleTracker app</p>
            <p className="text-[#91BE4D] text-xs mt-0.5 leading-snug">
              {isIOS ? 'Add to Home Screen for a full-screen experience' : 'Install for faster load times and a native app feel'}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#1c350a] transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ background: 'linear-gradient(to right, #c8e875, #91BE4D)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {action === 'native' ? 'Install' : 'How to'}
            </button>
            <button
              onClick={dismiss}
              className="text-white/40 hover:text-white/70 p-1.5 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showModal && <InstallModal browserType={browserType} onClose={() => setShowModal(false)} />}
    </>
  );
}
