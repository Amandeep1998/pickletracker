import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';

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
      // Mark that this is a brand-new signup so Calendar shows the one-time tutorial
      localStorage.setItem('pt_calTutorialPending', '1');
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
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
                    // Set before redirect so mobile gets it even after page reload
                    localStorage.setItem('pt_calTutorialPending', '1');
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
                <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} className={inputClass} placeholder="At least 6 characters" />
              </div>
              <button
                type="submit"
                disabled={loading}
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
