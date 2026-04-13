import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';
import { signInWithGoogleAndGetCredentials } from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const handleSignup = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await api.signup(data);
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
      const { idToken, name, email } = await signInWithGoogleAndGetCredentials();
      const res = await api.loginWithGoogle({ idToken, name, email });
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
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
