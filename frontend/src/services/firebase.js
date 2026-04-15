import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { saveCalendarToken } from './googleCalendar';

/**
 * Heuristic for mobile browsers where popup auth may be flaky.
 */
export function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}


export function isFirebaseClientConfigured() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

function getFirebaseApp() {
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    ...(measurementId ? { measurementId } : {}),
  };
  if (!getApps().length) {
    return initializeApp(config);
  }
  return getApps()[0];
}

function shouldFallbackToRedirect(error) {
  const code = error?.code || '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/operation-not-supported-in-this-environment'
  );
}

/**
 * Opens Google sign-in and returns Firebase ID token + profile fields.
 * Uses popup first for faster completion, and on mobile falls back to redirect
 * when popup cannot be used.
 */
export async function signInWithGoogleAndGetCredentials() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    const name = result.user.displayName || '';
    const email = result.user.email || '';
    return { idToken, name, email };
  } catch (err) {
    // On mobile, retry with redirect if popup cannot complete in this browser.
    if (isMobileBrowser() && shouldFallbackToRedirect(err)) {
      await signInWithRedirect(auth, provider);
      return null; // redirect navigation takes over
    }
    throw err;
  }
}

/**
 * Subscribes to Firebase auth state changes.
 * Fires immediately with the current user (or null), then again on every change.
 * Returns an unsubscribe function.
 *
 * This is used on mobile to detect when signInWithRedirect completes — Firebase
 * updates onAuthStateChanged reliably even when getRedirectResult() returns null
 * (common on iOS Safari due to storage restrictions).
 */
export function onFirebaseAuthStateChanged(callback) {
  if (!isFirebaseClientConfigured()) {
    // Call once with null so callers can set their loading state
    callback(null);
    return () => {};
  }
  const auth = getAuth(getFirebaseApp());
  return onAuthStateChanged(auth, callback);
}

/**
 * Reads Google redirect result credentials after returning from signInWithRedirect.
 * Returns null when no redirect result is available.
 */
export async function getGoogleRedirectCredentials() {
  if (!isFirebaseClientConfigured()) return null;
  const auth = getAuth(getFirebaseApp());
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  const idToken = await result.user.getIdToken();
  const name = result.user.displayName || '';
  const email = result.user.email || '';
  return { idToken, name, email };
}

/**
 * Signs the current user out of Firebase.
 * Must be called on logout to prevent onAuthStateChanged from auto-logging
 * Google users back in on the next page load.
 */
export async function firebaseSignOut() {
  if (!isFirebaseClientConfigured()) return;
  try {
    const auth = getAuth(getFirebaseApp());
    await signOut(auth);
  } catch {
    // Ignore — Firebase sign-out failure should not block our app logout
  }
}

/**
 * Opens Google sign-in popup requesting Calendar access scope.
 * Works for both manual and Google sign-in users — it's a separate OAuth request.
 * Stores the access token + expiry in localStorage.
 */
export async function connectGoogleCalendar() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential.accessToken;

  saveCalendarToken(accessToken);
  return accessToken;
}

/**
 * Silently refreshes the Google Calendar access token without showing a popup.
 * Uses prompt=none — works if the user is still signed in to Google and has
 * already granted calendar permission. Throws if silent auth is not possible.
 */
export async function silentlyRefreshCalendarToken() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured.');
  }
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');
  // prompt=none: no UI shown — if the user is already signed in + already
  // granted calendar scope, Google returns a new token immediately
  provider.setCustomParameters({ prompt: 'none' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential.accessToken;

  saveCalendarToken(accessToken);
  return accessToken;
}
