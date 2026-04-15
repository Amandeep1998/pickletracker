import React, { createContext, useContext, useState, useEffect } from 'react';
import posthog from 'posthog-js';
import * as api from '../services/api';
import { signInWithGoogleAndGetCredentials, getGoogleRedirectResult, isMobileBrowser } from '../services/firebase';

// Attach PostHog identity to a logged-in user
function identifyUser(userData) {
  posthog.identify(userData.id || userData._id, {
    name: userData.name,
    email: userData.email,
    signup_method: userData.isGoogleUser ? 'google' : 'email',
  });
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // True on mobile while we check for a pending redirect result on mount
  const [redirectLoading, setRedirectLoading] = useState(() => isMobileBrowser());

  // Re-identify PostHog whenever the user changes (covers app re-open with stored session)
  useEffect(() => {
    if (user) identifyUser(user);
  }, [user?.id]);

  const clearError = () => setError(null);

  // On mobile: pick up the result of a signInWithRedirect after page reload
  useEffect(() => {
    if (!isMobileBrowser()) return;

    let cancelled = false;
    async function checkRedirect() {
      try {
        const creds = await getGoogleRedirectResult();
        if (!creds || cancelled) return;

        const res = await api.loginWithGoogle(creds);
        if (cancelled) return;

        const { token, user: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        identifyUser(userData);
        posthog.capture(userData.isNewUser ? 'user_signed_up' : 'user_logged_in', { method: 'google' });
        setUser(userData);
        // Login/Signup pages watch `user` and will navigate automatically
      } catch (err) {
        if (cancelled) return;
        // auth/cancelled-popup-request or no pending redirect → silent (user just loaded the page)
        const silentCodes = ['auth/no-auth-event', 'auth/cancelled-popup-request', 'auth/redirect-cancelled-by-user'];
        if (!err?.code || !silentCodes.includes(err.code)) {
          // Real failure — show a message so the user isn't left wondering
          const msg = err?.code === 'auth/unauthorized-domain'
            ? 'This domain is not authorised for Google sign-in. Please contact support.'
            : 'Google sign-in failed. Please try again or use email/password.';
          setError(msg);
        }
      } finally {
        if (!cancelled) setRedirectLoading(false);
      }
    }

    checkRedirect();
    return () => { cancelled = true; };
  }, []);

  const handleSignup = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await api.signup(data);
      posthog.capture('user_signed_up', { method: 'email' });
      return { success: true };
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
      const res = await api.loginWithGoogle({ idToken, name, email });
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      identifyUser(userData);
      posthog.capture(userData.isNewUser ? 'user_signed_up' : 'user_logged_in', { method: 'google' });
      setUser(userData);
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

  const handleLogout = () => {
    posthog.capture('user_logged_out');
    posthog.reset(); // clears identity so next user on same device gets a fresh session
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
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
