import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { T } from './theme';
import { APP_NAME } from '../../utils/featureFlags';
import { isStandaloneDisplay, readPwaInstalled, markPwaInstalled } from '../../utils/displayMode';
import {
  subscribePwaInstallPrompt,
  getPwaInstallPromptSnapshot,
  getPwaInstallPromptServerSnapshot,
  invokePwaInstallPrompt,
} from '../../utils/pwaInstallPrompt';

/**
 * Companion-themed PWA install. Reuses the app-wide install LOGIC (the
 * beforeinstallprompt capture store, standalone/installed detection) but renders
 * in the chat's navy + lime theme instead of the green InstallAppButton family.
 */

function detectBrowser() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isChromeiOS = isIOS && /CriOS/i.test(ua);
  const isSafariIOS = isIOS && !isChromeiOS;
  const isAndroidFirefox = isAndroid && /Firefox/i.test(ua);
  return { isIOS, isAndroid, isChromeiOS, isSafariIOS, isAndroidFirefox, isStandalone: isStandaloneDisplay() };
}

export function useCompanionInstall() {
  const snapshot = useSyncExternalStore(
    subscribePwaInstallPrompt,
    getPwaInstallPromptSnapshot,
    getPwaInstallPromptServerSnapshot
  );
  const { isAndroid, isChromeiOS, isSafariIOS, isAndroidFirefox, isStandalone } = detectBrowser();
  const [installing, setInstalling] = useState(false);

  const hasNativePrompt = snapshot === 'native';
  const installFinished = snapshot === 'done';
  const isInstalled = readPwaInstalled() && !isStandalone;

  const browserType = isSafariIOS
    ? 'ios-safari'
    : isChromeiOS
      ? 'ios-chrome'
      : isAndroidFirefox
        ? 'android-firefox'
        : isAndroid
          ? 'android'
          : null;

  // 'native' = one-tap browser prompt; 'manual' = show step-by-step sheet.
  const action = installFinished || isStandalone || isInstalled
    ? null
    : hasNativePrompt
      ? 'native'
      : browserType
        ? 'manual'
        : null;

  const trigger = async (onAccepted) => {
    setInstalling(true);
    await invokePwaInstallPrompt(onAccepted);
    setInstalling(false);
  };

  return { action, browserType, trigger, installing, isStandalone, isInstalled };
}

const STEPS = {
  'ios-safari': {
    label: 'Safari on iPhone / iPad',
    steps: [
      'Tap the Share button (square with an up-arrow).',
      'Scroll and tap “Add to Home Screen”.',
      `Tap “Add” — ${APP_NAME} lands on your home screen.`,
    ],
  },
  'ios-chrome': {
    label: 'Chrome on iPhone',
    steps: [
      'Tap the three-dot menu.',
      'Tap “Add to Home Screen”.',
      `Tap “Add” — ${APP_NAME} lands on your home screen.`,
    ],
  },
  android: {
    label: 'Chrome / Samsung Internet on Android',
    steps: [
      'Tap the three-dot menu.',
      'Tap “Install app” or “Add to Home screen”.',
      'Confirm — it installs like a native app.',
    ],
  },
  'android-firefox': {
    label: 'Firefox on Android',
    steps: [
      'Tap the three-dot menu.',
      'Tap “Install” or “Add to Home screen”.',
      'Confirm to add it to your home screen.',
    ],
  },
};

export function InstallStepsModal({ browserType, onClose }) {
  const config = STEPS[browserType];
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!config) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: T.navy2,
          border: `1px solid ${T.navy3}`,
          borderRadius: '18px 18px 0 0',
          padding: 20,
          fontFamily: T.font,
          color: T.white,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>📲 Install {APP_NAME}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 20, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: T.lime, fontWeight: 700, marginTop: 2 }}>{config.label}</div>

        <ol style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {config.steps.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: T.lime,
                  color: T.navy,
                  fontWeight: 800,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{s}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 18,
            width: '100%',
            padding: '11px 0',
            borderRadius: 12,
            border: 'none',
            background: T.lime,
            color: T.navy,
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

const BANNER_KEY = 'companionInstallBannerDismissed';

export function InstallTopBanner({ onInstall }) {
  const { action, installing } = useCompanionInstall();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(BANNER_KEY) === '1'; } catch { return false; }
  });

  if (!action || dismissed) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 16px',
        background: 'rgba(196,245,59,0.22)',
        borderBottom: `1px solid ${T.lime2}`,
        fontFamily: T.font,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, minWidth: 0 }}>
        📲 Install {APP_NAME} for a full-screen, one-tap app.
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onInstall?.()}
          disabled={installing}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            background: T.lime,
            color: T.navy,
            fontFamily: T.font,
            fontWeight: 800,
            fontSize: 12.5,
            cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.6 : 1,
          }}
        >
          {installing ? 'Installing…' : 'Install'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 16, cursor: 'pointer', padding: 4 }}
        >
          ✕
        </button>
      </span>
    </div>
  );
}
