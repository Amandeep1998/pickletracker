import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import CityAutocomplete from '../components/CityAutocomplete';
import EditCommunityPlayerCardModal from '../components/EditCommunityPlayerCardModal';
import PlayerProfileCardContent from '../components/PlayerProfileCardContent';
import PlayerProfileShareModal from '../components/PlayerProfileShareModal';
import { computeProfileStrength } from '../utils/profileCompletion';
import { COMMON_TIME_ZONES } from '../data/commonTimeZones';
import { getBrowserIanaTimeZone } from '../utils/browserTimeZone';
import { tryUpdateCurrencyFromAutoTimeZone } from '../utils/currencyFromTimeZone';
import { CURRENCIES } from '../utils/format';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PaddleLoader from '../components/PaddleLoader';
import Modal from '../components/Modal';

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
  const { user, refreshUser, handleLogout } = useAuth();
  const fileInputRef = useRef(null);
  const { permission, subscribed, checking: pushChecking, isSupported, pushSupportMessage, requestAndSubscribe, unsubscribe } = usePushNotifications();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Photo
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // Currency preference
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [currencySaving, setCurrencySaving] = useState(false);
  const [currencySaved, setCurrencySaved] = useState(false);

  const [timeZone, setTimeZone] = useState(user?.timeZone || 'UTC');
  const [timeZoneSaving, setTimeZoneSaving] = useState(false);
  const [timeZoneSaved, setTimeZoneSaved] = useState(false);

  // Location & contact (all optional)
  const [locPhone, setLocPhone] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locSaving, setLocSaving] = useState(false);
  const [locSaved, setLocSaved] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showEditPlayerCard, setShowEditPlayerCard] = useState(false);
  const [showSharePlayerCard, setShowSharePlayerCard] = useState(false);
  const [publicCardPlayer, setPublicCardPlayer] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  const loadPublicCardPreview = useCallback(async () => {
    if (!user?.id) return;
    setCardLoading(true);
    try {
      const res = await api.getPlayer(user.id);
      setPublicCardPlayer(res.data.data);
    } catch {
      setPublicCardPlayer(null);
    } finally {
      setCardLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPublicCardPreview();
  }, [loadPublicCardPreview]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [shareTournamentsOnFeed, setShareTournamentsOnFeed] = useState(true);
  const [feedPrefSaving, setFeedPrefSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
        if (p.currency) setCurrency(p.currency);
        setTimeZone(p.timeZone || 'UTC');
        setShareTournamentsOnFeed(p.shareTournamentsOnFeed !== false);
        refreshUser(p);
      })
      .catch(() => setSaveError('Could not load profile.'))
      .finally(() => setLoading(false));
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
      loadPublicCardPreview();
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
      loadPublicCardPreview();
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
      loadPublicCardPreview();
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
      loadPublicCardPreview();
      setTimeout(() => setLocSaved(false), 3000);
    } finally {
      setLocSaving(false);
    }
  };

  const handleSaveCurrency = async (code) => {
    setCurrency(code);
    setCurrencySaving(true);
    setCurrencySaved(false);
    try {
      const res = await api.updateProfile({ currency: code });
      refreshUser(res.data.data);
      setCurrencySaved(true);
      setTimeout(() => setCurrencySaved(false), 3000);
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleSaveTimeZone = async (tz) => {
    setTimeZone(tz);
    setTimeZoneSaving(true);
    setTimeZoneSaved(false);
    try {
      const res = await api.updateProfile({ timeZone: tz });
      let next = res.data.data;
      refreshUser(next);
      const curUpdated = await tryUpdateCurrencyFromAutoTimeZone(next);
      if (curUpdated) {
        refreshUser(curUpdated);
        if (curUpdated.currency) setCurrency(curUpdated.currency);
        setCurrencySaved(true);
        setTimeout(() => setCurrencySaved(false), 3000);
      }
      setTimeZoneSaved(true);
      setTimeout(() => setTimeZoneSaved(false), 3000);
    } catch {
      setSaveError('Could not save time zone.');
    } finally {
      setTimeZoneSaving(false);
    }
  };

  const useBrowserTimeZone = async () => {
    const tz = getBrowserIanaTimeZone();
    if (!tz) {
      setSaveError('Could not read your device time zone.');
      return;
    }
    setTimeZoneSaving(true);
    setSaveError('');
    try {
      const res = await api.updateProfile({ timeZone: tz, timeZoneSource: 'auto' });
      let next = res.data.data;
      refreshUser(next);
      const curUpdated = await tryUpdateCurrencyFromAutoTimeZone(next);
      if (curUpdated) {
        refreshUser(curUpdated);
        if (curUpdated.currency) setCurrency(curUpdated.currency);
        setCurrencySaved(true);
        setTimeout(() => setCurrencySaved(false), 3000);
      }
      setTimeZone(tz);
      setTimeZoneSaved(true);
      setTimeout(() => setTimeZoneSaved(false), 3000);
    } catch {
      setSaveError('Could not save time zone.');
    } finally {
      setTimeZoneSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const res = await api.exportData();
      posthog.capture('data_exported');
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

  const handleShareFeedToggle = async (next) => {
    setFeedPrefSaving(true);
    try {
      const res = await api.updateProfile({ shareTournamentsOnFeed: next });
      refreshUser(res.data.data);
      setShareTournamentsOnFeed(next);
    } catch {
      /* keep switch — user can retry */
    } finally {
      setFeedPrefSaving(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.deleteAccount();
      await handleLogout();
      window.location.href = '/login';
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete account. Try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const displayPhoto = profilePhoto || user?.profilePhoto || null;

  const mergedForStrength = useMemo(() => {
    const phoneDigits = locPhone.replace(/\D/g, '');
    const whatsappMerged =
      phoneDigits.length === 10 ? `91${phoneDigits}` : user?.whatsappPhone || null;
    return {
      ...user,
      name: (name || '').trim() || user?.name,
      city: locCity || user?.city,
      profilePhoto: displayPhoto || user?.profilePhoto,
      whatsappPhone: whatsappMerged,
      email: user?.email,
      duprSingles: user?.duprSingles,
      duprDoubles: user?.duprDoubles,
      duprRating: user?.duprRating,
      playingSince: user?.playingSince,
      manualAchievements: user?.manualAchievements,
    };
  }, [user, name, locCity, locPhone, displayPhoto]);

  const profileStrength = useMemo(() => computeProfileStrength(mergedForStrength), [mergedForStrength]);
  const achievementStepDone = profileStrength.steps.find((s) => s.id === 'achievements')?.done;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

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
          <p className="text-slate-400/90 text-[11px] mt-1">Account &amp; how others see you on PickleTracker</p>
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

      {/* Profile strength — weighted 1–100% (email & phone count, never shown on public card) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-sm font-bold text-gray-800">Profile strength</p>
          <p
            className="text-sm font-black tabular-nums"
            style={{
              background: 'linear-gradient(to right, #2d7005, #ec9937)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {profileStrength.percent}%
          </p>
        </div>
        <p className="text-[11px] text-gray-500 mb-3 leading-snug">
          Fill in more fields to reach 100%. Email and mobile count toward this score but are never shown on your public player card.
        </p>
        {!achievementStepDone && (
          <div className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-950 leading-snug">
            <span className="font-bold">Recommended:</span> log at least one past podium result so your public card shows tournament history — open <strong>Edit player card</strong> below, use <strong>Past achievements</strong>, add a row with tournament, category, and medal, then save.
          </div>
        )}
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4 overflow-hidden">
          <div
            className="h-2.5 rounded-full transition-all duration-500 min-w-[2px]"
            style={{
              width: `${Math.max(1, profileStrength.percent)}%`,
              background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)',
            }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {profileStrength.steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-2 rounded-xl px-2.5 py-2 border text-left ${
                step.done ? 'bg-[#f4f8e8]/80 border-[#91BE4D]/25' : 'bg-gray-50/80 border-gray-100'
              }`}
            >
              <span
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? 'bg-[#91BE4D]' : 'bg-gray-200'
                }`}
              >
                {step.done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={`text-[10px] leading-tight font-medium ${step.done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Public player card preview — same as feed / Nearby */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Your public player card</p>
            <p className="text-xs text-gray-500 mt-0.5">
              What others see when they open your profile from the feed or Nearby Players. Email and phone are never shown here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {publicCardPlayer && (
              <button
                type="button"
                onClick={() => setShowSharePlayerCard(true)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl border-2 border-[#91BE4D]/50 text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eef6dc] transition-colors whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowEditPlayerCard(true)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl text-white hover:opacity-95 transition-opacity shadow-sm whitespace-nowrap"
              style={{ background: 'linear-gradient(to right, #1e3a5f, #2563ab)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit player card
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-[#f1f5f9] flex flex-col max-h-[min(70vh,560px)] min-h-[200px]">
          {cardLoading ? (
            <div className="py-16 flex justify-center">
              <PaddleLoader label="Loading preview…" />
            </div>
          ) : publicCardPlayer ? (
            <div className="overflow-y-auto min-h-0 flex-1">
              <PlayerProfileCardContent
                player={publicCardPlayer}
                currentUserId={user?.id}
                isOwnProfile
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-12 px-4">Could not load preview.</p>
          )}
        </div>
      </div>

      {showEditPlayerCard && (
        <EditCommunityPlayerCardModal
          onClose={() => setShowEditPlayerCard(false)}
          onSaved={async () => {
            try {
              const res = await api.getProfile();
              refreshUser(res.data.data);
              await loadPublicCardPreview();
            } catch {
              await loadPublicCardPreview();
            }
          }}
        />
      )}
      {showSharePlayerCard && publicCardPlayer && (
        <PlayerProfileShareModal
          player={publicCardPlayer}
          userId={user?.id}
          onClose={() => setShowSharePlayerCard(false)}
        />
      )}
      {loading ? (
        <div className="py-10"><PaddleLoader label="Loading profile..." /></div>
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
            <p className="text-xs text-gray-400 mb-4">Optional — helps personalise your Nearby Players profile and upcoming features.</p>
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
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  City <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <CityAutocomplete
                  value={locCity}
                  onChange={setLocCity}
                  placeholder="Search any city worldwide…"
                  className="rounded-lg px-3 py-2.5"
                />
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

          {/* Currency Preference Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-5">
            <p className="text-sm font-bold text-gray-900 mb-0.5">Currency</p>
            <p className="text-xs text-gray-400 mb-4">
              All money amounts use your chosen currency. With time zone on &quot;auto&quot;, we also suggest a matching currency when you reload or sign in (America → USD, India → INR, etc.). Your network location is only used if the time zone does not imply a currency.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSaveCurrency(c.code)}
                  disabled={currencySaving}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all disabled:opacity-50 ${
                    currency === c.code
                      ? 'border-[#91BE4D] bg-[#f4f8e8]'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className={`text-xs font-bold ${currency === c.code ? 'text-[#4a6e10]' : 'text-gray-700'}`}>
                    {c.symbol} {c.code}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
            {currencySaved && (
              <div className="mt-3 bg-[#f4f8e8] border border-[#91BE4D]/30 text-[#4a6e10] text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Currency saved!
              </div>
            )}
          </div>

          {/* Time zone — used for email + push reminders vs tournament dates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-5">
            <p className="text-sm font-bold text-gray-900 mb-0.5">Time zone</p>
            <p className="text-xs text-gray-400 mb-3">
              Tournament dates are calendar days. Your device time zone is sent automatically when you use the app so reminders match your location — unless you pick a fixed zone below (&quot;manual&quot; mode).
            </p>
            {user?.timeZoneSource === 'manual' && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                You&apos;ve set a fixed time zone. Change the dropdown below or use &quot;Use this device&apos;s time zone&quot; to follow your phone or computer again.
              </p>
            )}
            <select
              value={timeZone}
              onChange={(e) => handleSaveTimeZone(e.target.value)}
              disabled={timeZoneSaving}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] disabled:opacity-50"
            >
              {!COMMON_TIME_ZONES.some((z) => z.value === timeZone) && (
                <option value={timeZone}>{timeZone} (current)</option>
              )}
              {COMMON_TIME_ZONES.map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={useBrowserTimeZone}
              disabled={timeZoneSaving}
              className="mt-3 w-full py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Use this device&apos;s time zone
            </button>
            {timeZoneSaved && (
              <p className="text-xs text-[#4a6e10] font-semibold mt-2">Time zone saved.</p>
            )}
          </div>

          {/* Notifications — Web Push only in supported browsers (e.g. not iPhone Safari tab) */}
          {(isSupported || pushSupportMessage) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">Push notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Day-before reminders (~7 PM) and a same-day nudge (~11:30 PM) in your profile time zone to log results — on your device, no email needed.
                  </p>
                </div>
              </div>

              {!isSupported && pushSupportMessage ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1">Reminders cannot run in this browser view</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{pushSupportMessage}</p>
                </div>
              ) : pushChecking ? (
                <p className="text-xs text-gray-500 py-1">Checking notification status…</p>
              ) : permission === 'denied' ? (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-600 mb-0.5">Notifications blocked</p>
                  <p className="text-xs text-red-400 leading-relaxed">
                    You've blocked notifications for this site. To enable them, go to your browser settings → Site permissions → Notifications and allow PickleTracker.
                  </p>
                </div>
              ) : subscribed ? (
                <>
                  <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-xl px-4 py-3 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#4a6e10] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs font-semibold text-[#4a6e10]">Notifications are enabled on this device</p>
                  </div>
                  <button
                    onClick={async () => {
                      setPushLoading(true);
                      setPushMsg('');
                      await unsubscribe();
                      setPushMsg('Notifications turned off.');
                      setPushLoading(false);
                    }}
                    disabled={pushLoading}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {pushLoading ? 'Turning off…' : 'Turn off notifications'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-3">
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Allow notifications for a day-before heads-up and a late-evening reminder on play day to log results (times follow your profile time zone).
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setPushLoading(true);
                      setPushMsg('');
                      const ok = await requestAndSubscribe();
                      setPushMsg(ok ? 'Notifications enabled!' : permission === 'denied' ? 'Blocked in browser settings.' : 'Could not enable — please try again.');
                      setPushLoading(false);
                    }}
                    disabled={pushLoading}
                    className="w-full flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 text-white font-bold py-2.5 rounded-xl text-sm tracking-wide transition-opacity"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                  >
                    {pushLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Enabling…
                      </>
                    ) : (
                      'Allow notifications'
                    )}
                  </button>
                </>
              )}

              {pushMsg && (
                <p className="text-xs text-center text-gray-500 mt-2">{pushMsg}</p>
              )}
            </div>
          )}

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

          {/* Settings — feed visibility & account deletion */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 mt-5">
            <p className="text-sm font-bold text-gray-900 mb-0.5">Settings</p>
            <p className="text-xs text-gray-400 mb-4">
              Control how your tournament activity appears to others.
            </p>

            <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">Show tournaments on Home feed</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  When enabled, summaries of tournaments you log can appear in the community feed. Turn off to keep new activity off the feed — your data stays in your account.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shareTournamentsOnFeed}
                aria-label={shareTournamentsOnFeed ? 'Tournaments visible on feed' : 'Tournaments hidden from feed'}
                disabled={feedPrefSaving}
                onClick={() => handleShareFeedToggle(!shareTournamentsOnFeed)}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#91BE4D] disabled:opacity-50 ${
                  shareTournamentsOnFeed ? '' : 'bg-gray-300'
                }`}
                style={
                  shareTournamentsOnFeed
                    ? { background: 'linear-gradient(to right, #2d7005, #91BE4D)' }
                    : undefined
                }
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-0.5 ${
                    shareTournamentsOnFeed ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="pt-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Delete account</p>
              <p className="text-xs text-gray-500 mb-3 leading-snug">
                Permanently remove your account and data we store for you (tournaments, sessions, expenses, coaching entries, and friend connections). This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteError('');
                  setDeleteModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                Delete my account…
              </button>
            </div>
          </div>

          <Modal
            isOpen={deleteModalOpen}
            onClose={() => !deleteLoading && setDeleteModalOpen(false)}
            title="Delete account?"
          >
            <div className="py-1">
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                This permanently deletes your PickleTracker account and your tournaments, sessions, expenses, and related information. Confirm only if you are sure.
              </p>
              {deleteError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{deleteError}</div>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeleteModalOpen(false)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDeleteAccount}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
                </button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
