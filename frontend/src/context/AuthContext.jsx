import React, { createContext, useContext, useState, useEffect } from 'react';
import posthog from 'posthog-js';
import * as api from '../services/api';
import {
  signInWithGoogleAndGetCredentials,
  getGoogleRedirectCredentials,
  onFirebaseAuthStateChanged,
  firebaseSignOut,
  isMobileBrowser,
} from '../services/firebase';
import { isStandaloneDisplay } from '../utils/displayMode';
import { getBrowserIanaTimeZone } from '../utils/browserTimeZone';

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'AUD', 'EUR', 'GBP', 'CAD', 'SGD', 'MYR', 'PHP'];

// Attach PostHog identity to a logged-in user
function identifyUser(userData) {
  posthog.identify(userData.id || userData._id, {
    name: userData.name,
    email: userData.email,
    signup_method: userData.isGoogleUser ? 'google' : 'email',
  });
}

function detectPlatform() {
  if (isStandaloneDisplay()) return 'pwa';
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return 'mobile-web';
  return 'desktop-web';
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  // True on mobile while we check for a pending redirect result on mount
  const [redirectLoading, setRedirectLoading] = useState(() => isMobileBrowser());

  // Re-identify PostHog whenever the user changes (covers app re-open with stored session)
  useEffect(() => {
    if (user) identifyUser(user);
  }, [user?.id]);

  const clearError = () => setError(null);

  const syncDeviceTimeZoneAfterAuth = React.useCallback(async (baseUser) => {
    const tz = getBrowserIanaTimeZone();
    if (!tz || !baseUser) return;
    try {
      const res = await api.pingPlatform(detectPlatform(), tz);
      const d = res?.data;
      if (!d?.timeZone) return;
      const merged = {
        ...baseUser,
        timeZone: d.timeZone,
        timeZoneSource: d.timeZoneSource || baseUser.timeZoneSource,
      };
      localStorage.setItem('user', JSON.stringify(merged));
      setUser(merged);
    } catch {
      /* optional ping */
    }
  }, []);

  const clearStoredSession = async () => {
    // Remove per-user currency detection flag so a different user on this device gets re-detected
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = stored.id || stored._id;
      if (uid) localStorage.removeItem(`pt_cur_det_${uid}`);
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    await firebaseSignOut();
  };

  const completeGoogleLogin = async ({ idToken, name, email }) => {
    const res = await api.loginWithGoogle({ idToken, name, email });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    identifyUser(userData);
    posthog.capture(userData.isNewUser ? 'user_signed_up' : 'user_logged_in', { method: 'google' });
    setUser(userData);
    void syncDeviceTimeZoneAfterAuth(userData);
    autoDetectCurrency(userData);
  };

  // Validate cached token/user at app bootstrap so deleted DB users are logged out
  // before protected pages render.
  useEffect(() => {
    let active = true;
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (active) setAuthInitializing(false);
        return;
      }
      try {
        const res = await api.getProfile();
        const userData = res?.data?.data;
        if (userData && active) {
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          await syncDeviceTimeZoneAfterAuth(userData);
        }
      } catch {
        await clearStoredSession();
      } finally {
        if (active) setAuthInitializing(false);
      }
    };
    bootstrapAuth();
    return () => {
      active = false;
    };
  }, [syncDeviceTimeZoneAfterAuth]);

  // On mobile: listen for Firebase auth state changes to detect a completed redirect.
  // onAuthStateChanged is reliable on iOS Safari where getRedirectResult() often
  // returns null due to storage restrictions clearing the pending redirect state.
  useEffect(() => {
    if (!isMobileBrowser()) {
      setRedirectLoading(false);
      return;
    }

    let handled = false;
    let active = true;

    const finishLoading = () => {
      if (active) setRedirectLoading(false);
    };

    const processGoogleCreds = async (creds) => {
      if (!creds || handled) return false;
      handled = true;
      try {
        await completeGoogleLogin(creds);
      } catch (err) {
        setError('Google sign-in failed. Please try again or use email/password.');
        console.error('[Auth] Mobile Google redirect completion error:', err);
      } finally {
        finishLoading();
      }
      return true;
    };

    (async () => {
      try {
        const redirectCreds = await getGoogleRedirectCredentials();
        if (await processGoogleCreds(redirectCreds)) return;
      } catch {
        // We'll still use the auth state listener fallback below.
      } finally {
        if (!handled) finishLoading();
      }
    })();

    const unsubscribe = onFirebaseAuthStateChanged(async (firebaseUser) => {
      // No Firebase user — nothing to do, clear loading state
      if (!firebaseUser) {
        finishLoading();
        return;
      }

      // Our app already has a valid session — the user is logged in, skip
      if (localStorage.getItem('token')) {
        finishLoading();
        return;
      }

      // Firebase has a user but our app doesn't — redirect just completed.
      // Guard against this firing more than once.
      if (handled) return;

      try {
        const idToken = await firebaseUser.getIdToken();
        await processGoogleCreds({
          idToken,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
        });
      } catch (err) {
        finishLoading();
        console.error('[Auth] Mobile Firebase user processing error:', err);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Auto-detect currency from IP once per user per device.
  // Runs fire-and-forget after login/signup — never blocks auth flow.
  const autoDetectCurrency = async (userData) => {
    const userId = userData.id || userData._id;
    if (!userId) return;
    const flagKey = `pt_cur_det_${userId}`;
    if (localStorage.getItem(flagKey)) return;
    localStorage.setItem(flagKey, '1'); // mark immediately to prevent parallel calls
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://ipapi.co/currency/', { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) return;
      const code = (await res.text()).trim().toUpperCase();
      if (!SUPPORTED_CURRENCIES.includes(code)) return;
      if (userData.currency === code) return; // already correct, skip the update
      await api.updateProfile({ currency: code });
      const updated = { ...userData, currency: code };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch {} // fail silently — currency detection is best-effort
  };

  const handleSignup = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.signup(data);
      const { token, user: userData } = res.data || {};
      // Backend now auto-logs in on signup. If for any reason the token/user
      // aren't returned (older backend), fall back to a non-authed success so
      // the caller can route the user to /login.
      if (token && userData) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        identifyUser(userData);
        posthog.capture('user_signed_up', { method: 'email' });
        setUser(userData);
        void syncDeviceTimeZoneAfterAuth(userData);
        autoDetectCurrency(userData);
        return { success: true, autoLoggedIn: true };
      }
      posthog.capture('user_signed_up', { method: 'email' });
      return { success: true, autoLoggedIn: false };
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Signup failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(data);
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      identifyUser(userData);
      posthog.capture('user_logged_in', { method: 'email' });
      setUser(userData);
      void syncDeviceTimeZoneAfterAuth(userData);
      autoDetectCurrency(userData);
      return { success: true };
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        'Login failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const creds = await signInWithGoogleAndGetCredentials();
      // On mobile, signInWithRedirect navigates away — creds will be null and
      // the page never reaches the lines below. The result is handled by the
      // useEffect above on the next page load.
      if (!creds) return { success: false, message: '' };
      const { idToken, name, email } = creds;
      await completeGoogleLogin({ idToken, name, email });
      return { success: true };
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') {
        const msg = 'Sign-in was cancelled';
        setError(msg);
        return { success: false, message: msg };
      }
      const msg =
        err.response?.data?.errors?.[0] ||
        err.response?.data?.message ||
        err.message ||
        'Google sign-in failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    posthog.capture('user_logged_out');
    posthog.reset(); // clears identity so next user on same device gets a fresh session
    // Sign out from Firebase so onAuthStateChanged doesn't auto-log Google users
    // back in on next page load.
    await clearStoredSession();
  };

  // Call after a profile update so the stored user stays in sync
  const refreshUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authInitializing,
        loading,
        redirectLoading,
        error,
        clearError,
        handleSignup,
        handleLogin,
        handleGoogleLogin,
        handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
