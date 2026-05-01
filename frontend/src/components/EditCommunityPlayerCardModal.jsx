import React, { useEffect, useRef, useState } from 'react';
import * as api from '../services/api';
import PaddleLoader from './PaddleLoader';
import SearchableSelect from './SearchableSelect';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Update your player card</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
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
                  <option key={y} value={y}>
                    {y}
                  </option>
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
      </div>
    </div>
  );
}
