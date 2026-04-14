import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import CitySelect from '../components/CitySelect';

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

  // WhatsApp test send
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState(null); // { ok, error, envCheck }

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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

  const handleTestSend = async () => {
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await api.testWhatsAppSend();
      setWaTestResult(res.data);
    } catch (err) {
      setWaTestResult({ ok: false, error: err.response?.data?.message || err.message });
    } finally {
      setWaTesting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const res = await api.exportData();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      const today = new Date();
      const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      a.href = url;
      a.download = `pickletracker-export-${dateStamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none mt-0.5">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-amber-900 mb-0.5">Two quick steps to activate</p>
                      <ol className="text-xs text-amber-700 leading-relaxed list-none space-y-1 mt-1">
                        <li><span className="font-bold">1.</span> Save {waBusinessNumber ? <span className="font-bold">+{waBusinessNumber}</span> : 'our number'} as a contact named <span className="font-bold">PickleTracker</span> — so our messages don't look like an unknown number.</li>
                        <li><span className="font-bold">2.</span> Tap the button below to open WhatsApp. A message saying <span className="font-bold">"hi"</span> will already be typed — just hit <span className="font-bold">Send</span>.</li>
                      </ol>
                    </div>
                  </div>
                  {waBusinessNumber ? (
                    <a
                      href={`https://wa.me/${waBusinessNumber}?text=hi`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Open WhatsApp &amp; Send "hi"
                    </a>
                  ) : (
                    <p className="text-xs text-amber-700 font-medium text-center">
                      Save our number as <span className="font-bold">PickleTracker</span>, then message <span className="font-bold">hi</span> to activate.
                    </p>
                  )}
                </div>

                {/* Test send button */}
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={waTesting}
                  className="w-full border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 transition-colors"
                >
                  {waTesting ? 'Sending test…' : '🧪 Send test message to my WhatsApp'}
                </button>

                {waTestResult && (
                  <div className={`text-xs rounded-lg px-3 py-2.5 space-y-1 ${waTestResult.ok ? 'bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {waTestResult.ok ? (
                      <p className="font-semibold">Message sent! Check your WhatsApp.</p>
                    ) : (
                      <>
                        <p className="font-semibold">Send failed</p>
                        {waTestResult.error && <p className="opacity-80">{typeof waTestResult.error === 'string' ? waTestResult.error : JSON.stringify(waTestResult.error)}</p>}
                        {waTestResult.skipped && <p className="opacity-80">Env vars missing: WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set on the server.</p>}
                        {waTestResult.envCheck && (
                          <p className="opacity-70 font-mono">
                            token={waTestResult.envCheck.hasToken ? '✓' : '✗'} &nbsp;
                            phoneId={waTestResult.envCheck.hasPhoneId ? `✓ (…${waTestResult.envCheck.phoneIdValue?.slice(-4)})` : '✗'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

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
                  <CitySelect
                    state={waState}
                    value={waCity}
                    onChange={(val) => { setWaCity(val); setWaError(''); }}
                    disabled={!waState}
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

          {/* Export Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">📥</span>
              <div>
                <p className="text-sm font-bold text-gray-900">Export your data</p>
                <p className="text-xs text-gray-500 mt-0.5">Download all your tournaments, sessions, and gear as an Excel file — your personal backup.</p>
              </div>
            </div>
            <div className="bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#4a6e10] leading-relaxed">
                The Excel file contains 4 sheets: <span className="font-semibold">Summary</span>, <span className="font-semibold">Tournaments</span>, <span className="font-semibold">Sessions</span>, and <span className="font-semibold">Gear</span> — everything you've logged, in one place.
              </p>
            </div>
            {exportError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{exportError}</div>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              {exporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
