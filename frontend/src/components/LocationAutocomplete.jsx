import React, { useRef, useEffect, useState } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const LIBRARIES = ['places'];

export default function LocationAutocomplete({ value, onSelect, onClear }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(value?.name || '');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  // Sync display value when parent clears selection
  useEffect(() => {
    setInputValue(value?.name || '');
  }, [value]);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry) return;

    const selected = {
      name: place.name || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setInputValue(selected.name);
    onSelect(selected);
  };

  const handleClear = () => {
    setInputValue('');
    if (inputRef.current) inputRef.current.value = '';
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
    <div className="relative">
      <Autocomplete
        onLoad={(ref) => (autocompleteRef.current = ref)}
        onPlaceChanged={handlePlaceChanged}
        options={{
          componentRestrictions: { country: 'in' },
          types: ['establishment'],
          fields: ['name', 'formatted_address', 'geometry'],
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            // If user clears the field manually, notify parent
            if (!e.target.value) onClear?.();
          }}
          placeholder="Search pickleball court..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </Autocomplete>

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
    </div>
  );
}
