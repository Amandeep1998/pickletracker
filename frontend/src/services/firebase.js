import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';


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
 */
export async function signInWithGoogleAndGetCredentials() {
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* environment variables.');
  }
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
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

  // Store with 1-hour expiry
  const expiry = Date.now() + 3600 * 1000;
  localStorage.setItem('gcal_token', accessToken);
  localStorage.setItem('gcal_token_expiry', String(expiry));

  return accessToken;
}
