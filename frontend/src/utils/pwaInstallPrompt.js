import { isStandaloneDisplay } from './displayMode';

/**
 * Capture `beforeinstallprompt` as early as possible (before React effects run).
 * Chromium (Android Chrome, desktop Chrome, Edge, etc.) can then show the real
 * install UI via `prompt()` on a user click. iOS WebKit does not support this API.
 */
const listeners = new Set();

let deferredEvent = null;
let installDone = false;

function snapshot() {
  if (typeof window === 'undefined') return 'done';
  if (isStandaloneDisplay()) return 'done';
  if (installDone) return 'done';
  if (deferredEvent) return 'native';
  return 'idle';
}

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function onBeforeInstallPrompt(e) {
  e.preventDefault();
  deferredEvent = e;
  notify();
}

function onAppInstalled() {
  deferredEvent = null;
  installDone = true;
  notify();
}

let initialized = false;

export function initPwaInstallPromptCapture() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
}

export function subscribePwaInstallPrompt(onStoreChange) {
  listeners.add(onStoreChange);
  onStoreChange();
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getPwaInstallPromptServerSnapshot() {
  return 'idle';
}

export function getPwaInstallPromptSnapshot() {
  return snapshot();
}

/**
 * Must be called from a direct user gesture (click/tap). Opens the browser install dialog.
 * @returns {Promise<{ outcome: string } | undefined>}
 */
export async function invokePwaInstallPrompt(onAccepted) {
  if (!deferredEvent) return undefined;
  const e = deferredEvent;
  deferredEvent = null;
  notify();

  try {
    await e.prompt();
    const choice = await e.userChoice;
    if (choice && choice.outcome === 'accepted') {
      installDone = true;
      onAccepted?.();
      notify();
    } else {
      notify();
    }
    return choice;
  } catch {
    notify();
    return undefined;
  }
}

// Auto-init when this module loads (main.jsx imports us first).
initPwaInstallPromptCapture();
