import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { saveCalendarToken } from './googleCalendar';

/**
 * Mobile browsers (especially iOS Safari) block popups that are opened
 * outside of a direct synchronous user gesture.  Firebase's async flow
 * breaks that requirement, so we use redirect on all mobile devices and
 * fall back to popup only on desktop.
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

/**
 * Opens Google sign-in and returns the Firebase ID token plus profile fields for the API.
 * On mobile, uses redirect (no popup) to avoid browser popup-blocking.
 * On mobile the function initiates the redirect and never resolves — the result
 * is picked up on the next page load via getGoogleRedirectResult().
 */
export async function signInWithGoogleAndGetCredentials() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isMobileBrowser()) {
    // Mobile browsers block popups that open outside a synchronous user gesture.
    // signInWithRedirect navigates the page to Google — it never returns here.
    await signInWithRedirect(auth, provider);
    return null; // unreachable, but satisfies linters
  }

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  const name = result.user.displayName || '';
  const email = result.user.email || '';
  return { idToken, name, email };
}

/**
 * Called on app mount to pick up the result of a previous signInWithRedirect call.
 * Returns { idToken, name, email } if a redirect just completed, or null otherwise.
 */
export async function getGoogleRedirectResult() {
  if (!isFirebaseClientConfigured()) return null;
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const result = await getRedirectResult(auth);
  if (!result) return null;
  const idToken = await result.user.getIdToken();
  const name = result.user.displayName || '';
  const email = result.user.email || '';
  return { idToken, name, email };
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
