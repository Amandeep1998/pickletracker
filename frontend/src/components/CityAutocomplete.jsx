import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { useDebounce } from '../hooks/useDebounce';

const LIBRARIES = ['places'];

/**
 * City-only autocomplete restricted to India.
 * onChange(cityName: string) — called on every keystroke and on selection.
 * value — used for initial value and external resets only.
 */
export default function CityAutocomplete({ value, onChange, placeholder = 'Search city…', className = '' }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteService = useRef(null);
  const containerRef = useRef(null);

  // Track the last value the user typed so we can distinguish parent feedback
  // from a genuine external reset (e.g. parent clears the field).
  const lastUserInput = useRef(value || '');

  const debouncedQuery = useDebounce(inputValue, 300);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (!isLoaded) return;
    autocompleteService.current = new window.google.maps.places.AutocompleteService();
  }, [isLoaded]);

  // Sync from parent only when it's a genuine external change
  // (not just the parent echoing back what the user typed).
  useEffect(() => {
    const incoming = value || '';
    if (incoming === lastUserInput.current) return; // parent feedback — ignore
    lastUserInput.current = incoming;
    setInputValue(incoming);
    setPredictions([]);
    setShowDropdown(false);
  }, [value]);

  // Fire Places API whenever the debounced query changes
  useEffect(() => {
    if (!isLoaded || !autocompleteService.current) return;
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: q,
        componentRestrictions: { country: 'in' },
        types: ['(cities)'],
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setPredictions(results);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  }, [debouncedQuery, isLoaded]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((prediction) => {
    const cityName = prediction.structured_formatting.main_text;
    lastUserInput.current = cityName;
    setInputValue(cityName);
    setPredictions([]);
    setShowDropdown(false);
    onChange(cityName);
  }, [onChange]);

  const handleChange = (e) => {
    const val = e.target.value;
    lastUserInput.current = val;
    setInputValue(val);
    onChange(val);
  };

  if (loadError) {
    // Graceful fallback — let user type freely
    return (
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] ${className}`}
      />
    );
  }

  if (!isLoaded) {
    return (
      <input
        disabled
        placeholder="Loading…"
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 ${className}`}
      />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] ${className}`}
        autoComplete="off"
      />

      {showDropdown && predictions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-[#f4f8e8] cursor-pointer"
            >
              <span className="font-medium">{p.structured_formatting.main_text}</span>
              <span className="text-gray-400 text-xs ml-1">{p.structured_formatting.secondary_text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
