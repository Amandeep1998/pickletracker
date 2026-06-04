import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from '../GoogleSignInButton';

/**
 * In-page auth popup for the chat companion. Hosts both sign in and sign up
 * (Google + email/password) without leaving "/", so a pre-auth log the visitor
 * just built stays in memory and commits the moment they authenticate.
 *
 * props:
 *   mode      'login' | 'signup'  — initial tab
 *   onClose   ()  — dismiss without authenticating
 *   onAuthed  ()  — fired after a successful sign in / sign up (desktop). On
 *                   mobile Google the page redirects away and completes on
 *                   return, so callers must also handle the post-redirect case.
 */

const inputClass =
  'w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none';
const inputStyle = {
  border: '1.5px solid #E2E0D4',
  background: '#FBFAF4',
  color: '#16180F',
  fontFamily: 'var(--font-body, "Hanken Grotesk", sans-serif)',
};

export default function AuthSheet({ mode = 'login', onClose, onAuthed }) {
  const { handleLogin, handleSignup, loading, error: ctxError, clearError } = useAuth();
  const [tab, setTab] = useState(mode === 'signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    clearError();
    setError('');
  }, [tab, clearError]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const change = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
    clearError();
  };

  const passwordValid =
    form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /[0-9]/.test(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    clearError();
    const result =
      tab === 'signup' ? await handleSignup(form) : await handleLogin({ email: form.email, password: form.password });
    if (result?.success) {
      // Signup may not auto-login on an older backend; only proceed when authed.
      if (tab === 'signup' && result.autoLoggedIn === false) {
        setError('Account created. Please sign in.');
        setTab('login');
        return;
      }
      onAuthed?.({ isSignup: tab === 'signup' });
    } else {
      setError(result?.message || 'Something went wrong. Try again.');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,11,0.72)', backdropFilter: 'blur(2px)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ zIndex: 61, background: '#FBFAF4', border: '1px solid #E2E0D4', color: '#16180F' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-xl leading-none p-1"
          style={{ color: '#6C6E60' }}
        >
          ×
        </button>

        <div className="text-center mb-5">
          <h2
            className="text-xl font-bold"
            style={{ color: '#16180F', fontFamily: 'var(--font-display, Archivo, sans-serif)' }}
          >
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-xs mt-1" style={{ color: '#6C6E60' }}>
            {tab === 'signup' ? 'Save your tournaments and build your card.' : 'Sign in to save and see your card.'}
          </p>
        </div>

        {(error || ctxError) && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
            {error || ctxError}
          </div>
        )}

        <GoogleSignInButton onBegin={() => { setError(''); clearError(); }} onSuccess={() => onAuthed?.()} />

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full" style={{ borderTop: '1px solid #E2E0D4' }} /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2" style={{ background: '#FBFAF4', color: '#6C6E60' }}>Or</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === 'signup' && (
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={change}
              required
              maxLength={200}
              className={inputClass}
              style={inputStyle}
              placeholder="Your name"
            />
          )}
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={change}
            required
            className={inputClass}
            style={inputStyle}
            placeholder="you@example.com"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={change}
            required
            minLength={tab === 'signup' ? 8 : undefined}
            className={inputClass}
            style={inputStyle}
            placeholder={tab === 'signup' ? 'At least 8 characters, letters + numbers' : 'Your password'}
          />
          {tab === 'signup' && form.password && !passwordValid && (
            <p className="text-xs text-red-600 -mt-1">
              Password must be at least 8 characters and include both letters and numbers.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || (tab === 'signup' && !passwordValid)}
            className="w-full disabled:opacity-60 hover:opacity-90 font-bold py-2.5 rounded-xl text-sm tracking-wide transition-opacity"
            style={{ background: '#C7F23A', color: '#16180F', fontFamily: 'var(--font-display, Archivo, sans-serif)' }}
          >
            {loading ? 'Please wait…' : tab === 'signup' ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#6C6E60' }}>
          {tab === 'signup' ? (
            <>Already have an account?{' '}
              <button type="button" onClick={() => setTab('login')} className="font-semibold hover:underline" style={{ color: '#16180F' }}>Log in</button>
            </>
          ) : (
            <>New here?{' '}
              <button type="button" onClick={() => setTab('signup')} className="font-semibold hover:underline" style={{ color: '#16180F' }}>Create an account</button>
            </>
          )}
        </p>

        <p className="text-[11px] text-center mt-3" style={{ color: '#9DA08C' }}>
          By continuing you agree to our{' '}
          <Link to="/terms" className="hover:underline" style={{ color: '#6C6E60' }}>Terms</Link> and{' '}
          <Link to="/privacy-policy" className="hover:underline" style={{ color: '#6C6E60' }}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
