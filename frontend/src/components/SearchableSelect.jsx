import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select category' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const normalize = (s) => s.toLowerCase().replace(/['\u2018\u2019]/g, '');
  const filteredOptions = options.filter((opt) =>
    normalize(opt).includes(normalize(query))
  );

  const computeStyle = () => {
    if (!containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(240, filteredOptions.length * 44 + 8);
    const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    };
  };

  const openDropdown = () => {
    setQuery('');
    setHighlightedIndex(0);
    setDropdownStyle(computeStyle());
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
  };

  // Use pointerdown so it fires on both touch and mouse
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(240, filteredOptions.length * 44 + 8);
      const openUpward = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight;
      setDropdownStyle((prev) => ({
        ...prev,
        left: rect.left,
        width: rect.width,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4, top: undefined }
          : { top: rect.bottom + 4, bottom: undefined }),
      }));
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen, filteredOptions.length]);

  const handleSelect = (option) => {
    onChange(option);
    closeDropdown();
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(filteredOptions.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + Math.max(filteredOptions.length, 1)) % Math.max(filteredOptions.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0) handleSelect(filteredOptions[highlightedIndex]);
        break;
      case 'Escape':
        closeDropdown();
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Trigger field shown when closed — tapping opens the dropdown without showing keyboard
  const handleTriggerPointerDown = (e) => {
    if (isOpen) return; // let outside-click handler take care of closing
    e.preventDefault();
    openDropdown();
    // Focus the hidden search input after a tick so keyboard appears
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Visible trigger — always shows the selected value */}
      <div
        onPointerDown={handleTriggerPointerDown}
        className={`w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm cursor-pointer select-none flex items-center justify-between ${
          isOpen
            ? 'border-green-500 ring-2 ring-green-500'
            : 'border-gray-300'
        } ${value ? 'text-gray-900' : 'text-gray-400'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg
          className={`w-4 h-4 flex-shrink-0 ml-1 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden"
        >
          {/* Search input inside the dropdown */}
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleSelect(option); }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-3 text-xs sm:text-sm transition-colors ${
                    index === highlightedIndex
                      ? 'bg-green-100 text-green-900'
                      : 'text-gray-700 active:bg-gray-100'
                  } ${value === option ? 'font-medium' : ''}`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs sm:text-sm text-gray-500">No categories found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
