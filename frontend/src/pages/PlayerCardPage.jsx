import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import PlayerCard from '../components/PlayerCard';

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
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Cover-crop to square
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

export default function PlayerCardPage() {
  const { user, refreshUser } = useAuth();

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    duprRating: '',
    playingSince: '',
    profilePhoto: null,
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
          duprRating: p.duprRating ?? '',
          playingSince: p.playingSince ?? '',
          profilePhoto: p.profilePhoto ?? null,
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
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const payload = {
        duprRating: form.duprRating !== '' ? form.duprRating : null,
        playingSince: form.playingSince !== '' ? form.playingSince : null,
        profilePhoto: form.profilePhoto ?? null,
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

  // Build profile object for the card
  const cardProfile = {
    name: user?.name || '',
    city: user?.city || '',
    state: user?.state || '',
    duprRating: form.duprRating || null,
    playingSince: form.playingSince || null,
    profilePhoto: photoPreview,
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center gap-4 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">PickleTracker</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">My Player Card</h1>
          <p className="text-slate-400 text-xs mt-0.5">Build your card and share with friends</p>
        </div>
        <div className="relative ml-auto select-none text-4xl">🏓</div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* Card preview */}
          <div className="flex justify-center mb-6">
            <PlayerCard profile={cardProfile} tournaments={tournaments} />
          </div>

          {/* Edit form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
            <p className="text-sm font-bold text-gray-800 mb-4">Customise your card</p>
            <form onSubmit={handleSave} className="space-y-5">

              {/* Profile photo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Profile photo
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0 overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-[#91BE4D] transition-colors"
                    style={{ background: photoPreview ? 'transparent' : 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview
                      ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      : (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                    }
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-[#4a6e10] hover:text-[#2d7005] transition-colors"
                    >
                      {photoPreview ? 'Change photo' : 'Upload photo'}
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => { setPhotoPreview(null); setForm((f) => ({ ...f, profilePhoto: null })); }}
                        className="block text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">JPG or PNG, auto-cropped to square</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              {/* DUPR Rating */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  DUPR Rating <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="8"
                  value={form.duprRating}
                  onChange={(e) => { setForm((f) => ({ ...f, duprRating: e.target.value })); setSaveSuccess(false); }}
                  placeholder="e.g. 3.75"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Find your rating at dupr.com</p>
              </div>

              {/* Playing since */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Playing since <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <select
                  value={form.playingSince}
                  onChange={(e) => { setForm((f) => ({ ...f, playingSince: e.target.value })); setSaveSuccess(false); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] bg-white"
                >
                  <option value="">Select year…</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{saveError}</div>
              )}
              {saveSuccess && (
                <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Card saved! Download it above.
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full disabled:opacity-60 hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                {saving ? 'Saving…' : 'Save & update card'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
