import { useState, useSyncExternalStore } from 'react';
import { isStandaloneDisplay, readPwaInstalled } from '../utils/displayMode';
import {
  subscribePwaInstallPrompt,
  getPwaInstallPromptSnapshot,
  getPwaInstallPromptServerSnapshot,
  invokePwaInstallPrompt,
} from '../utils/pwaInstallPrompt';

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

// ── Open installed PWA helper ────────────────────────────────────────────────
// Browsers cannot directly launch an installed PWA from an in-tab navigation.
// window.open with _blank gives Chromium a chance to route to the standalone
// PWA window when scope matches; if the user is still in-browser after a beat
// we show a toast telling them to open from their home screen / app drawer.
let openToastTimer = null;
function showOpenAppToast() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('pt-open-app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'pt-open-app-toast';
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:24px', 'transform:translateX(-50%)',
    'z-index:9999', 'max-width:90vw', 'padding:12px 16px',
    'background:#1c350a', 'color:#c8e875',
    'border:1px solid rgba(145,190,77,0.5)', 'border-radius:12px',
    'box-shadow:0 6px 24px rgba(0,0,0,0.25)',
    'font-size:13px', 'font-weight:600', 'line-height:1.4',
    'text-align:center',
  ].join(';');
  toast.textContent = 'PickleTracker is installed — open it from your home screen or app drawer.';

  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4500);
}

function openInstalledPwa() {
  if (typeof window === 'undefined') return;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const origin = window.location.origin;
  const fallbackUrl = `${origin}/?source=pwa`;

  const armToast = () => {
    if (openToastTimer) clearTimeout(openToastTimer);
    openToastTimer = setTimeout(() => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        showOpenAppToast();
      }
    }, 1500);
  };

  if (isAndroid) {
    // Android intent without forced package — OS shows the installed WebAPK
    // alongside Chrome in the chooser, letting the user pick the PWA.
    const host = window.location.host;
    const intentUrl = `intent://${host}/?source=pwa#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
    try {
      window.location.href = intentUrl;
    } catch {
      window.location.href = fallbackUrl;
    }
    armToast();
    return;
  }

  if (isIOS) {
    // iOS Safari has no API to launch an installed PWA. Just hint the user.
    showOpenAppToast();
    return;
  }

  // Desktop Chrome / Edge: opening in a new top-level window can route to the
  // installed PWA window when scope matches; if it ends up as a normal tab,
  // the toast tells the user to launch from their app drawer.
  try {
    const win = window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = fallbackUrl;
      return;
    }
  } catch {
    window.location.href = fallbackUrl;
    return;
  }
  armToast();
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
  const installSnapshot = useSyncExternalStore(
    subscribePwaInstallPrompt,
    getPwaInstallPromptSnapshot,
    getPwaInstallPromptServerSnapshot
  );
  const { isAndroid, isChromeiOS, isSafariIOS, isAndroidFirefox, isStandalone } = detectBrowser();
  const [installing, setInstalling] = useState(false);

  const isInstalledFlag = readPwaInstalled();
  // Only show "Open App" when browsing in regular browser AND app is known installed
  const isInstalled = isInstalledFlag && !isStandalone;

  const hasNativePrompt = installSnapshot === 'native';
  const installFinished = installSnapshot === 'done';

  const trigger = async (onAccepted) => {
    setInstalling(true);
    await invokePwaInstallPrompt(onAccepted);
    setInstalling(false);
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
  const action = installFinished || isStandalone
    ? null
    : hasNativePrompt
      ? 'native'
      : browserType
        ? 'manual'
        : null;

  return { action, browserType, trigger, isInstalled, installing, isStandalone };
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
export default function InstallAppButton({ variant = 'default', compact = false }) {
  const { action, browserType, trigger, isInstalled, installing } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (!action && !isInstalled) return null;

  const handleClick = () => {
    if (isInstalled) { openInstalledPwa(); return; }
    if (action === 'native') { trigger(); return; }
    setShowModal(true);
  };

  const nativeHint =
    'Opens your browser install prompt (add PickleTracker to your device).';
  const manualHint = 'Shows steps to add PickleTracker to your home screen.';
  const openHint = 'Open PickleTracker in the installed app.';

  const label = installing ? 'Installing…' : isInstalled ? 'Open App' : 'Install App';

  const inner = (
    <>
      {installing ? (
        <svg className="w-4 h-4 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isInstalled ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          )}
        </svg>
      )}
      <span className={compact ? 'hidden xl:inline' : ''}>{label}</span>
    </>
  );

  const tooltip = isInstalled ? openHint : action === 'native' ? nativeHint : manualHint;
  const installAria = isInstalled
    ? 'Open PickleTracker in the installed app'
    : action === 'native'
      ? 'Install PickleTracker using the browser install prompt'
      : 'Install PickleTracker — show how-to steps';

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          title={tooltip}
          aria-label={installAria}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] transition-colors text-left text-sm font-semibold text-[#4a6e10] disabled:opacity-60 disabled:cursor-wait"
        >
          {inner}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={installing}
          title={tooltip}
          aria-label={installAria}
          className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg border border-[#91BE4D]/40 bg-[#f4f8e8] hover:bg-[#eaf3d4] text-[#4a6e10] transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-wait ${
            compact ? 'px-2 py-1.5 xl:px-3' : 'px-3 py-1.5'
          }`}
        >
          {inner}
        </button>
      )}
      {showModal && <InstallModal browserType={browserType} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ── Slim top banner (above Navbar) ───────────────────────────────────────────
function readBannerDismissed() {
  try { return sessionStorage.getItem('installBannerDismissed') === '1'; } catch { return false; }
}
function writeBannerDismissed() {
  try { sessionStorage.setItem('installBannerDismissed', '1'); } catch { /* ignore */ }
}

export function InstallBanner() {
  const { action, browserType, trigger, isInstalled, installing, isStandalone } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(readBannerDismissed);
  const [showModal, setShowModal] = useState(false);

  // Never show banner when already running as installed PWA
  if (isStandalone || (!action && !isInstalled) || dismissed) return null;

  const dismiss = () => { writeBannerDismissed(); setDismissed(true); };

  const handleInstall = () => {
    if (isInstalled) { openInstalledPwa(); return; }
    if (action === 'native') { trigger(dismiss); return; }
    setShowModal(true);
  };

  const subtitleText = installing
    ? 'Installing…'
    : isInstalled
      ? 'Installed on this device'
      : browserType === 'ios-safari' || browserType === 'ios-chrome'
        ? 'Add to iPhone'
        : browserType === 'android' || browserType === 'android-firefox'
          ? 'Add to Android'
          : 'Add to Desktop';

  const buttonLabel = installing
    ? 'Installing…'
    : isInstalled
      ? 'Open App'
      : 'Use App';

  return (
    <>
      <div
        className="w-full flex items-center justify-between gap-2 px-3 py-2"
        style={{ background: 'linear-gradient(to right, #1c350a, #2d6e05 60%, #4a8c10)' }}
        role="banner"
      >
        {/* Logo + name */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex-shrink-0 rounded-xl flex items-center justify-center shadow"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #4a8c10 100%)',
              border: '1.5px solid rgba(145,190,77,0.5)',
            }}
          >
            <span style={{ color: '#c8e875', fontSize: 11, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>PT</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs leading-tight">PickleTracker</p>
            <p className="text-[#91BE4D] text-[10px] leading-tight truncate">{subtitleText}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#1c350a] bg-[#c8e875] hover:bg-[#d6f085] transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
          >
            {installing && (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install banner"
            className="text-white/50 hover:text-white p-1 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
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
  const { action, browserType, trigger, isInstalled, installing } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(readInstallCardDismissed);

  if ((!action && !isInstalled) || dismissed) return null;

  const dismiss = () => {
    writeInstallCardDismissed();
    setDismissed(true);
  };

  const handleInstall = () => {
    if (isInstalled) { openInstalledPwa(); return; }
    if (action === 'native') { trigger(dismiss); return; }
    setShowModal(true);
  };

  const isIOS = browserType === 'ios-safari' || browserType === 'ios-chrome';

  const cardSubtitle = installing
    ? 'Installing PickleTracker — confirm in your browser dialog…'
    : isInstalled
      ? 'PickleTracker is installed on this device. Tap Open App to launch it.'
      : action === 'native'
        ? "Tap Install to open your browser's install prompt (Chrome, Edge, Samsung Internet, and similar)."
        : isIOS
          ? 'Add to Home Screen for a full-screen experience. Tap How to for steps.'
          : 'Install for faster load times and a native app feel. Tap How to if your browser does not show a one-tap install yet.';

  const primaryTitle = isInstalled
    ? 'Open PickleTracker in the installed app'
    : action === 'native'
      ? "Opens your browser's install dialog to add PickleTracker"
      : 'Show step-by-step instructions to add PickleTracker';

  const primaryAria = isInstalled
    ? 'Open PickleTracker in the installed app'
    : action === 'native'
      ? 'Install PickleTracker using the browser install prompt'
      : 'Show how to install PickleTracker on this device';

  const primaryLabel = installing
    ? 'Installing…'
    : isInstalled
      ? 'Open App'
      : action === 'native'
        ? 'Install'
        : 'How to';

  const cardTitle = isInstalled ? 'Open the PickleTracker app' : 'Get the PickleTracker app';

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
            <p className="text-white text-sm font-bold leading-tight">{cardTitle}</p>
            <p className="text-[#91BE4D] text-xs mt-0.5 leading-snug">
              {cardSubtitle}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              title={primaryTitle}
              aria-label={primaryAria}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#1c350a] transition-opacity hover:opacity-90 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
              style={{ background: 'linear-gradient(to right, #c8e875, #91BE4D)' }}
            >
              {installing ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  {isInstalled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  )}
                </svg>
              )}
              {primaryLabel}
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
