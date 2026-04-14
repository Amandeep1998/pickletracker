import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CITIES_BY_STATE from '../data/indianCities';

// ── Flat list of all cities (for autocomplete) ───────────────────────────────
const ALL_CITIES = [...new Set(Object.values(CITIES_BY_STATE).flat())].sort();

// ── Coordinates for major Indian cities (for distance sorting) ───────────────
const CITY_COORDS = {
  'Mumbai': { lat: 19.076, lng: 72.877 }, 'Navi Mumbai': { lat: 19.033, lng: 73.029 },
  'Thane': { lat: 19.219, lng: 72.979 }, 'Pune': { lat: 18.520, lng: 73.856 },
  'Nagpur': { lat: 21.146, lng: 79.089 }, 'Nashik': { lat: 20.000, lng: 73.789 },
  'Aurangabad': { lat: 19.877, lng: 75.343 }, 'Solapur': { lat: 17.687, lng: 75.905 },
  'Kolhapur': { lat: 16.705, lng: 74.243 }, 'Delhi': { lat: 28.613, lng: 77.209 },
  'New Delhi': { lat: 28.613, lng: 77.209 }, 'Noida': { lat: 28.535, lng: 77.391 },
  'Gurgaon': { lat: 28.459, lng: 77.027 }, 'Faridabad': { lat: 28.408, lng: 77.313 },
  'Ghaziabad': { lat: 28.669, lng: 77.454 }, 'Bengaluru': { lat: 12.972, lng: 77.594 },
  'Mysuru': { lat: 12.296, lng: 76.639 }, 'Hubli': { lat: 15.362, lng: 75.125 },
  'Mangaluru': { lat: 12.870, lng: 74.842 }, 'Belagavi': { lat: 15.849, lng: 74.497 },
  'Hyderabad': { lat: 17.385, lng: 78.487 }, 'Warangal': { lat: 17.968, lng: 79.594 },
  'Nizamabad': { lat: 18.672, lng: 78.094 }, 'Chennai': { lat: 13.083, lng: 80.270 },
  'Coimbatore': { lat: 11.017, lng: 76.955 }, 'Madurai': { lat: 9.939, lng: 78.121 },
  'Tiruchirappalli': { lat: 10.793, lng: 78.704 }, 'Salem': { lat: 11.664, lng: 78.146 },
  'Kolkata': { lat: 22.573, lng: 88.364 }, 'Howrah': { lat: 22.589, lng: 88.310 },
  'Durgapur': { lat: 23.480, lng: 87.320 }, 'Asansol': { lat: 23.684, lng: 86.984 },
  'Siliguri': { lat: 26.717, lng: 88.432 }, 'Ahmedabad': { lat: 23.023, lng: 72.572 },
  'Surat': { lat: 21.170, lng: 72.831 }, 'Vadodara': { lat: 22.308, lng: 73.181 },
  'Rajkot': { lat: 22.299, lng: 70.801 }, 'Gandhinagar': { lat: 23.217, lng: 72.683 },
  'Jaipur': { lat: 26.912, lng: 75.787 }, 'Jodhpur': { lat: 26.294, lng: 73.035 },
  'Kota': { lat: 25.182, lng: 75.865 }, 'Udaipur': { lat: 24.571, lng: 73.691 },
  'Ajmer': { lat: 26.450, lng: 74.640 }, 'Bikaner': { lat: 28.014, lng: 73.313 },
  'Lucknow': { lat: 26.847, lng: 80.947 }, 'Kanpur': { lat: 26.460, lng: 80.329 },
  'Agra': { lat: 27.177, lng: 78.008 }, 'Varanasi': { lat: 25.321, lng: 82.987 },
  'Meerut': { lat: 28.985, lng: 77.706 }, 'Allahabad': { lat: 25.435, lng: 81.846 },
  'Bareilly': { lat: 28.367, lng: 79.432 }, 'Gorakhpur': { lat: 26.760, lng: 83.373 },
  'Bhopal': { lat: 23.259, lng: 77.413 }, 'Indore': { lat: 22.719, lng: 75.857 },
  'Jabalpur': { lat: 23.182, lng: 79.987 }, 'Gwalior': { lat: 26.218, lng: 78.182 },
  'Patna': { lat: 25.594, lng: 85.138 }, 'Ranchi': { lat: 23.344, lng: 85.310 },
  'Jamshedpur': { lat: 22.802, lng: 86.185 }, 'Dhanbad': { lat: 23.797, lng: 86.431 },
  'Bhubaneswar': { lat: 20.296, lng: 85.825 }, 'Cuttack': { lat: 20.462, lng: 85.883 },
  'Raipur': { lat: 21.251, lng: 81.630 }, 'Amritsar': { lat: 31.638, lng: 74.873 },
  'Ludhiana': { lat: 30.901, lng: 75.857 }, 'Jalandhar': { lat: 31.326, lng: 75.577 },
  'Chandigarh': { lat: 30.741, lng: 76.779 }, 'Shimla': { lat: 31.104, lng: 77.173 },
  'Dehradun': { lat: 30.316, lng: 78.032 }, 'Haridwar': { lat: 29.945, lng: 78.164 },
  'Thiruvananthapuram': { lat: 8.524, lng: 76.936 }, 'Kochi': { lat: 9.939, lng: 76.270 },
  'Kozhikode': { lat: 11.259, lng: 75.780 }, 'Thrissur': { lat: 10.526, lng: 76.214 },
  'Guwahati': { lat: 26.145, lng: 91.736 }, 'Visakhapatnam': { lat: 17.687, lng: 83.218 },
  'Vijayawada': { lat: 16.506, lng: 80.648 }, 'Srinagar': { lat: 34.083, lng: 74.797 },
  'Jammu': { lat: 32.726, lng: 74.857 }, 'Panaji': { lat: 15.499, lng: 73.823 },
  'Rohini': { lat: 28.748, lng: 77.065 }, 'Dwarka': { lat: 28.576, lng: 77.013 },
};

// ── Haversine distance in km ─────────────────────────────────────────────────
function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Find nearest major city from GPS coords using Haversine ─────────────────
// More reliable than parsing Nominatim strings (avoids returning sub-districts,
// talukas, or obscure locality names instead of the actual city).
function reverseGeocode(lat, lng) {
  const pos = { lat, lng };
  let nearest = null;
  let minDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const d = haversine(pos, coords);
    if (d < minDist) { minDist = d; nearest = city; }
  }
  return nearest; // always returns a known major city name
}

const SORT_OPTIONS = [
  { value: 'medals',      label: 'Most Medals' },
  { value: 'tournaments', label: 'Most Tournaments' },
  { value: 'dupr',        label: 'Highest DUPR' },
  { value: 'recent',      label: 'Recently Active' },
];

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
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

function rarityLabel(totalMedals) {
  if (totalMedals >= 10) return { text: '🏆 Legend', color: '#ec9937', bg: 'rgba(236,153,55,0.15)' };
  if (totalMedals >= 5)  return { text: '⭐ Elite',  color: '#91BE4D', bg: 'rgba(145,190,77,0.12)' };
  return null;
}

// Calendar helpers for friend calendar modal
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Location prompt modal ────────────────────────────────────────────────────
function LocationPromptModal({ onSave, onSkip }) {
  const [mode, setMode] = useState('choose'); // 'choose' | 'detecting' | 'confirm' | 'manual'
  const [detectedCity, setDetectedCity] = useState('');
  const [manualQuery, setManualQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filteredCities = manualQuery.trim().length >= 1
    ? ALL_CITIES.filter((c) => c.toLowerCase().includes(manualQuery.toLowerCase()))
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setMode('manual');
      return;
    }
    setMode('detecting');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          const city = reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (city) {
            setDetectedCity(city);
            setMode('confirm');
          } else {
            setError('Could not detect your city. Please enter it manually.');
            setMode('manual');
          }
        } catch {
          setError('Could not detect your city. Please enter it manually.');
          setMode('manual');
        }
      },
      () => {
        setError('Location access denied. Please enter your city manually.');
        setMode('manual');
      },
      { timeout: 10000 }
    );
  };

  const handleSave = async (city) => {
    if (!city) return;
    setSaving(true);
    await onSave(city);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onSkip} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f4f8e8] flex items-center justify-center text-xl flex-shrink-0">📍</div>
          <div>
            <p className="font-bold text-gray-900">Where are you based?</p>
            <p className="text-xs text-gray-400 mt-0.5">See nearby players and get a personalised community view</p>
          </div>
          <button onClick={onSkip} className="ml-auto text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Choose mode */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <button onClick={handleAutoDetect}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-[#91BE4D]/30 bg-[#f4f8e8] hover:border-[#91BE4D] transition-colors text-left group">
                <div className="w-9 h-9 rounded-lg bg-[#91BE4D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#91BE4D]/30 transition-colors">
                  <svg className="w-5 h-5 text-[#4a6e10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Auto-detect my location</p>
                  <p className="text-xs text-gray-400">Uses your device GPS</p>
                </div>
              </button>

              <button onClick={() => setMode('manual')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 transition-colors text-left group">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Enter city manually</p>
                  <p className="text-xs text-gray-400">Search and select your city</p>
                </div>
              </button>

              <button onClick={onSkip} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors">
                Skip for now
              </button>
            </div>
          )}

          {/* Detecting */}
          {mode === 'detecting' && (
            <div className="py-8 flex flex-col items-center gap-3">
              <svg className="w-8 h-8 text-[#91BE4D] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <p className="text-sm text-gray-500">Detecting your location…</p>
            </div>
          )}

          {/* Confirm detected city */}
          {mode === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-xs text-gray-500">Detected city</p>
                  <p className="text-base font-bold text-gray-900">{detectedCity}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Is this correct?</p>
              <div className="flex gap-2">
                <button onClick={() => setMode('manual')}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Change
                </button>
                <button onClick={() => handleSave(detectedCity)} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                  {saving
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</>
                    : 'Yes, confirm'
                  }
                </button>
              </div>
            </div>
          )}

          {/* Manual entry */}
          {mode === 'manual' && (
            <div className="space-y-4">
              {error && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</p>}
              <div ref={dropdownRef} className="relative">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your city</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={manualQuery}
                  onChange={(e) => { setManualQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search city…"
                  autoComplete="off"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
                />
                {dropdownOpen && filteredCities.length > 0 && (
                  <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
                    {filteredCities.map((c) => (
                      <li key={c} onMouseDown={() => { setManualQuery(c); setDropdownOpen(false); }}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-[#f4f8e8] cursor-pointer">
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={onSkip}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  Skip
                </button>
                <button
                  onClick={() => handleSave(manualQuery.trim())}
                  disabled={!manualQuery.trim() || saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                  {saving
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</>
                    : 'Save & continue'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap"
      style={{ background: type === 'error' ? '#ef4444' : 'linear-gradient(to right, #1c3a07, #2d7005)' }}>
      {type === 'success'
        ? <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      }
      {message}
      <button onClick={onDismiss} className="ml-1 text-white/50 hover:text-white transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ── Consent modal for friend request acceptance ──────────────────────────────
function ConsentModal({ request, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#f4f8e8] flex items-center justify-center text-xl flex-shrink-0">🤝</div>
          <div>
            <p className="font-bold text-gray-900 text-base">Accept friend request?</p>
            <p className="text-sm text-gray-500 mt-0.5">{request.user?.name}</p>
          </div>
        </div>
        <div className="bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-xl p-3.5 mb-5">
          <p className="text-xs text-[#4a6e10] font-medium leading-relaxed">
            Accepting lets you and <strong>{request.user?.name}</strong> see each other's tournament and session schedule.
          </p>
          <p className="text-xs text-[#4a6e10] mt-2 leading-relaxed">
            🔒 <strong>Private info stays private</strong> — expenses, entry fees, and winnings are never shared.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
            {loading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Accepting…</>
              : 'Accept & Connect'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Friend calendar modal ────────────────────────────────────────────────────
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function FriendCalendarModal({ friend, onClose }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    api.getFriendSchedule(friend.id)
      .then((res) => setEvents(res.data.data || []))
      .catch(() => setError('Could not load schedule'))
      .finally(() => setLoading(false));
  }, [friend.id]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => { const d = e.date?.split('T')[0]; if (d) { if (!map[d]) map[d] = []; map[d].push(e); } });
    return map;
  }, [events]);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEvents = events.filter((e) => e.date?.startsWith(monthStr));
  const initials = (friend.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-0.5"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="relative px-5 pt-5 pb-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #2a1a00 100%)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
              {friend.profilePhoto ? <img src={friend.profilePhoto} alt={friend.name} className="w-full h-full object-cover" /> : <span className="text-sm font-black text-[#91BE4D]">{initials}</span>}
            </div>
          </div>
          <div>
            <p className="text-[#91BE4D] text-[10px] font-bold uppercase tracking-widest">Friend's Schedule</p>
            <p className="text-white font-bold text-base leading-tight">{friend.name}</p>
            {(friend.city) && <p className="text-white/50 text-xs mt-0.5">📍 {friend.city}</p>}
          </div>
        </div>
        <div className="p-4">
          {loading ? <div className="py-16 text-center text-gray-400 text-sm">Loading schedule…</div>
          : error ? <div className="py-10 text-center text-red-500 text-sm">{error}</div>
          : (<>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
              <p className="text-sm font-bold text-gray-900">{monthName}</p>
              <button onClick={() => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
            </div>
            <div className="grid grid-cols-7 mb-1">{WEEKDAYS_SHORT.map((d, i) => <div key={i} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 border border-gray-100 rounded-xl overflow-hidden">
              {monthGrid.map((day, idx) => {
                if (!day) return <div key={`blank-${idx}`} className="min-h-[52px] bg-gray-50/50 border-b border-r border-gray-100" />;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const dayEvents = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={`min-h-[52px] border-b border-r border-gray-100 p-0.5 ${dayEvents.length > 0 ? 'bg-[#f4f8e8]/60' : ''}`}>
                    <div className="flex justify-center mb-0.5">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? 'bg-[#91BE4D] text-white' : 'text-gray-600'}`}>{day}</span>
                    </div>
                    {dayEvents.slice(0, 2).map((e, i) => (
                      <div key={i} className={`text-[8px] rounded px-0.5 py-0.5 truncate font-semibold leading-tight ${e.kind === 'tournament' ? 'bg-[#91BE4D]/20 text-[#3a5e08]' : 'bg-blue-100 text-blue-700'}`}>
                        {e.kind === 'tournament' ? '🏆' : '🎾'} {e.title || e.categoryName || 'Event'}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <p className="text-[7px] text-gray-400 text-center">+{dayEvents.length - 2}</p>}
                  </div>
                );
              })}
            </div>
            {monthEvents.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">This month</p>
                <div className="space-y-1.5">
                  {monthEvents.sort((a, b) => a.date < b.date ? -1 : 1).map((e, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.kind === 'tournament' ? 'bg-[#91BE4D]' : 'bg-blue-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{e.title || e.categoryName || (e.kind === 'tournament' ? 'Tournament' : 'Session')}</p>
                        {e.categoryName && e.kind === 'tournament' && <p className="text-[10px] text-gray-400">{e.categoryName}</p>}
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-xs text-gray-400 text-center mt-4">No events this month</p>}
            <p className="text-[10px] text-gray-300 text-center mt-4">Only schedule info is shared. Expenses and financials stay private.</p>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ── Mini card in the city grid ───────────────────────────────────────────────
function PlayerMiniCard({ player, onClick, friendState, onAddFriend, currentUserId }) {
  const { name, city, profilePhoto, duprSingles, duprDoubles, medals, totalMedals, topCategories } = player;
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const rarity = rarityLabel(totalMedals || 0);
  const isOwnCard = currentUserId && String(player.id) === String(currentUserId);

  const handleFriendClick = (e) => {
    e.stopPropagation();
    if (friendState === 'none') onAddFriend(player.id);
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 bg-white flex flex-col">

      {/* Clickable upper area */}
      <div onClick={onClick} className="cursor-pointer flex-1">
        {/* Green top — fixed height */}
        <div className="relative px-3 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)', minHeight: 164 }}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #91BE4D 0%, transparent 70%)' }} />
          <div className="w-14 h-14 rounded-full flex-shrink-0 mb-2.5"
            style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
              {profilePhoto
                ? <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
                : <span className="text-base font-black text-[#91BE4D]">{initials}</span>
              }
            </div>
          </div>
          <p className="text-white font-bold text-sm text-center leading-tight mb-0.5 line-clamp-1 w-full px-1">{name}</p>
          {(duprSingles || duprDoubles) && (
            <p className="text-[#ec9937] text-[10px] font-bold mt-1">
              {duprSingles ? `S ${duprSingles}` : ''}{duprSingles && duprDoubles ? ' · ' : ''}{duprDoubles ? `D ${duprDoubles}` : ''}
            </p>
          )}
          {rarity && (
            <span className="mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}40` }}>
              {rarity.text}
            </span>
          )}
        </div>

        {/* White medals section */}
        <div className="px-3 pt-2.5 pb-1">
          <div className="flex justify-around">
            {['Gold', 'Silver', 'Bronze'].map((m) => (
              <div key={m} className="flex flex-col items-center">
                <span className="text-sm">{MEDAL_EMOJI[m]}</span>
                <span className="text-sm font-black text-gray-800 leading-tight">{medals?.[m] ?? 0}</span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">{m}</span>
              </div>
            ))}
          </div>
          {topCategories?.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-2 mb-0.5">
              {topCategories.slice(0, 1).map((c) => (
                <span key={c.name} className="text-[9px] font-semibold bg-[#f4f8e8] text-[#4a6e10] px-1.5 py-0.5 rounded-full border border-[#91BE4D]/20 truncate max-w-[90px]">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Friend row — outside the clickable area, always visible */}
      {!isOwnCard && currentUserId && (
        <div className="px-3 pb-3 pt-1 bg-white border-t border-gray-50">
          {friendState === 'friend' ? (
            <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#f4f8e8]">
              <svg className="w-3 h-3 text-[#4a6e10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-[10px] font-bold text-[#4a6e10]">Friends</span>
            </div>
          ) : friendState === 'pending' ? (
            <div className="flex items-center justify-center py-1.5 rounded-lg bg-orange-50">
              <span className="text-[10px] font-bold text-orange-600">Requested</span>
            </div>
          ) : (
            <button onClick={handleFriendClick}
              className="w-full py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add Friend
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Player detail modal ──────────────────────────────────────────────────────
function PlayerModal({ playerId, onClose, friendState, currentUserId, onSendFriendRequest }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getPlayer(playerId)
      .then((res) => setPlayer(res.data.data))
      .catch(() => setError('Could not load player profile.'))
      .finally(() => setLoading(false));
  }, [playerId]);

  const rarity = player ? rarityLabel(player.totalMedals || 0) : null;

  const handleFriendClick = async () => {
    if (friendState !== 'none' || sending) return;
    setSending(true);
    await onSendFriendRequest(player.id);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        {loading ? <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        : error ? <div className="py-16 text-center text-red-500 text-sm">{error}</div>
        : player ? (
          <>
            {/* Dark header */}
            <div className="relative px-6 pt-6 pb-5 flex flex-col items-center"
              style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)' }}>
              <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="w-24 h-24 rounded-full mb-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 3 }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
                  {player.profilePhoto
                    ? <img src={player.profilePhoto} alt={player.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black text-[#91BE4D]">{(player.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                  }
                </div>
              </div>
              <p className="text-white text-xl font-black text-center">{player.name}</p>
              <p className="text-[#91BE4D] text-xs font-semibold mt-1">📍 {[player.city, player.state].filter(Boolean).join(', ') || 'India'}</p>
              {(player.duprSingles || player.duprDoubles) && (
                <p className="text-[#ec9937] text-sm font-black mt-2">
                  {player.duprSingles ? `Singles ${player.duprSingles}` : ''}{player.duprSingles && player.duprDoubles ? ' · ' : ''}{player.duprDoubles ? `Doubles ${player.duprDoubles}` : ''}
                </p>
              )}
              {player.playingSince && <p className="text-white/50 text-xs mt-1">Playing since <span className="text-white/80 font-semibold">{player.playingSince}</span></p>}
              {rarity && (
                <span className="mt-3 text-[10px] font-bold px-3 py-1 rounded-full"
                  style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}40` }}>
                  {rarity.text}
                </span>
              )}
            </div>

            {/* White content */}
            <div className="px-6 py-5 space-y-5">

              {/* Add Friend — visible in white area */}
              {currentUserId && String(player.id) !== String(currentUserId) && (
                friendState === 'friend' ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#f4f8e8] border border-[#91BE4D]/30">
                    <svg className="w-4 h-4 text-[#4a6e10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-bold text-[#4a6e10]">Friends</span>
                  </div>
                ) : (
                  <button type="button" onClick={handleFriendClick}
                    disabled={friendState === 'pending' || sending}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      friendState === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-200 cursor-default'
                      : 'text-white hover:opacity-90 disabled:opacity-60'
                    }`}
                    style={friendState !== 'pending' ? { background: 'linear-gradient(to right, #2d7005, #91BE4D 60%, #ec9937)' } : {}}>
                    {sending
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Sending…</>
                      : friendState === 'pending' ? '⏳ Friend request sent'
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>Add Friend</>
                    }
                  </button>
                )
              )}

              {/* Stats */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Stats</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg">🏅</p>
                    <p className="text-base font-black text-gray-800 leading-tight">{player.totalTournaments}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Events</p>
                  </div>
                  {['Gold', 'Silver', 'Bronze'].map((m) => (
                    <div key={m} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg">{MEDAL_EMOJI[m]}</p>
                      <p className="text-base font-black text-gray-800 leading-tight">{player.medals?.[m] ?? 0}</p>
                      <p className="text-[10px] text-gray-400">{m}</p>
                    </div>
                  ))}
                </div>
              </div>

              {player.topCategories?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Plays</p>
                  <div className="flex flex-wrap gap-1.5">
                    {player.topCategories.map((c) => (
                      <span key={c.name} className="text-xs font-semibold bg-[#f4f8e8] text-[#4a6e10] px-3 py-1 rounded-full border border-[#91BE4D]/20">
                        {c.name} <span className="text-[#91BE4D]">×{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {player.recentMedalTournaments?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Highlights</p>
                  <div className="space-y-2">
                    {player.recentMedalTournaments.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <span className="text-lg flex-shrink-0">{MEDAL_EMOJI[t.medal]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.tournamentName}</p>
                          <p className="text-xs text-gray-400">{t.category}{t.date ? ` · ${t.date}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-300 text-center">
                Member since {new Date(player.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Edit community profile modal ─────────────────────────────────────────────
function EditMyCommunityProfileModal({ onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ duprSingles: '', duprDoubles: '', playingSince: '', profilePhoto: null, manualAchievements: [] });

  useEffect(() => {
    Promise.all([api.getProfile(), api.getTournaments()])
      .then(([profileRes]) => {
        const p = profileRes.data.data || {};
        setForm({ duprSingles: p.duprSingles ?? p.duprRating ?? '', duprDoubles: p.duprDoubles ?? '', playingSince: p.playingSince ?? '', profilePhoto: p.profilePhoto ?? null, manualAchievements: Array.isArray(p.manualAchievements) ? p.manualAchievements : [] });
      })
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  const addAchievement = () => setForm((f) => ({ ...f, manualAchievements: [...(f.manualAchievements || []), { tournamentName: '', categoryName: '', medal: 'Gold', date: '' }] }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.updateProfile({ duprSingles: form.duprSingles || null, duprDoubles: form.duprDoubles || null, duprRating: form.duprSingles || null, playingSince: form.playingSince || null, profilePhoto: form.profilePhoto || null, manualAchievements: form.manualAchievements || [] });
      onSaved?.(); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Could not update profile'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Update your player card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        {loading ? <div className="p-6 text-sm text-gray-400">Loading…</div> : (
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Singles</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" value={form.duprSingles} onChange={(e) => setForm((f) => ({ ...f, duprSingles: e.target.value }))} /></div>
              <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Doubles</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" value={form.duprDoubles} onChange={(e) => setForm((f) => ({ ...f, duprDoubles: e.target.value }))} /></div>
            </div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Playing since</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" value={form.playingSince} onChange={(e) => setForm((f) => ({ ...f, playingSince: e.target.value }))}><option value="">Select year…</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profile photo</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">{form.profilePhoto ? <img src={form.profilePhoto} alt="profile" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">None</span>}</div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[#4a6e10]">Upload / Change</button>
                {form.profilePhoto && <button type="button" onClick={() => setForm((f) => ({ ...f, profilePhoto: null }))} className="text-xs text-gray-500 hover:text-red-500">Remove</button>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const dataUrl = await resizeImage(file); setForm((f) => ({ ...f, profilePhoto: dataUrl })); }} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past achievements</label><button type="button" onClick={addAchievement} className="text-xs font-semibold text-[#4a6e10]">+ Add</button></div>
              <div className="space-y-2">
                {(form.manualAchievements || []).map((row, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" placeholder="Tournament name" value={row.tournamentName || ''} onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], tournamentName: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, manualAchievements: (f.manualAchievements || []).filter((_, i) => i !== idx) }))} className="text-gray-400 hover:text-red-500 flex-shrink-0"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" placeholder="Category" value={row.categoryName || ''} onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], categoryName: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                      <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" value={row.medal || 'Gold'} onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], medal: e.target.value }; return { ...f, manualAchievements: copy }; })}><option>Gold</option><option>Silver</option><option>Bronze</option></select>
                      <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" value={row.date || ''} onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], date: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                    </div>
                  </div>
                ))}
                {(form.manualAchievements || []).length === 0 && <button type="button" onClick={addAchievement} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs text-gray-400 hover:border-[#91BE4D]/40 hover:text-[#4a6e10] transition-colors">+ Add a past tournament</button>}
              </div>
            </div>
            {error ? <p className="text-xs text-red-500">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold hover:opacity-90" style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>{saving ? 'Saving…' : 'Save profile'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Friends section ──────────────────────────────────────────────────────────
function FriendsSection({ friends, onViewCalendar }) {
  if (friends.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Friends</p>
          <p className="text-[10px] text-gray-400 mt-0.5">View their schedule calendar</p>
        </div>
        <span className="text-[10px] font-bold text-[#4a6e10] bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-full px-2 py-0.5">
          {friends.length} friend{friends.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {friends.map((f) => {
          const initials = (f.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative px-4 py-4 flex flex-col items-center" style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)' }}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-full" style={{ background: 'radial-gradient(circle, #91BE4D 0%, transparent 70%)' }} />
                <div className="w-12 h-12 rounded-full flex-shrink-0 mb-2" style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
                    {f.profilePhoto ? <img src={f.profilePhoto} alt={f.name} className="w-full h-full object-cover" /> : <span className="text-sm font-black text-[#91BE4D]">{initials}</span>}
                  </div>
                </div>
                <p className="text-white font-bold text-sm text-center leading-tight line-clamp-1 w-full">{f.name}</p>
                {f.city && <p className="text-[#91BE4D] text-[10px] mt-0.5">📍 {f.city}</p>}
                <span className="mt-1.5 text-[9px] font-bold bg-[#91BE4D]/20 text-[#91BE4D] border border-[#91BE4D]/30 px-2 py-0.5 rounded-full">✓ Friends</span>
              </div>
              <div className="px-3 py-3">
                <button onClick={() => onViewCalendar(f)} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-opacity hover:opacity-90 text-white" style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  View Calendar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Players page ────────────────────────────────────────────────────────
export default function Players() {
  const { user, refreshUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [consentRequest, setConsentRequest] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [friendCalendarTarget, setFriendCalendarTarget] = useState(null);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  // Show location prompt if user has no city and hasn't dismissed it
  useEffect(() => {
    if (!user?.city && !sessionStorage.getItem('pt_cityPrompted')) {
      setLocationPromptOpen(true);
    }
  }, [user?.city]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Fetch enough players for city-grouped view (no pagination)
      const res = await api.getPlayers({ page: 1, limit: 500, sort: 'medals' });
      setPlayers(res.data.data || []);
    } catch {
      setError('Could not load players. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFriendData = useCallback(async () => {
    try {
      const [reqRes, friendsRes] = await Promise.all([api.getFriendRequests(), api.getFriends()]);
      setFriendRequests(reqRes.data.data || { incoming: [], outgoing: [] });
      setFriends(friendsRes.data.data || []);
    } catch { /* keep page usable */ }
  }, []);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);
  useEffect(() => { fetchFriendData(); }, [fetchFriendData]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const friendStatusByUserId = useMemo(() => {
    const map = {};
    friends.forEach((f) => { map[String(f.id)] = 'friend'; });
    (friendRequests.incoming || []).forEach((r) => { map[String(r.user.id)] = 'incoming'; });
    (friendRequests.outgoing || []).forEach((r) => { map[String(r.user.id)] = 'pending'; });
    return map;
  }, [friendRequests, friends]);

  // ── City grouping & distance sorting ──
  const filteredPlayers = useMemo(() => {
    if (!debouncedSearch.trim()) return players;
    const q = debouncedSearch.toLowerCase();
    return players.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [players, debouncedSearch]);

  const { playersByCity, sortedCities } = useMemo(() => {
    // Group by city
    const byCity = {};
    filteredPlayers.forEach((p) => {
      const city = p.city?.trim() || 'Other';
      if (!byCity[city]) byCity[city] = [];
      byCity[city].push(p);
    });

    const cities = Object.keys(byCity);
    const userCity = user?.city?.trim();

    let ordered;
    if (userCity && byCity[userCity]) {
      // User's city first, then sort others by distance
      const userCoords = CITY_COORDS[userCity];
      const others = cities.filter((c) => c !== userCity && c !== 'Other');
      const sorted = others.sort((a, b) => {
        const ca = CITY_COORDS[a], cb = CITY_COORDS[b];
        if (userCoords) {
          if (ca && cb) return haversine(userCoords, ca) - haversine(userCoords, cb);
          if (ca) return -1;
          if (cb) return 1;
        }
        return a.localeCompare(b);
      });
      ordered = [userCity, ...sorted];
      if (byCity['Other']) ordered.push('Other');
    } else {
      // No user city — sort alphabetically, Other last
      ordered = cities.filter((c) => c !== 'Other').sort((a, b) => a.localeCompare(b));
      if (byCity['Other']) ordered.push('Other');
    }

    return { playersByCity: byCity, sortedCities: ordered };
  }, [filteredPlayers, user?.city]);

  const totalPlayers = players.length;

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSendFriendRequest = async (playerId) => {
    try {
      await api.sendFriendRequest(playerId);
      showToast('Friend request sent!');
      await fetchFriendData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send request', 'error');
    }
  };

  const handleAcceptRequest = (request) => setConsentRequest(request);

  const handleConfirmAccept = async () => {
    if (!consentRequest) return;
    setAcceptingId(consentRequest.id);
    try {
      await api.acceptFriendRequest(consentRequest.id);
      setConsentRequest(null);
      showToast(`You and ${consentRequest.user?.name} are now friends!`);
      await fetchFriendData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not accept request', 'error');
    } finally { setAcceptingId(null); }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request declined.');
      await fetchFriendData();
    } catch { showToast('Could not decline request', 'error'); }
  };

  const handleLocationSave = async (city) => {
    try {
      const res = await api.updateProfile({ city });
      refreshUser(res.data.data);
      sessionStorage.setItem('pt_cityPrompted', '1');
      setLocationPromptOpen(false);
      showToast(`Location set to ${city}! Showing nearby players.`);
    } catch {
      showToast('Could not save location', 'error');
    }
  };

  const handleLocationSkip = () => {
    sessionStorage.setItem('pt_cityPrompted', '1');
    setLocationPromptOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-4">
          <div>
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Community</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">Players</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {totalPlayers > 0 ? `${totalPlayers} player${totalPlayers !== 1 ? 's' : ''} across ${sortedCities.length} cit${sortedCities.length !== 1 ? 'ies' : 'y'}` : 'Discover the pickleball community'}
            </p>
            {user?.city && (
              <button onClick={() => setLocationPromptOpen(true)} className="text-[#91BE4D]/70 hover:text-[#91BE4D] text-[10px] font-semibold mt-1 transition-colors">
                📍 {user.city} · Change
              </button>
            )}
          </div>
          <div className="ml-auto text-4xl select-none">🎾</div>
        </div>
      </div>

      {/* Update profile CTA */}
      <div className="mb-5">
        <button type="button" onClick={() => setShowEditProfile(true)}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Update my card
        </button>
      </div>

      {/* Incoming friend requests */}
      {(friendRequests.incoming || []).length > 0 && (
        <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Friend Requests <span className="text-[#4a6e10] ml-1">{friendRequests.incoming.length}</span>
          </p>
          <div className="space-y-2">
            {friendRequests.incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#f4f8e8] border border-[#91BE4D]/20">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.user?.name || 'Player'}</p>
                  <p className="text-xs text-gray-500">{r.user?.city || 'India'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAcceptRequest(r)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4a6e10] text-white hover:bg-[#2d7005] transition-colors">Accept</button>
                  <button type="button" onClick={() => handleRejectRequest(r.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends section */}
      <FriendsSection friends={friends} onViewCalendar={setFriendCalendarTarget} />

      {/* Search */}
      <div className="mb-6 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" /></svg>
        <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search players by name…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]" />
      </div>

      {/* City-grouped player grid */}
      {loading && players.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading players…</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button onClick={fetchPlayers} className="text-sm font-semibold text-[#4a6e10] hover:underline">Retry</button>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🎾</p>
          <p className="text-gray-500 font-semibold">No players found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search</p>
        </div>
      ) : (
        <div className={`space-y-8 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {sortedCities.map((city) => {
            const cityPlayers = playersByCity[city] || [];
            if (cityPlayers.length === 0) return null;
            const isUserCity = city === user?.city?.trim();
            return (
              <section key={city}>
                {/* City heading */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📍</span>
                    <h2 className="text-base font-extrabold text-gray-900">{city}</h2>
                    {isUserCity && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white ml-1"
                        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                        Your city
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                    {cityPlayers.length} player{cityPlayers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Players grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {cityPlayers.map((p) => (
                    <PlayerMiniCard
                      key={p.id}
                      player={p}
                      onClick={() => setSelectedId(p.id)}
                      friendState={friendStatusByUserId[String(p.id)] || 'none'}
                      onAddFriend={handleSendFriendRequest}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedId && (
        <PlayerModal
          playerId={selectedId}
          onClose={() => setSelectedId(null)}
          onSendFriendRequest={handleSendFriendRequest}
          friendState={friendStatusByUserId[String(selectedId)] || 'none'}
          currentUserId={user?.id}
        />
      )}
      {showEditProfile && (
        <EditMyCommunityProfileModal
          onClose={() => setShowEditProfile(false)}
          onSaved={() => { fetchPlayers(); showToast('Your community profile has been updated!'); }}
        />
      )}
      {consentRequest && (
        <ConsentModal
          request={consentRequest}
          onConfirm={handleConfirmAccept}
          onCancel={() => setConsentRequest(null)}
          loading={acceptingId === consentRequest.id}
        />
      )}
      {friendCalendarTarget && (
        <FriendCalendarModal friend={friendCalendarTarget} onClose={() => setFriendCalendarTarget(null)} />
      )}
      {locationPromptOpen && (
        <LocationPromptModal onSave={handleLocationSave} onSkip={handleLocationSkip} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
