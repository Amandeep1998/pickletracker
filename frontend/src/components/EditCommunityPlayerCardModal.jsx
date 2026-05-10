import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import * as api from '../services/api';
import PaddleLoader from './PaddleLoader';
import SearchableSelect from './SearchableSelect';
import PlayerProfileCardContent from './PlayerProfileCardContent';
import { CATEGORIES } from '../utils/format';

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

/** Same editor as Nearby Players → Update your player card (DUPR, photo, past achievements). */
export default function EditCommunityPlayerCardModal({ onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('edit'); // 'edit' | 'share'
  const [savedPlayer, setSavedPlayer] = useState(null);
  const [userId, setUserId] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'generating' | 'error'
  const [form, setForm] = useState({
    duprSingles: '',
    duprDoubles: '',
    playingSince: '',
    profilePhoto: null,
    manualAchievements: [],
  });

  useEffect(() => {
    api
      .getProfile()
      .then((profileRes) => {
        const p = profileRes.data.data || {};
        setUserId(p.id ?? p._id ?? null);
        setForm({
          duprSingles: p.duprSingles ?? p.duprRating ?? '',
          duprDoubles: p.duprDoubles ?? '',
          playingSince: p.playingSince ?? '',
          profilePhoto: p.profilePhoto ?? null,
          manualAchievements: Array.isArray(p.manualAchievements) ? p.manualAchievements : [],
        });
      })
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  const addAchievement = () =>
    setForm((f) => ({
      ...f,
      manualAchievements: [...(f.manualAchievements || []), { tournamentName: '', categoryName: '', medal: 'Gold', date: '' }],
    }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateProfile({
        duprSingles: form.duprSingles || null,
        duprDoubles: form.duprDoubles || null,
        duprRating: form.duprSingles || null,
        playingSince: form.playingSince || null,
        profilePhoto: form.profilePhoto || null,
        manualAchievements: form.manualAchievements || [],
      });
      onSaved?.();
      // Load public card data for share step
      if (userId) {
        try {
          const res = await api.getPlayer(userId);
          setSavedPlayer(res.data.data);
        } catch {
          // fallback: skip share step
        }
      }
      setStep('share');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Share helpers ─────────────────────────────────────────────────────────

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/players` : '';

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setShareStatus('generating');
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      setShareStatus('idle');
      return dataUrl;
    } catch {
      setShareStatus('error');
      return null;
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const slug = (savedPlayer?.name || 'player').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'player';
    const a = document.createElement('a');
    a.download = `${slug}-pickletracker-card.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleNativeShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'pickletracker-player-card.png', { type: 'image/png' });
      const first = (savedPlayer?.name || 'Player').split(' ')[0];
      const text = `${first}'s player card on PickleTracker 🎾\n${shareUrl}`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My PickleTracker player card', text });
      } else {
        await handleDownload();
      }
    } catch { /* user cancelled */ }
    setShareStatus('idle');
  };

  const handleWhatsApp = () => {
    const first = (savedPlayer?.name || 'Player').split(' ')[0];
    const text = `${first}'s player card on PickleTracker 🎾 ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={step === 'edit' ? onClose : undefined}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'share' ? 'Card saved! Share it 🎾' : 'Update your player card'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* ── Edit step ── */}
        {step === 'edit' && (
          <>
            {loading ? (
              <div className="p-6">
                <PaddleLoader label="Loading profile..." className="min-h-[100px]" />
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Singles</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                      value={form.duprSingles}
                      onChange={(e) => setForm((f) => ({ ...f, duprSingles: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Doubles</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                      value={form.duprDoubles}
                      onChange={(e) => setForm((f) => ({ ...f, duprDoubles: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Playing since</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                    value={form.playingSince}
                    onChange={(e) => setForm((f) => ({ ...f, playingSince: e.target.value }))}
                  >
                    <option value="">Select year…</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profile photo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {form.profilePhoto ? (
                        <img src={form.profilePhoto} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[#4a6e10]">
                      Upload / Change
                    </button>
                    {form.profilePhoto && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, profilePhoto: null }))} className="text-xs text-gray-500 hover:text-red-500">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const dataUrl = await resizeImage(file);
                      setForm((f) => ({ ...f, profilePhoto: dataUrl }));
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past achievements</label>
                    <button type="button" onClick={addAchievement} className="text-xs font-semibold text-[#4a6e10]">
                      + Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(form.manualAchievements || []).map((row, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            placeholder="Tournament name"
                            value={row.tournamentName || ''}
                            onChange={(e) =>
                              setForm((f) => {
                                const copy = [...(f.manualAchievements || [])];
                                copy[idx] = { ...copy[idx], tournamentName: e.target.value };
                                return { ...f, manualAchievements: copy };
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                manualAchievements: (f.manualAchievements || []).filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <SearchableSelect
                          options={CATEGORIES}
                          value={row.categoryName || ''}
                          onChange={(v) =>
                            setForm((f) => {
                              const copy = [...(f.manualAchievements || [])];
                              copy[idx] = { ...copy[idx], categoryName: v };
                              return { ...f, manualAchievements: copy };
                            })
                          }
                          placeholder="Category (e.g. Mixed Doubles 4.0)"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            value={row.medal || 'Gold'}
                            onChange={(e) =>
                              setForm((f) => {
                                const copy = [...(f.manualAchievements || [])];
                                copy[idx] = { ...copy[idx], medal: e.target.value };
                                return { ...f, manualAchievements: copy };
                              })
                            }
                          >
                            <option>Gold</option>
                            <option>Silver</option>
                            <option>Bronze</option>
                          </select>
                          <input
                            type="date"
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                            value={row.date || ''}
                            onChange={(e) =>
                              setForm((f) => {
                                const copy = [...(f.manualAchievements || [])];
                                copy[idx] = { ...copy[idx], date: e.target.value };
                                return { ...f, manualAchievements: copy };
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                    {(form.manualAchievements || []).length === 0 && (
                      <button
                        type="button"
                        onClick={addAchievement}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs text-gray-400 hover:border-[#91BE4D]/40 hover:text-[#4a6e10] transition-colors"
                      >
                        + Add a past tournament
                      </button>
                    )}
                  </div>
                </div>
                {error ? <p className="text-xs text-red-500">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold hover:opacity-90"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
                  >
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Share step ── */}
        {step === 'share' && (
          <div className="p-5 space-y-4">
            {/* Encouragement text */}
            <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-2xl px-4 py-3">
              <p className="text-sm font-bold text-[#2d7005]">Your card is live! Show it off 🎾</p>
              <p className="text-xs text-[#4a6e10] mt-0.5">
                Download your card and share it on WhatsApp, Instagram Stories, or Facebook to let your community know you're playing.
              </p>
            </div>

            {/* Card preview */}
            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 flex justify-center py-4 px-3">
              <div
                ref={cardRef}
                className="w-full max-w-[360px] rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 bg-white"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ background: 'linear-gradient(145deg, #1c350a 0%, #2d6e05 45%, #1a4a08 80%)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-[#91BE4D]/40"
                    style={{ background: 'rgba(145,190,77,0.15)' }}
                  >
                    <span className="text-[#c8e875] text-xs font-black tracking-tight leading-none">PT</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-[#91BE4D] leading-tight">PickleTracker</p>
                    <p className="text-[9px] text-white/60 mt-0.5">Community player card</p>
                  </div>
                </div>
                {savedPlayer ? (
                  <PlayerProfileCardContent
                    player={savedPlayer}
                    currentUserId={userId}
                    isOwnProfile
                    forExport
                  />
                ) : (
                  <div className="py-8 flex justify-center">
                    <PaddleLoader label="Loading card…" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
                  <span className="text-[9px] font-bold text-gray-400 tracking-wide">pickletracker.in</span>
                  <span className="text-[8px] text-gray-400 text-right leading-tight">Track your game. Own your stats.</span>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Share on</p>
              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: '#25D366' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={handleFacebook}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1877F2' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>

                {/* Download */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={shareStatus === 'generating'}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 bg-white hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  {shareStatus === 'generating' ? 'Wait…' : 'Download PNG'}
                </button>

                {/* Instagram (download for Stories) */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={shareStatus === 'generating'}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  {shareStatus === 'generating' ? 'Wait…' : 'Instagram'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                Instagram: download the image and upload it to your Stories or Feed.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
