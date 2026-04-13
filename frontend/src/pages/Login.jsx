import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const { user, handleLogin, loading, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
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

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-transparent transition-all bg-gray-50 focus:bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9f0] via-white to-[#f0f7f4] flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4">
        <Link to="/" className="flex items-baseline gap-0.5 w-fit">
          <span className="text-xl font-bold text-[#91BE4D]">Pickle</span>
          <span className="text-xl font-bold text-[#ec9937]">Tracker</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f4f8e8] border border-[#d6e89a] mb-4">
              <svg width="36" height="36" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                <circle cx="40" cy="40" r="32" fill="#C8D636" opacity="0.3" />
                {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52]].map(([cx,cy],i)=>(
                  <circle key={i} cx={cx} cy={cy} r="3" fill="#272702" opacity="0.4"/>
                ))}
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#272702]">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-2">Sign in to your PickleTracker account</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">

            {/* Google — PROMINENT, at top */}
            <div className="mb-5">
              <GoogleSignInButton
                onBegin={() => { setError(''); clearError(); }}
                onSuccess={() => navigate('/dashboard')}
              />
            </div>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">or sign in with email</span>
              </div>
            </div>

            {/* Errors */}
            {(error || contextError) && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error || contextError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  placeholder="Your password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#272702] hover:bg-[#3a3a03] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide transition-colors mt-2"
              >
                {loading ? 'Signing in...' : 'Log In'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:text-[#91BE4D] transition-colors underline">Terms</Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="text-gray-500 hover:text-[#91BE4D] transition-colors underline">Privacy Policy</Link>.
            </p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#91BE4D] font-semibold hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
