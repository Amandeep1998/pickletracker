import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';

// Lightweight, dependency-free strength estimator used for the signup meter only.
// Kept intentionally simple: the backend is the source of truth for validation.
function evaluatePasswordStrength(password) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const length = password.length;

  // 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
  let score = 0;
  if (length === 0) score = 0;
  else if (length < 8) score = 1;
  else {
    score = 2;
    if (hasLetter && hasNumber) score += 1;
    if (hasSymbol || hasMixedCase) score += 1;
    if (length >= 14) score = Math.min(4, score + 0);
    if (length < 10) score = Math.min(score, 3);
  }

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-gray-200',
    'bg-red-400',
    'bg-orange-400',
    'bg-[#91BE4D]',
    'bg-[#2d7005]',
  ];

  return {
    score,
    label: labels[score],
    color: colors[score],
    rules: {
      length: length >= 8,
      lettersAndNumbers: hasLetter && hasNumber,
    },
    meetsMinimum: length >= 8 && hasLetter && hasNumber,
  };
}

export default function Signup() {
  const { user, handleSignup, loading, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const strength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);

  useEffect(() => {
    if (user) navigate('/calendar', { replace: true });
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
    const result = await handleSignup(form);
    if (result.success) {
      if (result.autoLoggedIn) {
        // Context has set `user`; the effect above will navigate to /calendar.
        setSuccess('Welcome! Taking you to your calendar…');
      } else {
        // Legacy fallback: backend didn't auto-login, send them to /login.
        setSuccess('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1500);
      }
    } else {
      setError(result.message);
    }
  };

  const inputClass = "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="mb-8 text-center">
            <div className="mb-3"><BrandLogo size="2xl" /></div>
            <p className="text-sm text-gray-500 mt-2">Play smarter. Win more. Own your game.</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#272702]">Create Your Account</h1>
              <p className="text-sm text-gray-500 mt-1">Join the community</p>
            </div>

            {(error || contextError) && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                {error || contextError}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-[#91BE4D]/10 border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded px-4 py-3">
                {success}
              </div>
            )}

            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="inline-flex items-center gap-1 bg-[#91BE4D] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                  ✦ Recommended
                </span>
              </div>
              <div className="border-2 border-[#91BE4D]/40 rounded-xl pt-4 pb-2 px-2 bg-[#f4f8e8]/50">
                <GoogleSignInButton
                  onBegin={() => {
                    setError('');
                    clearError();
                  }}
                  onSuccess={() => navigate('/calendar')}
                />
              </div>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required minLength={1} maxLength={200} className={inputClass} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  minLength={8}
                  maxLength={128}
                  className={inputClass}
                  placeholder="At least 8 characters"
                  aria-describedby="password-strength-help"
                />

                {/* Strength meter + rule checklist — only after the user starts typing */}
                {(form.password.length > 0 || passwordFocused) && (
                  <div id="password-strength-help" className="mt-2 space-y-1.5">
                    {/* 4-segment bar */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className={`flex-1 h-1.5 rounded-full transition-colors ${
                            strength.score >= seg ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[11px] font-semibold ${
                        strength.score <= 1 ? 'text-red-500'
                        : strength.score === 2 ? 'text-orange-500'
                        : strength.score === 3 ? 'text-[#4a6e10]'
                        : 'text-[#2d7005]'
                      }`}>
                        {form.password.length === 0 ? 'Password strength' : strength.label}
                      </p>
                    </div>

                    <ul className="text-[11px] space-y-0.5">
                      <li className={`flex items-center gap-1.5 ${strength.rules.length ? 'text-[#4a6e10]' : 'text-gray-400'}`}>
                        <span className="w-3 inline-flex justify-center">{strength.rules.length ? '✓' : '•'}</span>
                        At least 8 characters
                      </li>
                      <li className={`flex items-center gap-1.5 ${strength.rules.lettersAndNumbers ? 'text-[#4a6e10]' : 'text-gray-400'}`}>
                        <span className="w-3 inline-flex justify-center">{strength.rules.lettersAndNumbers ? '✓' : '•'}</span>
                        Contains letters and numbers
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !strength.meetsMinimum}
                className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded text-sm tracking-wide transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
              <p className="text-xs text-gray-400 text-center pt-1">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-gray-500 hover:text-[#91BE4D] transition-colors">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="text-gray-500 hover:text-[#91BE4D] transition-colors">Privacy Policy</Link>.
              </p>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#91BE4D] font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
