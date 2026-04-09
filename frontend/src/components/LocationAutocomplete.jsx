import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { useDebounce } from '../hooks/useDebounce';

const LIBRARIES = ['places'];

export default function LocationAutocomplete({ value, onSelect, onClear }) {
  const [inputValue, setInputValue] = useState(value?.name || '');
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const placesDiv = useRef(null);
  const containerRef = useRef(null);
  // Only true after the user has actually typed — prevents predictions firing on pre-fill
  const isUserTyping = useRef(false);

  const debouncedQuery = useDebounce(inputValue, 300);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // Initialize services once Maps is loaded
  useEffect(() => {
    if (!isLoaded) return;
    autocompleteService.current = new window.google.maps.places.AutocompleteService();
    placesDiv.current = document.createElement('div');
    placesService.current = new window.google.maps.places.PlacesService(placesDiv.current);
  }, [isLoaded]);

  // Sync display value when parent resets/pre-fills (modal open, clear, etc.)
  // Reset isUserTyping so pre-fill never triggers the autocomplete API
  useEffect(() => {
    isUserTyping.current = false;
    setInputValue(value?.name || '');
    setPredictions([]);
    setShowDropdown(false);
  }, [value]);

  // Fire API call only when the user has typed (not on pre-fill or mount)
  useEffect(() => {
    if (!isLoaded || !autocompleteService.current) return;
    if (!isUserTyping.current || !debouncedQuery || debouncedQuery.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: debouncedQuery,
        componentRestrictions: { country: 'in' },
        types: ['establishment'],
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
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
    isUserTyping.current = false;
    setShowDropdown(false);
    setPredictions([]);
    setInputValue(prediction.description);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'formatted_address', 'geometry', 'place_id'],
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return;
        const selected = {
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry?.location?.lat() ?? null,
          lng: place.geometry?.location?.lng() ?? null,
          placeId: place.place_id || null,
        };
        setInputValue(selected.name);
        onSelect(selected);
      }
    );
  }, [onSelect]);

  const handleClear = () => {
    isUserTyping.current = false;
    setInputValue('');
    setPredictions([]);
    setShowDropdown(false);
    onClear?.();
  };

  if (loadError) {
    return (
      <div className="text-xs text-red-500 py-1">
        Failed to load location search. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <input
        disabled
        placeholder="Loading location search..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-400 bg-gray-50"
      />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          isUserTyping.current = true;
          setInputValue(e.target.value);
          if (!e.target.value) onClear?.();
        }}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder="Search pickleball court..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        autoComplete="off"
      />

      {/* Clear button */}
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
          aria-label="Clear location"
        >
          ✕
        </button>
      )}

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              className="px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-green-50 cursor-pointer"
            >
              <span className="font-medium">{p.structured_formatting.main_text}</span>
              <span className="text-gray-400 ml-1">{p.structured_formatting.secondary_text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
