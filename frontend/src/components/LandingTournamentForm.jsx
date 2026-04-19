import React, { useState } from 'react';
import { CATEGORIES } from '../utils/format';
import SearchableSelect from './SearchableSelect';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'pt_pending_tournament';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] bg-white placeholder-gray-400';

export default function LandingTournamentForm() {
  const { handleGoogleLogin, loading } = useAuth();

  const [form, setForm] = useState({ name: '', categoryName: '', date: '', entryFee: '' });
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');

  // Use local date (not UTC) so the min date is correct in IST
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tournament name is required';
    if (!form.categoryName) e.categoryName = 'Please select a category';
    if (!form.date) e.date = 'Date is required';
    if (form.entryFee === '' || Number(form.entryFee) < 0) e.entryFee = 'Enter a valid entry fee (0 or more)';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Persist form to localStorage so Calendar can pick it up after auth
    const payload = {
      name: form.name.trim(),
      categories: [{
        categoryName: form.categoryName,
        date: form.date,
        medal: 'None',
        entryFee: Number(form.entryFee),
        prizeAmount: 0,
      }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const result = await handleGoogleLogin();
    if (result && !result.success && result.message) {
      // User cancelled or error — clear pending and show message
      if (result.message !== 'Sign-in was cancelled') {
        setAuthError(result.message);
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    // On success: Landing's `if (user) <Navigate to="/calendar">` takes over
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">

      {/* Tournament name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Tournament name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
          className={inputClass}
          placeholder="e.g. Delhi Open 2025"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Category you're playing</label>
        <SearchableSelect
          options={CATEGORIES}
          value={form.categoryName}
          onChange={v => { setForm(p => ({ ...p, categoryName: v })); setErrors(p => ({ ...p, categoryName: '' })); }}
          placeholder="Search category (Singles, Doubles…)"
        />
        {errors.categoryName && <p className="text-red-500 text-xs mt-1">{errors.categoryName}</p>}
      </div>

      {/* Date + Entry Fee — stacked on very small screens, side by side on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tournament date</label>
          <input
            type="date"
            value={form.date}
            min={today}
            onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setErrors(p => ({ ...p, date: '' })); }}
            className={inputClass}
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Entry fee (₹)</label>
          <input
            type="number"
            value={form.entryFee}
            min="0"
            step="1"
            onChange={e => { setForm(p => ({ ...p, entryFee: e.target.value })); setErrors(p => ({ ...p, entryFee: '' })); }}
            className={inputClass}
            placeholder="500"
          />
          {errors.entryFee && <p className="text-red-500 text-xs mt-1">{errors.entryFee}</p>}
        </div>
      </div>

      {authError && (
        <p className="text-red-500 text-xs text-center">{authError}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity hover:opacity-90 disabled:opacity-60 shadow-lg shadow-green-900/20"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 50%, #ec9937)' }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Signing you in…
          </>
        ) : (
          <>
            {/* Google G icon */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="rgba(255,255,255,0.85)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="rgba(255,255,255,0.6)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Save My Tournament — It's Free
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-gray-400 leading-relaxed">
        Continues with Google. No password needed. Free forever.
      </p>
    </form>
  );
}
