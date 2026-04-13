import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/api';
import Footer from '../components/Footer';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]";

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F3F8F9] flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">This reset link is invalid or has expired.</p>
            <Link to="/login" className="text-[#91BE4D] font-semibold hover:underline">Back to login</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F8F9] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="mb-8 text-center">
            <img src="/brand-logo.png" alt="PickleTracker" className="h-16 w-auto object-contain mx-auto mb-3" />
          </div>

          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <h1 className="text-2xl font-bold text-[#272702] mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

            {success ? (
              <div className="bg-[#91BE4D]/10 border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-4 text-center">
                <p className="font-semibold mb-1">Password updated!</p>
                <p>Redirecting you to login...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className={inputClass + ' pr-10'}
                        placeholder="At least 6 characters"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className={inputClass}
                      placeholder="Re-enter your password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#ec9937] hover:bg-[#d4831f] disabled:opacity-60 text-white font-bold py-3 rounded text-sm tracking-wide transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-gray-400 mt-6">
              <Link to="/login" className="text-[#91BE4D] hover:underline font-medium">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
