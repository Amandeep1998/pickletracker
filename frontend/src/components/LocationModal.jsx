import React, { useEffect, useRef, useState } from 'react';
import CITIES_BY_STATE from '../data/indianCities';

const ALL_CITIES = [...new Set(Object.values(CITIES_BY_STATE).flat())].sort();

// Coordinates for major Indian cities — used to snap GPS to nearest known city
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

function haversine(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Returns nearest known major city name from GPS coordinates
function findNearestCity(lat, lng) {
  const pos = { lat, lng };
  let nearest = null;
  let minDist = Infinity;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const d = haversine(pos, coords);
    if (d < minDist) { minDist = d; nearest = city; }
  }
  return nearest;
}

/**
 * Location modal — auto-detect GPS or manual city search.
 * Props:
 *   onSave(city: string) — called when user confirms a city
 *   onSkip()             — called when user dismisses without saving
 */
export default function LocationModal({ onSave, onSkip }) {
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
          const city = findNearestCity(pos.coords.latitude, pos.coords.longitude);
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

        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f4f8e8] flex items-center justify-center text-xl flex-shrink-0">📍</div>
          <div>
            <p className="font-bold text-gray-900">Where are you based?</p>
            <p className="text-xs text-gray-400 mt-0.5">See nearby players and get a personalised Nearby Players view</p>
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
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
                  <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
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
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
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
