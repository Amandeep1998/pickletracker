import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Footer from '../components/Footer';

export default function Signup() {
  const { user, handleSignup, loading, error: contextError, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    const result = await handleSignup(form);
    if (result.success) {
      localStorage.setItem('pt_first_time', '1');
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
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

            <GoogleSignInButton
              onBegin={() => { setError(''); clearError(); }}
              onSuccess={(isNewUser) => navigate(isNewUser ? '/welcome' : '/dashboard')}
            />

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
                <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} className={inputClass} placeholder="At least 6 characters" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ec9937] hover:bg-[#d4831f] disabled:opacity-60 text-white font-bold py-3 rounded text-sm tracking-wide transition-colors"
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
