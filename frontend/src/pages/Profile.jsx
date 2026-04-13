import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const BENEFITS = [
  {
    field: 'whatsappPhone',
    icon: '📱',
    label: 'Mobile number',
    benefit: 'Get a WhatsApp reminder 1 day before your next tournament — so you never miss a registration deadline or match time.',
    placeholder: '9876543210',
    inputType: 'tel',
    inputMode: 'numeric',
  },
  {
    field: 'city',
    icon: '📍',
    label: 'City',
    benefit: 'We\'ll highlight tournaments and courts happening near you, making it easier to discover events you can actually attend.',
    placeholder: 'e.g. Mumbai, Delhi, Bangalore…',
    inputType: 'text',
    inputMode: 'text',
  },
];

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    whatsappPhone: '',
    city: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProfile()
      .then((res) => {
        const p = res.data.data;
        setForm({
          name: p.name || '',
          whatsappPhone: p.whatsappPhone
            ? p.whatsappPhone.replace(/^91/, '')   // strip country code for display
            : '',
          city: p.city || '',
        });
      })
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await api.updateProfile({
        name: form.name.trim(),
        city: form.city.trim() || null,
        whatsappPhone: form.whatsappPhone.trim() || null,
      });
      refreshUser(res.data.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Profile completion: name always done; +1 for phone, +1 for city
  const completionItems = [
    { label: 'Name', done: !!form.name.trim() },
    { label: 'Mobile number', done: !!form.whatsappPhone.trim() },
    { label: 'City', done: !!form.city.trim() },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPct = Math.round((completedCount / completionItems.length) * 100);

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center gap-4 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        {/* Avatar */}
        <div
          className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {initials}
        </div>
        <div className="relative">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Your profile</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">{user?.name}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Completion bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800">Profile completion</p>
          <p className="text-sm font-black" style={{ background: 'linear-gradient(to right, #2d7005, #ec9937)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {completionPct}%
          </p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%`, background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          />
        </div>
        <div className="flex gap-4">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-[#91BE4D]' : 'bg-gray-200'}`}>
                {item.done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-xs font-medium ${item.done ? 'text-gray-600' : 'text-gray-400'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Display name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
              />
            </div>

            {/* Email — read only */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Email <span className="text-gray-300 font-normal normal-case">(cannot be changed)</span>
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Optional fields with benefit callouts */}
            {BENEFITS.map((b) => (
              <div key={b.field}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {b.icon} {b.label}{' '}
                  <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                {/* Benefit card */}
                <div className="mb-2 bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-[#4a6e10] leading-relaxed">{b.benefit}</p>
                </div>
                <input
                  type={b.inputType}
                  inputMode={b.inputMode}
                  name={b.field}
                  value={form[b.field]}
                  onChange={handleChange}
                  placeholder={b.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                />
                {b.field === 'whatsappPhone' && (
                  <p className="text-[11px] text-gray-400 mt-1">Enter your 10-digit Indian mobile number. Country code (+91) is added automatically.</p>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}
            {success && (
              <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Profile saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
