import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import CityAutocomplete from '../components/CityAutocomplete';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

export default function Profile() {
  const { user, refreshUser } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // WhatsApp connect form
  const [phone, setPhone] = useState('');
  const [waState, setWaState] = useState('');
  const [waCity, setWaCity] = useState('');
  const [waConnected, setWaConnected] = useState(false);
  const [waPhone, setWaPhone] = useState(null);
  const [waBusinessNumber, setWaBusinessNumber] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState('');
  const [waSuccess, setWaSuccess] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getProfile(), api.getWhatsAppStatus()])
      .then(([profRes, waRes]) => {
        const p = profRes.data.data;
        setName(p.name || '');
        const wa = waRes.data;
        setWaConnected(wa.connected);
        setWaPhone(wa.phone);
        if (wa.businessNumber) setWaBusinessNumber(wa.businessNumber);
        if (p.state) setWaState(p.state);
        if (p.city) setWaCity(p.city);
      })
      .catch(() => setSaveError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await api.updateProfile({ name: name.trim() });
      refreshUser(res.data.data);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { setWaError('Please enter your phone number.'); return; }
    if (!waState) { setWaError('Please select your state.'); return; }
    if (!waCity.trim()) { setWaError('Please enter your city.'); return; }
    setWaLoading(true);
    setWaError('');
    setWaSuccess('');
    try {
      const res2 = await api.connectWhatsApp({ phone: phone.trim(), state: waState, city: waCity.trim() });
      setWaConnected(true);
      setWaPhone(`91${phone.replace(/\D/g, '').slice(-10)}`);
      if (res2.data?.businessNumber) setWaBusinessNumber(res2.data.businessNumber);
      setWaSuccess('connected');
      // Also update profile so user state/city persist
      const res = await api.updateProfile({ state: waState, city: waCity.trim() });
      refreshUser(res.data.data);
    } catch (err) {
      setWaError(err.response?.data?.message || 'Failed to connect WhatsApp');
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setWaError('');
    setWaSuccess('');
    try {
      await api.disconnectWhatsApp();
      setWaConnected(false);
      setWaPhone(null);
      setPhone('');
      setWaSuccess('WhatsApp disconnected.');
    } catch {
      setWaError('Failed to disconnect. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // Profile completion
  const completionItems = [
    { label: 'Name', done: !!name.trim() },
    { label: 'WhatsApp', done: waConnected },
    { label: 'Location', done: !!(waState && waCity) },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPct = Math.round((completedCount / completionItems.length) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center gap-4 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
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

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* Name form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mb-5">
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Display name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSaveSuccess(false); setSaveError(''); }}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                />
              </div>
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
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Name saved!
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm tracking-wide transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                {saving ? 'Saving…' : 'Save name'}
              </button>
            </form>
          </div>

          {/* WhatsApp Connect Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📱</span>
              <div>
                <p className="text-sm font-bold text-gray-900">WhatsApp Notifications</p>
                <p className="text-xs text-gray-500">Tournament reminders &amp; weekly insights</p>
              </div>
              {waConnected && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#91BE4D] inline-block" />
                  Connected
                </span>
              )}
            </div>

            {/* Benefit callout */}
            <div className="mt-3 mb-4 bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-xl px-4 py-3">
              <p className="text-xs text-[#4a6e10] leading-relaxed">
                Get a WhatsApp reminder 1 day before your tournaments, plus weekly performance insights — your top strengths, what to work on, and session stats — to keep improving.
              </p>
            </div>

            {waConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Connected number</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">+{waPhone}</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50 transition-colors"
                  >
                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>

                {/* Activation instruction */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">One more step to activate</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Send <span className="font-bold">hi</span> to our WhatsApp number
                    {waBusinessNumber
                      ? <> — <a href={`https://wa.me/${waBusinessNumber}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">+{waBusinessNumber}</a></>
                      : ' (check the app for the number)'}
                    {' '}to activate your connection. We'll reply with a confirmation and you're all set!
                  </p>
                </div>

                {waSuccess === 'connected' && (
                  <div className="text-xs text-[#4a6e10] bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Number saved! Follow the step above to activate.
                  </div>
                )}
                {waError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{waError}</div>
                )}
              </div>
            ) : (
              <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Mobile number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50 font-medium">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setWaError(''); }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Enter your 10-digit Indian mobile number.</p>
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    State
                  </label>
                  <select
                    value={waState}
                    onChange={(e) => { setWaState(e.target.value); setWaError(''); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] bg-white"
                  >
                    <option value="">Select state / UT…</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    City
                  </label>
                  <CityAutocomplete
                    value={waCity}
                    onChange={(val) => { setWaCity(val); setWaError(''); }}
                    placeholder="Search your city…"
                  />
                </div>

                {waError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{waError}</div>
                )}
                {waSuccess && (
                  <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {waSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={waLoading}
                  className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                >
                  {waLoading ? 'Connecting…' : 'Connect WhatsApp'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
