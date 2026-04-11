import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const { user, handleLogin, loading, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearError();
    const result = await handleLogin(form);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-green-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Branding Section */}
        <div className="mb-8 text-center">
          <img
            src="/logo.svg"
            alt="PickleTracker"
            className="h-20 w-20 object-contain mx-auto mb-4"
          />
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-3xl font-bold text-green-600">Pickle</span>
            <span className="text-3xl font-bold text-orange-500">Tracker</span>
          </div>
          <p className="text-sm text-gray-600 mt-3">Track your pickleball tournaments and finances</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>

        {(error || contextError) && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error || contextError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors duration-200"
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>

        <GoogleSignInButton
          onBegin={() => {
            setError('');
            clearError();
          }}
          onSuccess={() => navigate('/dashboard')}
        />

        <p className="text-xs text-gray-400 text-center mt-3">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-gray-500 hover:text-green-600 hover:underline transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="text-gray-500 hover:text-green-600 hover:underline transition-colors">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-green-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
        </div>

        {/* Footer links */}
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/privacy-policy" className="hover:text-gray-600 hover:underline transition-colors">
            Privacy Policy
          </Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-gray-600 hover:underline transition-colors">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
