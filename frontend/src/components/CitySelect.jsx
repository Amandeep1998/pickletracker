import React, { useState, useRef, useEffect } from 'react';
import CITIES_BY_STATE from '../data/indianCities';

/**
 * Searchable city dropdown for a given Indian state.
 * No external API — purely static data.
 *
 * Props:
 *   state      — selected state name (filters the city list)
 *   value      — current city value
 *   onChange   — called with city name string on selection
 *   disabled   — true when no state is selected yet
 */
export default function CitySelect({ state, value, onChange, disabled }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when state changes
  useEffect(() => {
    setQuery('');
    onChange('');
    setOpen(false);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync if parent clears the value externally
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const cities = state ? (CITIES_BY_STATE[state] || []) : [];
  const filtered = query.trim().length === 0
    ? cities
    : cities.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()));

  const handleSelect = (city) => {
    setQuery(city);
    onChange(city);
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    onChange(''); // clear selection while typing
    setOpen(true);
  };

  const handleFocus = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={disabled ? 'Select a state first' : 'Search city…'}
          autoComplete="off"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] pr-8
            ${disabled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'border-gray-300 bg-white'}
          `}
        />
        {/* Chevron */}
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {open && !disabled && cities.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-gray-400 text-center">No cities found</li>
          ) : (
            filtered.map((city) => (
              <li
                key={city}
                onMouseDown={() => handleSelect(city)}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors
                  ${city === value ? 'bg-[#f4f8e8] text-[#4a6e10] font-semibold' : 'text-gray-700 hover:bg-[#f4f8e8]'}
                `}
              >
                {city}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
