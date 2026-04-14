import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import CITIES_BY_STATE from '../data/indianCities';

const ALL_CITIES = [...new Set(Object.values(CITIES_BY_STATE).flat())].sort();

const resizeImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale; const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Photo
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // Location & contact (all optional)
  const [locPhone, setLocPhone] = useState('');
  const [locCity, setLocCity] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef(null);
  const [locSaving, setLocSaving] = useState(false);
  const [locSaved, setLocSaved] = useState(false);

  const [loading, setLoading] = useState(true);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    api.getProfile()
      .then((res) => {
        const p = res.data.data;
        setName(p.name || '');
        if (p.profilePhoto) setProfilePhoto(p.profilePhoto);
        if (p.whatsappPhone) {
          const digits = String(p.whatsappPhone);
          setLocPhone(digits.startsWith('91') ? digits.slice(2) : digits);
        }
        if (p.city) setLocCity(p.city);
      })
      .catch(() => setSaveError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  // Close city dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSaving(true);
    try {
      const dataUrl = await resizeImage(file);
      setProfilePhoto(dataUrl);
      const res = await api.updateProfile({ profilePhoto: dataUrl });
      refreshUser(res.data.data);
    } catch {
      // photo upload failed silently — preview still shows
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoSaving(true);
    try {
      const res = await api.updateProfile({ profilePhoto: null });
      refreshUser(res.data.data);
      setProfilePhoto(null);
    } finally {
      setPhotoSaving(false);
    }
  };

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

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setLocSaving(true);
    setLocSaved(false);
    try {
      const payload = {
        state: null,
        city: locCity || null,
        whatsappPhone: locPhone.trim() || null,
      };
      const res = await api.updateProfile(payload);
      refreshUser(res.data.data);
      setLocSaved(true);
      setTimeout(() => setLocSaved(false), 3000);
    } finally {
      setLocSaving(false);
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
  const displayPhoto = profilePhoto || user?.profilePhoto || null;

  // Profile completion
  const completionItems = [
    { label: 'Name', done: !!name.trim() },
    { label: 'City', done: !!locCity },
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
        {/* Clickable avatar */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photoSaving}
          className="relative flex-shrink-0 w-16 h-16 rounded-full group focus:outline-none"
          style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
            {displayPhoto
              ? <img src={displayPhoto} alt={user?.name} className="w-full h-full object-cover" />
              : <span className="text-lg font-black text-white">{initials}</span>
            }
          </div>
          {/* Camera overlay on hover */}
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {photoSaving
              ? <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            }
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />

        <div className="relative flex-1 min-w-0">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Your profile</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{user?.name}</h1>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{user?.email}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#91BE4D]/70 hover:text-[#91BE4D] text-[10px] font-semibold mt-1 transition-colors"
          >
            {displayPhoto ? 'Change photo' : '+ Add photo'}
          </button>
          {displayPhoto && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-white/30 hover:text-red-400 text-[10px] font-semibold mt-1 ml-3 transition-colors"
            >
              Remove
            </button>
          )}
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

          {/* Location & Contact Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
            <p className="text-sm font-bold text-gray-900 mb-0.5">Location &amp; Contact</p>
            <p className="text-xs text-gray-400 mb-4">Optional — helps personalise your community profile and upcoming features.</p>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Mobile number <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 font-medium">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={locPhone}
                    onChange={(e) => setLocPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                  />
                </div>
              </div>
              <div ref={cityDropdownRef} className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  City <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={locCity}
                  onChange={(e) => { setLocCity(e.target.value); setCityDropdownOpen(true); }}
                  onFocus={() => setCityDropdownOpen(true)}
                  placeholder="Search city…"
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                />
                {cityDropdownOpen && locCity.trim().length >= 1 && (() => {
                  const matches = ALL_CITIES.filter((c) =>
                    c.toLowerCase().includes(locCity.trim().toLowerCase())
                  );
                  return matches.length > 0 ? (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {matches.map((c) => (
                        <li
                          key={c}
                          onMouseDown={() => { setLocCity(c); setCityDropdownOpen(false); }}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${c === locCity ? 'bg-[#f4f8e8] text-[#4a6e10] font-semibold' : 'text-gray-700 hover:bg-[#f4f8e8]'}`}
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>
              {locSaved && (
                <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </div>
              )}
              <button
                type="submit"
                disabled={locSaving}
                className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm tracking-wide transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                {locSaving ? 'Saving…' : 'Save'}
              </button>
            </form>
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
