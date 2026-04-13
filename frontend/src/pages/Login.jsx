import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Footer from '../components/Footer';
import { forgotPassword as apiForgotPassword } from '../services/api';

export default function Login() {
  const { user, handleLogin, loading, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    clearError();
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg('');
    try {
      await apiForgotPassword(forgotEmail);
      setForgotMsg('If that email exists, a reset link has been sent. Check your inbox.');
    } catch {
      setForgotMsg('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearError();
    const result = await handleLogin(form);
    if (result.success) {
      navigate('/tournaments');
    } else {
      setError(result.message);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  return (
    <div className="min-h-screen bg-[#F3F8F9] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="mb-8 text-center">
            <img src="/logo.svg" alt="PickleTracker" className="h-20 w-20 object-contain mx-auto mb-4" />
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-3xl font-bold text-[#91BE4D]">Pickle</span>
              <span className="text-3xl font-bold text-[#ec9937]">Tracker</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Track your pickleball tournaments and finances</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#272702]">Welcome Back</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
            </div>

            {(error || contextError) && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                {error || contextError}
              </div>
            )}

            <GoogleSignInButton
              onBegin={() => { setError(''); clearError(); }}
              onSuccess={() => navigate('/tournaments')}
            />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">Or</span>
              </div>
            </div>

            {forgotMode ? (
              /* ── Forgot password panel ── */
              <div>
                <button
                  onClick={() => { setForgotMode(false); setForgotMsg(''); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to login
                </button>
                <h2 className="text-base font-bold text-gray-800 mb-1">Forgot your password?</h2>
                <p className="text-xs text-gray-400 mb-4">Enter your email and we'll send you a reset link.</p>
                {forgotMsg ? (
                  <div className="bg-[#91BE4D]/10 border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-3">
                    {forgotMsg}
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-3">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-[#ec9937] hover:bg-[#d4831f] disabled:opacity-60 text-white font-bold py-3 rounded text-sm tracking-wide transition-colors"
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ── Login form ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="you@example.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setForgotEmail(form.email); }}
                      className="text-xs text-[#91BE4D] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      className={inputClass + ' pr-10'}
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#ec9937] hover:bg-[#d4831f] disabled:opacity-60 text-white font-bold py-3 rounded text-sm tracking-wide transition-colors"
                >
                  {loading ? 'Signing in...' : 'Log In'}
                </button>
              </form>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:text-[#91BE4D] transition-colors">Terms of Service</Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="text-gray-500 hover:text-[#91BE4D] transition-colors">Privacy Policy</Link>.
            </p>

            <p className="text-center text-sm text-gray-500 mt-4">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#91BE4D] font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
