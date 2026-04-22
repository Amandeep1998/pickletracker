import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import PlayerCard from '../components/PlayerCard';
import PaddleLoader from '../components/PaddleLoader';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => CURRENT_YEAR - i);

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

const MEDAL_OPTIONS = ['Gold', 'Silver', 'Bronze'];

export default function PlayerCardPage() {
  const { user, refreshUser } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    duprSingles: '',
    duprDoubles: '',
    playingSince: '',
    profilePhoto: null,
    manualAchievements: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([api.getProfile(), api.getTournaments()])
      .then(([profRes, tRes]) => {
        const p = profRes.data.data;
        setForm({
          duprSingles: p.duprSingles ?? p.duprRating ?? '',
          duprDoubles: p.duprDoubles ?? '',
          playingSince: p.playingSince ?? '',
          profilePhoto: p.profilePhoto ?? null,
          manualAchievements: Array.isArray(p.manualAchievements) ? p.manualAchievements : [],
        });
        setPhotoPreview(p.profilePhoto ?? null);
        setTournaments(tRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setPhotoPreview(dataUrl);
    setForm((f) => ({ ...f, profilePhoto: dataUrl }));
    setSaveSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const payload = {
        duprSingles: form.duprSingles !== '' ? form.duprSingles : null,
        duprDoubles: form.duprDoubles !== '' ? form.duprDoubles : null,
        duprRating:  form.duprSingles !== '' ? form.duprSingles : null,
        playingSince: form.playingSince !== '' ? form.playingSince : null,
        profilePhoto: form.profilePhoto ?? null,
        manualAchievements: form.manualAchievements || [],
      };
      const res = await api.updateProfile(payload);
      refreshUser(res.data.data);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateAchievement = (idx, field, value) =>
    setForm((f) => {
      const copy = [...(f.manualAchievements || [])];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...f, manualAchievements: copy };
    });

  const removeAchievement = (idx) =>
    setForm((f) => ({ ...f, manualAchievements: (f.manualAchievements || []).filter((_, i) => i !== idx) }));

  const addAchievement = () =>
    setForm((f) => ({
      ...f,
      manualAchievements: [...(f.manualAchievements || []), { tournamentName: '', categoryName: '', medal: 'Gold', date: '' }],
    }));

  const cardProfile = {
    name: user?.name || '',
    city: user?.city || '',
    state: user?.state || '',
    duprRating: form.duprSingles || null,
    duprDoubles: form.duprDoubles || null,
    playingSince: form.playingSince || null,
    profilePhoto: photoPreview,
    manualAchievements: form.manualAchievements || [],
  };

  const manualAchievements = Array.isArray(form.manualAchievements) ? form.manualAchievements : [];
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Nearby Players</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">My Player Card</h1>
            <p className="text-slate-400 text-xs mt-0.5">Edit your card and share it with the pickleball community</p>
          </div>
          <Link to="/players" className="relative flex-shrink-0 text-xs font-semibold text-white/60 hover:text-white transition-colors">
            ← Nearby Players
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16"><PaddleLoader label="Loading player card..." /></div>
      ) : (
        /* Desktop: side by side. Mobile: form first, card below */
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_1fr] lg:gap-10 lg:items-start">

          {/* ── Card preview (right on mobile, left on desktop) ── */}
          <div className="order-2 lg:order-1 lg:sticky lg:top-24 flex flex-col items-center gap-4">
            <PlayerCard profile={cardProfile} tournaments={tournaments} />
            <p className="text-xs text-gray-400 text-center">Card updates live as you edit →</p>
          </div>

          {/* ── Edit form (first on mobile, right on desktop) ── */}
          <div className="order-1 lg:order-2">
            <form onSubmit={handleSave} className="space-y-5">

              {/* Photo upload — prominent at top */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Profile Photo</p>
                <div className="flex items-center gap-4">
                  {/* Big tappable avatar */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 group"
                    style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)' }}
                  >
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      : <span className="flex items-center justify-center w-full h-full text-xl font-black text-white">{initials}</span>
                    }
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </button>
                  <div>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="block text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors mb-1">
                      {photoPreview ? 'Change photo' : '+ Upload photo'}
                    </button>
                    <p className="text-[11px] text-gray-400">JPG or PNG, auto-cropped to square</p>
                    {photoPreview && (
                      <button type="button"
                        onClick={() => { setPhotoPreview(null); setForm((f) => ({ ...f, profilePhoto: null })); }}
                        className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange} className="hidden" />
              </div>

              {/* DUPR + Playing since */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ratings & Experience</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">DUPR Singles</label>
                    <input type="number" step="0.01" min="1" max="8"
                      value={form.duprSingles}
                      onChange={(e) => { setForm((f) => ({ ...f, duprSingles: e.target.value })); setSaveSuccess(false); }}
                      placeholder="e.g. 3.75"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">DUPR Doubles</label>
                    <input type="number" step="0.01" min="1" max="8"
                      value={form.duprDoubles}
                      onChange={(e) => { setForm((f) => ({ ...f, duprDoubles: e.target.value })); setSaveSuccess(false); }}
                      placeholder="e.g. 4.10"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Playing since</label>
                  <select value={form.playingSince}
                    onChange={(e) => { setForm((f) => ({ ...f, playingSince: e.target.value })); setSaveSuccess(false); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] bg-white">
                    <option value="">Select year…</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Manual past achievements */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Past Achievements</p>
                  <button type="button" onClick={addAchievement}
                    className="text-xs font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors">
                    + Add
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Add old tournaments not logged in the app yet.</p>

                {manualAchievements.length === 0 ? (
                  <button type="button" onClick={addAchievement}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-[#91BE4D]/40 hover:text-[#4a6e10] transition-colors">
                    + Add a past tournament
                  </button>
                ) : (
                  <div className="space-y-3">
                    {manualAchievements.map((row, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            placeholder="Tournament name"
                            value={row.tournamentName || ''}
                            onChange={(e) => updateAchievement(idx, 'tournamentName', e.target.value)}
                          />
                          <button type="button" onClick={() => removeAchievement(idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            placeholder="Category"
                            value={row.categoryName || ''}
                            onChange={(e) => updateAchievement(idx, 'categoryName', e.target.value)}
                          />
                          <select
                            className="col-span-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            value={row.medal || 'Gold'}
                            onChange={(e) => updateAchievement(idx, 'medal', e.target.value)}
                          >
                            {MEDAL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <input type="date"
                            className="col-span-1 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            value={row.date || ''}
                            onChange={(e) => updateAchievement(idx, 'date', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status messages */}
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Card saved! Download it on the left.
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}>
                {saving ? 'Saving…' : 'Save & update card'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
